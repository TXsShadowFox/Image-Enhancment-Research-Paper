# Multinex-GA: Global Illumination Conditioning + Adaptive Reflectance Modulation

An educational, non-commercial extension of Multinex (CVPR 2026) with two modules,
both inserted into each branch (illumination and chrominance) of Multinex-Nano.

```
priors -> stem -> CWA -> [GIC] -> fusion blocks -> [ARMG] -> head   (per branch)
out = I + L_hat * R_hat                                               (unchanged)
```

| Module | Operation | Input | Placement |
|---|---|---|---|
| **GIC**: Global Illumination Conditioner | `F' = F * (1 + tanh(g)) + b`, `(g, b) = MLP(d(I))` | global descriptor `d`: mean, std and log-mean of each illumination map, plus the mean of each chrominance map | before the fusion blocks |
| **ARMG**: Adaptive Reflectance Modulation Guidance | `F' = F * (1 + tanh(m)) + a`, `(m, a) = Conv(G(I))` | parameter-free single-scale Retinex reflectance, `G_c = log(I_c + eps) - log(Blur7(I_c) + eps)` | after the fusion blocks (`armg_position: after_blocks`) |

Design choices:
- **Identity at initialisation.** Both output layers are zero-initialised, so training
  starts from exactly the Multinex-Nano function (`tests/test_multinex_ga.py` checks this
  against the shipped checkpoint). The scale `1 + tanh(.)` stays in (0, 2), so a
  module can attenuate or amplify a channel but never flip its sign.
- **GIC addresses the small receptive field.** Each output pixel of Nano sees an
  11×11 px window, plus a single-unit squeeze-excitation gate. That is too little to
  judge how much exposure correction the image as a whole needs. The log-mean is the log-average luminance ("key") used in tone
  mapping; the chrominance means are a gray-world estimate of the illuminant colour.
- **ARMG feeds illumination-invariant detail.** The learned luminance and chroma
  corrections are smooth, so brightening flattens texture. Single-scale Retinex
  guidance is the same in dark and bright regions and needs no parameters.
  ARMG runs after the fusion blocks, where the detail would otherwise be lost.
- **The baseline stays untouched.** `MultinexGA` subclasses `MultinexNano`. With
  `use_gic: false` and `use_armg: false` it has the same state dict and the same
  output.

## Variants

| Config | Width C / blocks T | Params | GFLOPs@256² | GPU latency @600×400 |
|---|---|---:|---:|---:|
| `Multinex-Nano_*` (baseline) | 3 / 1 | 696 | 0.0435 | 3.11 ms |
| `MultinexGA-Nano_*` (exact Nano hyper-parameters + GIC + ARMG) | 3 / 1 | 934 | 0.0493 | 3.31 ms |
| `MultinexGA-Micro_*` (widened Nano + GIC + ARMG, under the paper's 10K micro limit) | 20 / 3 | 8,890 | 0.4414 | 8.00 ms |

GFLOPs are thop MACs on a 3×256×256 input, as in `basicsr/complexity.py`. Latency is
the median over 200 runs on an H100. Training recipes are identical to the shipped
`Options/Multinex-Nano_*.yaml`; the configs differ only in `name` and `network_g`.

Ablations from the proposal (GIC only / ARMG only) need no code changes: set
`use_gic` or `use_armg` to `false` in the config.

## Run

```bash
python -m pytest tests/test_multinex_ga.py -q                    # correctness checks
python -m basicsr.train --opt Options/MultinexGA-Nano_LOL-v1.yaml # train one split
python scripts/profile_models.py --opts Options/MultinexGA-*_LOL-v1.yaml
```

On the PBS cluster, `jobs/train_ga.pbs` trains one variant on all three LOL splits
concurrently. `jobs/eval_ga.pbs` evaluates every benchmark of the paper (LOL
PSNR/SSIM/LPIPS, DICM/LIME/MEF/NPE NIQE/BRISQUE and complexity) for the GA models
and for the shipped Nano checkpoints, then writes `results/eval_ga/summary.md`.
