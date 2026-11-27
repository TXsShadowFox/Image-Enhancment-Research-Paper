"""Figures that need the cluster's outputs: qualitative grids, ARMG guidance, training curves.

Run on the cluster from ~/Multinex after jobs/eval_ga.pbs has finished:
    python deliverables/make_cluster_figures.py
then copy deliverables/figures/fig_qualitative_*.png, fig_guidance.png and
fig_training_curves.png into the paper's figures/ folder.
"""
import csv
import glob
import os

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
from PIL import Image

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'figures')
os.makedirs(OUT, exist_ok=True)
BLUE, ORANGE, AQUA = '#2a78d6', '#eb6834', '#1baf7a'

LOL_DIRS = {  # dataset -> (low dir, gt dir)
    'LOL-v1': ('data/LOLv1/Test/input', 'data/LOLv1/Test/target'),
    'LOL-v2-real': ('data/LOLv2/Real_captured/Test/Low', 'data/LOLv2/Real_captured/Test/Normal'),
}
MODELS = [('Multinex-Nano', 'Multinex-Nano_{ds}', 'pretrained_weights/Multinex-Nano_{ds}.pth'),
          ('Nano-GA', 'MultinexGA-Nano_{ds}', 'experiments/MultinexGA-Nano_{ds}/best_psnr_*.pth'),
          ('Micro-GA', 'MultinexGA-Micro_{ds}', 'experiments/MultinexGA-Micro_{ds}/best_psnr_*.pth')]


def load(path):
    return np.asarray(Image.open(path).convert('RGB'), dtype=np.float32) / 255.0


def psnr(a, b):
    return 10 * np.log10(1.0 / np.mean((a - b) ** 2))


def newest(pattern):
    """Newest file matching pattern, the same choice as best_ckpt() in jobs/eval_ga.pbs."""
    files = glob.glob(pattern)
    return max(files, key=os.path.getmtime) if files else None


def output_path(ds, cfg_tmpl, w_tmpl, name):
    """Image saved by Enhancement/test.py: <result_dir>/<dataset>/<config>/<ckpt>/<name>.png,
    where test.py names <ckpt> as basename.split('.')[0] (best_psnr_20.41_x.pth -> best_psnr_20)."""
    weights = newest(w_tmpl.format(ds=ds))
    if not weights:
        return None
    ckpt = os.path.basename(weights).split('.')[0]
    return os.path.join('results/eval_ga/images', ds, cfg_tmpl.format(ds=ds), ckpt,
                        os.path.splitext(name)[0] + '.png')


def fig_qualitative(ds, names):
    low_dir, gt_dir = LOL_DIRS[ds]
    cols = ['Input'] + [m[0] for m in MODELS] + ['Ground truth']
    fig, axes = plt.subplots(len(names), len(cols), figsize=(2.0 * len(cols), 1.45 * len(names)))
    axes = np.atleast_2d(axes)
    for r, name in enumerate(names):
        gt = load(os.path.join(gt_dir, name))
        panels = [load(os.path.join(low_dir, name))]
        for _, cfg, w in MODELS:
            p = output_path(ds, cfg, w, name)
            panels.append(load(p) if p and os.path.exists(p) else np.zeros_like(gt))
        panels.append(gt)
        for c, img in enumerate(panels):
            ax = axes[r, c]
            ax.imshow(np.clip(img, 0, 1))
            ax.set_xticks([])
            ax.set_yticks([])
            if r == 0:
                ax.set_title(cols[c], fontsize=8)
            if 1 <= c <= len(MODELS):
                ax.set_xlabel(f'{psnr(img, gt):.2f} dB', fontsize=7)
    fig.tight_layout(pad=0.3)
    fig.savefig(os.path.join(OUT, f'fig_qualitative_{ds}.png'), dpi=200)
    plt.close(fig)


NOREF_TAGS = [('Multinex-Nano', 'Nano-shipped'), ('Nano-GA', 'GA-Nano'), ('Micro-GA', 'GA-Micro')]


def noref_output(tag, ds, stem, split='LOL-v2-synthetic'):
    """Image saved by Enhancement/test_noref.py: <result_dir>/<dataset>/images/<name>."""
    hits = glob.glob(os.path.join('results/eval_ga', f'{tag}_NoRef_{split}', ds, 'images', stem + '.*'))
    return hits[0] if hits else None


def fig_qualitative_unpaired(picks):
    """picks: [(dataset, input file name)]; outputs come from the LOL-v2-synthetic checkpoints."""
    cols = ['Input'] + [m for m, _ in NOREF_TAGS]
    rows = []
    for ds, name in picks:
        stem = os.path.splitext(name)[0]
        panels = [load(os.path.join('data', ds, name))]
        for _, tag in NOREF_TAGS:
            p = noref_output(tag, ds, stem)
            panels.append(load(p) if p else np.zeros_like(panels[0]))
        rows.append((ds, panels))
    h, w = rows[0][1][0].shape[:2]
    fig, axes = plt.subplots(len(rows), len(cols),
                             figsize=(2.0 * len(cols), 2.0 * len(rows) * h / w + 0.3))
    axes = np.atleast_2d(axes)
    for r, (ds, panels) in enumerate(rows):
        for c, img in enumerate(panels):
            ax = axes[r, c]
            ax.imshow(np.clip(img, 0, 1))
            ax.set_xticks([])
            ax.set_yticks([])
            if r == 0:
                ax.set_title(cols[c], fontsize=8)
            if c == 0:
                ax.set_ylabel(ds, fontsize=8)
    fig.tight_layout(pad=0.3)
    fig.savefig(os.path.join(OUT, 'fig_qualitative_unpaired.png'), dpi=200)
    plt.close(fig)


def fig_guidance(path, k=7, eps=1e-2):
    """Single-scale Retinex guidance G = log(I+eps) - log(Box_k(I)+eps), as in ARMG."""
    import torch
    import torch.nn.functional as F
    img = load(path)
    x = torch.from_numpy(img).permute(2, 0, 1)[None]
    blur = F.avg_pool2d(x, k, stride=1, padding=k // 2, count_include_pad=False)
    g = (torch.log(x + eps) - torch.log(blur + eps))[0].mean(0).numpy()
    fig, axes = plt.subplots(1, 2, figsize=(6.4, 2.2))
    axes[0].imshow(np.clip(img * 4, 0, 1))
    axes[0].set_title('Input (×4 for display)', fontsize=8)
    lim = np.percentile(np.abs(g), 99)
    axes[1].imshow(g, cmap='gray', vmin=-lim, vmax=lim)
    axes[1].set_title('ARMG guidance G (mean over RGB)', fontsize=8)
    for ax in axes:
        ax.set_xticks([])
        ax.set_yticks([])
    fig.tight_layout(pad=0.3)
    fig.savefig(os.path.join(OUT, 'fig_guidance.png'), dpi=200)
    plt.close(fig)


def fig_training_curves():
    runs = [('Multinex-Nano (retrained)', 'experiments/Multinex-Nano_LOL-v1/metric.csv', BLUE),
            ('Nano-GA', 'experiments/MultinexGA-Nano_LOL-v1/metric.csv', ORANGE),
            ('Micro-GA', 'experiments/MultinexGA-Micro_LOL-v1/metric.csv', AQUA)]
    fig, ax = plt.subplots(figsize=(4.6, 2.8))
    for label, path, color in runs:
        if not os.path.exists(path):
            continue
        its, vals = [], []
        with open(path) as f:
            for row in csv.reader(f):
                try:
                    its.append(int(row[0]))
                    vals.append(float(row[1]))
                except (ValueError, IndexError):
                    continue
        its, vals = np.array(its), np.array(vals)
        # 1K-iteration running max of the validation PSNR (validated every 10 iterations)
        bins = its // 1000
        xs = np.unique(bins)
        ys = [vals[bins == b].max() for b in xs]
        ax.plot(xs, ys, color=color, lw=1.6, label=label)
    ax.set_xlabel('Iteration (K)')
    ax.set_ylabel('LOL-v1 val PSNR (dB)')
    ax.set_ylim(17, 22.5)
    ax.grid(color='#e1e0d9', lw=0.6)
    ax.legend(frameon=False, fontsize=8)
    for s in ('top', 'right'):
        ax.spines[s].set_visible(False)
    fig.tight_layout()
    fig.savefig(os.path.join(OUT, 'fig_training_curves.png'), dpi=300)
    plt.close(fig)


if __name__ == '__main__':
    fig_qualitative('LOL-v1', ['1.png', '22.png', '179.png'])
    fig_qualitative('LOL-v2-real', sorted(os.listdir(LOL_DIRS['LOL-v2-real'][0]))[:3])
    fig_qualitative_unpaired([(ds, sorted(os.listdir(os.path.join('data', ds)))[0]) for ds in ('MEF', 'LIME')])
    fig_guidance(os.path.join(LOL_DIRS['LOL-v1'][0], '22.png'))
    fig_training_curves()
    print('figures written to', OUT)
