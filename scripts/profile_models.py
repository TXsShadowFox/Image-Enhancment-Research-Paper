"""Params / GFLOPs / latency table for a set of option files.

GFLOPs follow the protocol of basicsr/complexity.py (thop MACs on a 3x256x256
input, as in the Multinex paper's tables); latency is the median over `--runs`
forward passes at `--latency_res`, on CUDA when available.

    python scripts/profile_models.py --opts Options/Multinex-Nano_LOL-v1.yaml Options/MultinexGA-Nano_LOL-v1.yaml
"""
import argparse
import copy
import os
import statistics
import sys
import time

import torch
import yaml

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from basicsr.models.archs import define_network  # noqa: E402


def build(opt_path):
    with open(opt_path, encoding='utf-8') as f:
        net_opt = yaml.safe_load(f)['network_g']
    return define_network(copy.deepcopy(net_opt)).eval()


def gflops(net, h, w):
    from thop import profile
    net = copy.deepcopy(net).cpu()
    macs, _ = profile(net, inputs=(torch.zeros(1, 3, h, w),), verbose=False)
    return macs / 1e9


@torch.inference_mode()
def latency_ms(net, h, w, device, warmup, runs):
    net = net.to(device)
    x = torch.rand(1, 3, h, w, device=device)
    for _ in range(warmup):
        net(x)
    times = []
    for _ in range(runs):
        if device == 'cuda':
            torch.cuda.synchronize()
        t0 = time.perf_counter()
        net(x)
        if device == 'cuda':
            torch.cuda.synchronize()
        times.append((time.perf_counter() - t0) * 1e3)
    return statistics.median(times)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--opts', nargs='+', required=True)
    p.add_argument('--flops_res', type=int, nargs=2, default=(256, 256))
    p.add_argument('--latency_res', type=int, nargs=2, default=(400, 600))
    p.add_argument('--warmup', type=int, default=20)
    p.add_argument('--runs', type=int, default=200)
    args = p.parse_args()

    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    lh, lw = args.latency_res
    print(f'| Model | Params | GFLOPs@{args.flops_res[0]}x{args.flops_res[1]} | '
          f'Latency@{lh}x{lw} ({device}, ms) |')
    print('|---|---:|---:|---:|')
    for opt_path in args.opts:
        net = build(opt_path)
        n = sum(p.numel() for p in net.parameters() if p.requires_grad)
        g = gflops(net, *args.flops_res)
        ms = latency_ms(net, lh, lw, device, args.warmup, args.runs)
        name = os.path.splitext(os.path.basename(opt_path))[0]
        print(f'| {name} | {n:,} | {g:.4f} | {ms:.3f} |')


if __name__ == '__main__':
    main()
