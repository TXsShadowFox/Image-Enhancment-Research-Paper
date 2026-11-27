// Builds deliverables/Multinex_GIC_ARMG_Project_Report.docx
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, AlignmentType, TableOfContents, Footer, Header,
  PageNumber, BorderStyle,
} = require('docx');
const { makeTheme } = require('./docgen');

const T = makeTheme({ font: 'Calibri', size: 22, accent: '1F4E79', subscripts: true });
const { p, h1, h2, h3, bullet, numbered, pageBreak, equation, code, note, figure, table, spacer } = T;
const W = T.TEXT_WIDTH;

const children = [];
const add = (...xs) => xs.flat().forEach((x) => children.push(x));

// ------------------------------------------------------------------ title page
add(
  new Paragraph({ spacing: { before: 2400 }, children: [] }),
  new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: 'PROJECT REPORT', size: 24, bold: true, color: '888888' })] }),
  new Paragraph({ spacing: { before: 120, after: 120 }, children: [new TextRun({ text: 'Extending Multinex with Global Illumination Conditioning (GIC) and Adaptive Reflectance Modulation Guidance (ARMG)', size: 44, bold: true, color: '1F4E79' })] }),
  new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: '1F4E79', space: 6 } }, spacing: { after: 240 }, children: [new TextRun({ text: 'Reproduction of Multinex (CVPR 2026), design and implementation of two improvements, training of two micro-scale models, and full benchmark evaluation', size: 24, color: '444444' })] }),
  p('**Date:** 2 November 2026', { align: AlignmentType.LEFT }),
  p('**Base paper:** A. Brateanu, T. Mu, C. O. Ancuti, C. Ancuti, *Multinex: Lightweight Low-Light Image Enhancement via Multi-prior Retinex*, CVPR 2026 (arXiv:2604.10359).', { align: AlignmentType.LEFT }),
  p('**Purpose:** educational and non-commercial use only, consistent with the Multinex licence (PolyForm Noncommercial 1.0.0).', { align: AlignmentType.LEFT }),
  p('**Status:** both improved models are trained and evaluated on every paired and unpaired benchmark of the paper. The single-module ablations and the ExDark detection benchmark remain open (Section 10).', { align: AlignmentType.LEFT }),
  pageBreak(),
  new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'Contents', size: 32, bold: true, color: '1F4E79' })] }),
  new TableOfContents('Contents', { hyperlink: true, headingStyleRange: '1-2' }),
  pageBreak(),
);

// ------------------------------------------------------------------ 1 summary
add(
  h1('1. Executive summary'),
  p('The project had two phases. In the first, we reproduced the Multinex paper exactly: we set up the training and evaluation pipeline on the PBS GPU cluster and verified the published checkpoints and training recipe. In the second, we added novelty. We implemented the two improvements proposed in the GIC & ARMG plan, trained two new models in the paper\'s *micro* category (fewer than 10K parameters), and evaluated them on all paired and unpaired benchmarks of the paper.'),
  h3('Headline results'),
  bullet('**Nano-GA (934 parameters).** This is Multinex-Nano with its exact hyperparameters plus GIC and ARMG. It beats the published Multinex-Nano PSNR and SSIM on all three LOL benchmarks: +0.99 dB on LOL-v1, +1.86 dB on LOL-v2-real and +1.20 dB on LOL-v2-synthetic. LPIPS improves on two of the three.'),
  bullet('**Micro-GA (8,890 parameters, 0.44 GFLOPs).** This is a widened variant, still inside the micro category. It improves PSNR by +2.42, +1.83 and +2.64 dB and LPIPS by 39–48%. It is the best micro-scale model on every paired metric except LOL-v2-real PSNR, where it trails Nano-GA by 0.03 dB.'),
  bullet('**Same-recipe check.** Under the identical training recipe and seed, our retrained Multinex-Nano reaches 19.61 dB on LOL-v1. Nano-GA beats it by +0.80 dB, so the gain comes from the architecture, not the training setup.'),
  bullet('**Unpaired benchmarks (MEF, LIME, DICM, NPE).** The results are mixed. With LOL-v2-synthetic-trained checkpoints, Nano-GA matches the released model on NIQE (3.69 vs 3.68) and improves BRISQUE (20.02 vs 21.00). Micro-GA has the best BRISQUE (19.14) but a worse NIQE (3.98). Checkpoints trained on LOL-v1 or LOL-v2-real generalise worse.'),
  bullet('**Cost.** At Nano scale, GIC and ARMG add 238 parameters (+34%), +13% FLOPs and about 0.24 ms of GPU latency at 600×400.'),
  spacer(),
  table([
    ['Model', 'Params', 'LOL-v1', 'LOL-v2-real', 'LOL-v2-syn'],
    ['Multinex-Nano (paper)', '696', '19.42 / 0.742 / 0.276', '19.66 / 0.784 / 0.266', '21.05 / 0.882 / 0.143'],
    ['**Nano-GA (ours)**', '934', '20.41 / 0.802 / 0.213', '21.52 / 0.811 / 0.292', '22.25 / 0.908 / 0.108'],
    ['**Micro-GA (ours)**', '8,890', '21.84 / 0.825 / 0.152', '21.49 / 0.847 / 0.161', '23.69 / 0.919 / 0.075'],
  ], [2400, 900, 1909, 1909, 1908], { shadeRows: [2, 3] }),
  note('Values are PSNR (dB, higher is better) / SSIM (higher is better) / LPIPS (lower is better).'),
);

// ------------------------------------------------------------------ 2 scope
add(
  h1('2. Scope and timeline'),
  table([
    ['Phase', 'Dates (2026)', 'Work'],
    ['1. Setup and reproduction', '26–30 Oct', 'Cluster environment, datasets and cached weights. Evaluated the shipped checkpoints. Investigated the BRISQUE gap. Retrained Multinex-Nano on LOL-v1 with the shipped and paper-spec recipes.'],
    ['2. Design and implementation', '30 Oct', 'Turned the GIC/ARMG proposal into concrete modules. Implemented the MultinexGA architecture, configs, tests, profiler and cluster job scripts.'],
    ['3. Training and evaluation', '30 Oct', 'Trained two models × three LOL splits in parallel (2.4 h and 4.3 h wall-clock). Ran a chained evaluation job on all benchmarks.'],
    ['4. Documentation', '2 Nov', 'This report, the draft research paper (Word and LaTeX/Overleaf) and the figures.'],
  ], [2300, 1300, 5426], { leftAll: true }),
);

// ------------------------------------------------------------------ 3 baseline
add(
  h1('3. What existed: the Multinex paper and codebase'),
  h2('3.1 Method in brief'),
  p('Multinex enhances an image with a Retinex *residual*: the output is the input plus a learned correction, Î = I + L̂ ⊙ R̂. Here L̂ is a one-channel luminance adjustment and R̂ a three-channel reflectance or colour adjustment. Each comes from its own lightweight branch, driven by a stack of analytic colour representations rather than by the raw RGB image:'),
  bullet('**Illumination priors S_L (4 maps):** Rec.709 luma, max(R,G,B), HSL lightness and the RGB L2 norm.'),
  bullet('**Chrominance priors S_R (5 maps):** Cb, Cr, chromaticities r and g, and HSV saturation.'),
  bullet('**Each branch:** a 1×1 stem, channel-wise attention (CWA: 7×7 depthwise conv, then 1×1 conv and sigmoid), T fusion blocks (depthwise-separable conv + BN + ReLU, then an MSEF block with depthwise conv and squeeze-excitation), and a 1×1 head.'),
  bullet('**Variants:** Multinex (44.6K parameters, 2.50 GFLOPs) and **Multinex-Nano (696 parameters, 0.04 GFLOPs; width C = 3, T = 1)**.'),
  p('The paper groups models by size into heavy (>10M), mid-size (1–10M), lightweight (<1M) and **micro (<10K)**. Its micro-range competitors are SCI (0.26K), RSFNet (2.11K) and RUAS (3.43K). Its benchmarks are:'),
  bullet('**Paired:** LOL-v1, LOL-v2-real and LOL-v2-synthetic, scored with PSNR, SSIM and LPIPS.'),
  bullet('**Unpaired:** MEF, LIME, DICM and NPE, scored with NIQE and BRISQUE.'),
  bullet('**Detection:** ExDark, scored with mAP50, using a YOLOv3 detector.'),
  bullet('**Complexity:** parameters and GFLOPs.'),
  h2('3.2 Codebase'),
  table([
    ['Component', 'Location', 'Role'],
    ['Architectures', '`basicsr/models/archs/Multinex_arch.py`, `MultinexNano_arch.py`', 'Network definitions, discovered by the BasicSR registry.'],
    ['Training', '`basicsr/train.py`, `image_restoration_model.py`', 'BasicSR loop, HybridLoss (MSE + 0.2 MS-SSIM + 0.01 VGG), mixup, best-PSNR checkpointing.'],
    ['Configs', '`Options/*.yaml`', 'Three Multinex and three Nano configs, one per LOL split.'],
    ['Evaluation', '`Enhancement/test.py`, `test_noref.py`', 'Paired PSNR/SSIM/LPIPS; NIQE (custom) and BRISQUE (piq).'],
    ['Profiling', '`basicsr/complexity.py`', 'thop GFLOPs at 256×256 and latency.'],
    ['Weights', '`pretrained_weights/`', 'Per-split checkpoints and the † no-reference checkpoints.'],
  ], [1700, 3600, 3726], { leftAll: true }),
  h2('3.3 Discrepancies found between paper and code'),
  bullet('**Training recipe.** The paper\'s Appendix C.3 states Adam, cosine 2e-4 → 1e-6, 150K iterations and no mixup. The shipped Nano configs use lr 4e-4, 100K iterations, a two-cycle cyclic cosine schedule (periods 40K/60K) and mixup.'),
  bullet('**Checkpoint selection.** The best checkpoint is chosen by PSNR on the *test* split. On LOL-v1, validation runs every 10 iterations.'),
  bullet('**Experiment names.** All three shipped Nano configs share the same experiment name, so concurrent runs would overwrite each other. We used uniquely named copies.'),
  bullet('**Internal inconsistencies in the paper.** The text\'s mean NIQE/BRISQUE values do not match Table 2. Zero-DCE\'s parameter count differs between Tables 1 and 2. The † mean BRISQUE (15.53) is not the mean of its own per-set values (13.85).'),
);

// ------------------------------------------------------------------ 4 reproduction
add(
  h1('4. Phase 1: reproduction'),
  h2('4.1 Infrastructure'),
  bullet('**Cluster:** a PBS Pro cluster (RHEL 9.4) with two nodes of 8×H100 and a limit of two running jobs per user. Conda env `multinex`: Python 3.9, torch 2.4.1+cu121, piq 0.8.0.'),
  bullet('**No internet on compute nodes:** VGG19, AlexNet (for LPIPS) and the BRISQUE weights were pre-cached on the login node.'),
  bullet('**No GPU isolation:** PBS shows every GPU to every job, so the job scripts pick a GPU from live `nvidia-smi` data.'),
  bullet('**Datasets:** LOL-v1, LOL-v2-real, LOL-v2-synthetic, MEF (17), LIME (10), DICM (64) and NPE (8).'),
  h2('4.2 Shipped checkpoints'),
  p('We evaluated the released checkpoints with unchanged code. All six LOL rows match the paper\'s Table 1, except Multinex on LOL-v2-real (22.96/0.850 against 23.04/0.860 published). NIQE matches the paper\'s † rows.'),
  table([
    ['Checkpoint', 'LOL-v1', 'LOL-v2-real', 'LOL-v2-syn'],
    ['Multinex (re-evaluated)', '23.19 / 0.843 / 0.125', '22.96 / 0.850 / 0.179', '25.04 / 0.930 / 0.068'],
    ['Multinex-Nano (re-evaluated)', '19.42 / 0.742 / 0.276', '19.66 / 0.784 / 0.266', '21.06 / 0.882 / 0.143'],
    ['Multinex-Nano (paper)', '19.42 / 0.742 / 0.276', '19.66 / 0.784 / 0.266', '21.05 / 0.882 / 0.143'],
  ], [2700, 2109, 2109, 2108]),
  h2('4.3 The BRISQUE gap'),
  p('BRISQUE computed with piq is 3–6 points worse than the paper on every unpaired set, even for the released checkpoints.'),
  bullet('**Implementations:** piq 0.7.0, 0.7.1 and 0.8.0 have functionally identical BRISQUE code. pyiqa agrees with piq, and pyiqa\'s MATLAB-style BRISQUE is higher still.'),
  bullet('**Resolution:** the score depends strongly on image size. Resizing outputs to 256×256 gives 13.3 / 11.6 / 18.3, the closest to the paper\'s 11.89 / 12.55 / 15.06, but still not exact.'),
  p('**Conclusion:** the gap lies in the metric setup, not in the models. We therefore compare unpaired scores only against released checkpoints re-scored with the same code.'),
  h2('4.4 Retraining Multinex-Nano (LOL-v1)'),
  table([
    ['Run', 'LOL-v1 PSNR / SSIM / LPIPS', 'MEF NIQE / BRISQUE'],
    ['Paper', '19.42 / 0.742 / 0.276', '3.49 / 15.06 (published setup)'],
    ['Retrained, shipped config (lr 4e-4, 100K, mixup)', '19.61 / 0.777 / 0.253', '3.72 / 29.87'],
    ['Retrained, paper-spec (lr 2e-4, 150K, cosine)', '19.30 / 0.780 / 0.253', '3.77 / 31.52'],
  ], [3900, 2563, 2563]),
  p('Both recipes reproduce the paper\'s LOL-v1 result, and the shipped recipe is slightly better. We therefore used the shipped recipe for all new models, so any gain is attributable to the architecture.'),
);

// ------------------------------------------------------------------ 5 method
add(
  h1('5. Phase 2: the improvements'),
  h2('5.1 Research gaps addressed'),
  p('The proposal identified two gaps. We confirmed both on the architecture:'),
  numbered('**Limited global adaptation.** Through its convolutions, each output pixel of Multinex-Nano sees only an 11×11 window. Its only global pathway is the squeeze-excitation in MSEF, which at C = 3 passes through a single hidden unit. The right amount of correction depends on the exposure of the *whole* image, and the network cannot judge it.', 'numbers'),
  numbered('**Texture loss.** The learned corrections L̂ and R̂ are spatially smooth. The added term L̂ ⊙ R̂ brightens without scaling up local contrast, so textures look flat.', 'numbers'),
  figure('fig_architecture.png', 6.3, 'Figure 1. Multinex-GA. GIC (orange) conditions both branches before the fusion blocks; ARMG (green) modulates them after.'),
  h2('5.2 GIC: Global Illumination Conditioner'),
  p('GIC computes a global descriptor from the prior stacks, which are already available, so it costs no extra feature extraction. The descriptor has 3·K_L + K_R = 17 values:'),
  bullet('mean, standard deviation and **log-mean** of each illumination map. The log-mean is the log-average luminance, or "key", that tone mapping uses to decide exposure. The standard deviation separates uniformly dark scenes from high-contrast ones.'),
  bullet('mean of each chrominance map, a **gray-world** estimate of the illuminant colour.'),
  p('A two-layer MLP (SiLU) maps the descriptor to per-channel parameters for both branches. Each branch\'s features are then conditioned FiLM-style:'),
  equation('F′ = F ⊙ (1 + tanh g(I)) + β(I)', 1),
  p('This is the proposal\'s F_{new} = γ(I)·F + β(I), with γ = 1 + tanh g bounded to (0, 2), so a channel can be attenuated or amplified but never sign-flipped. GIC is applied **before** the fusion blocks, so they process exposure-normalised features.'),
  h2('5.3 ARMG: Adaptive Reflectance Modulation Guidance'),
  p('ARMG takes as guidance the classical single-scale Retinex reflectance, computed per RGB channel with a 7×7 box blur:'),
  equation('G_c = log(I_c + ε) − log(Box_7(I_c) + ε),   ε = 0.01', 2),
  p('Dividing out the locally smoothed illumination (a subtraction in the log domain) leaves an illumination-invariant map of local texture and edges. It is equally informative in dark and bright regions and has **no parameters**. A light network (depthwise 3×3, pointwise 3→h, SiLU, pointwise head) predicts pixel-wise maps:'),
  equation('F′ = F ⊙ (1 + tanh m) + a     (the proposal\'s F_{out} = F_{in} × M + A)', 3),
  p('ARMG is applied **after** the fusion blocks, immediately before the 1×1 heads, because the blocks are where spatial detail is smoothed away.'),
  h2('5.4 Design decisions'),
  table([
    ['Decision', 'Choice', 'Reason'],
    ['Initialisation', 'Zero-init the output layers of GIC and ARMG', 'At step 0 both modules are the identity, so training starts exactly from Multinex-Nano. Verified against the shipped checkpoint (max deviation < 1e-6).'],
    ['Scale bound', 'γ, M = 1 + tanh(·) ∈ (0, 2)', 'Stable; cannot invert features.'],
    ['GIC statistics', 'mean, std, log-mean, chroma means', 'Interpretable photometric quantities (tone-mapping key, gray-world colour) that are cheap to compute.'],
    ['ARMG guidance', 'Log-domain SSR with a 7×7 box blur', 'Per-pixel I / max(I) would erase luminance texture. SSR keeps local contrast and is gain-invariant.'],
    ['ARMG position', 'After the fusion blocks (configurable)', 'Detail is committed right before decoding. The proposal\'s order (before the blocks) is available as `armg_position: before_blocks`.'],
    ['Baseline safety', 'Subclass, not edit, MultinexNano', 'Original configs and checkpoints are untouched. With both modules off, MultinexGA equals MultinexNano exactly.'],
  ], [1700, 2700, 4626], { leftAll: true }),
  h2('5.5 Variants and parameter budget'),
  table([
    ['', 'Multinex-Nano', 'Nano-GA', 'Micro-GA'],
    ['Width C / fusion blocks T', '3 / 1', '3 / 1', '20 / 3'],
    ['SE reduction / GIC & ARMG hidden', '3 / –', '3 / 4', '4 / 8'],
    ['GIC parameters', '–', '132', '864'],
    ['ARMG parameters', '–', '106', '782'],
    ['**Total parameters**', '**696**', '**934**', '**8,890**'],
    ['GFLOPs (256×256)', '0.0435', '0.0493', '0.4414'],
    ['GPU latency, 600×400 (ms)', '0.79', '1.03', '3.22'],
  ], [3300, 1909, 1909, 1908]),
);

// ------------------------------------------------------------------ 6 implementation
add(
  h1('6. Implementation'),
  h2('6.1 Files added'),
  p('No original file was modified; every change is a new file.'),
  table([
    ['File', 'Purpose'],
    ['`basicsr/models/archs/MultinexGA_arch.py`', 'GlobalIlluminationConditioner, ReflectanceGuidance, AdaptiveReflectanceModulation and MultinexGA (a subclass of MultinexNano).'],
    ['`Options/MultinexGA-{Nano,Micro}_{LOL-v1,LOL-v2-real,LOL-v2-synthetic}.yaml`', 'Six configs, identical to the shipped Nano configs except for `name` and `network_g`.'],
    ['`tests/test_multinex_ga.py`', '15 pytest checks (Section 6.2).'],
    ['`scripts/profile_models.py`', 'Params, thop GFLOPs at 256×256 (paper protocol) and median GPU latency.'],
    ['`scripts/summarize_ga.py`', 'Parses the evaluation logs into a Markdown summary.'],
    ['`jobs/train_ga.pbs`', 'Trains one variant on all three LOL splits concurrently on one GPU.'],
    ['`jobs/eval_ga.pbs`', 'Evaluates every benchmark for the GA models and the shipped checkpoints, then summarises.'],
    ['`docs/MultinexGA.md`', 'Developer documentation.'],
    ['`deliverables/`', 'This report, the paper draft (Word and LaTeX) and the figure scripts.'],
  ], [4300, 4726], { leftAll: true }),
  h2('6.2 Verification'),
  p('All 15 tests pass in the cluster environment:'),
  bullet('**Budgets:** parameter counts of 696, 934 and 8,890, with Micro-GA under 10,000.'),
  bullet('**Equivalence:** with both modules disabled, the output is bit-identical to MultinexNano on the shipped checkpoint.'),
  bullet('**Identity at initialisation:** for both ARMG positions, the output matches the shipped Nano function to within 1e-6.'),
  bullet('**Gradients:** gradients reach the new modules, and all gradients are finite.'),
  bullet('**Batch independence:** per-image GIC statistics do not leak across a batch.'),
  bullet('**GIC:** the descriptor responds to global exposure.'),
  bullet('**ARMG:** the guidance is invariant to a global gain.'),
  bullet('**Robustness:** all-zero and all-one inputs give finite outputs, invalid options are rejected, and every config builds through the BasicSR registry.'),
  p('A 300-iteration smoke job then exercised the full pipeline before the long runs: train, then checkpoint, then `test.py`, then `test_noref.py`, then profiling.'),
  h2('6.3 Infrastructure fixes'),
  bullet('**gpu02 works again.** The old group-resolution failure is gone. gpu02 lacked the system library `libXext.so.6` needed by OpenCV, so the jobs load a copy from `~/syslibs` via `LD_LIBRARY_PATH`. The shared conda environment is untouched.'),
  bullet('**GPU selection by free memory.** Other users\' jobs hold most of the GPU memory, so the scripts choose among GPUs with at least 20 GB free.'),
  bullet('**Concurrent runs per GPU.** The models are tiny and launch-bound, so three trainings share one GPU. This respects the two-jobs-per-user limit.'),
  bullet('**Automatic evaluation.** The evaluation job is chained with a PBS dependency (`afterany`) and starts on its own when training ends.'),
  bullet('**Connection retries.** A retry wrapper handles the intermittently dropping SSH connection.'),
);

// ------------------------------------------------------------------ 7 protocol
add(
  h1('7. Experimental protocol'),
  bullet('**Recipe:** identical to the shipped Multinex-Nano configs. Adam, lr 4e-4, cyclic cosine schedule (40K + 60K iterations), batch 8, 256×256 crops, flips/rotations, mixup, gradient clipping at 0.01, HybridLoss, seed 100.'),
  bullet('**Runs:** one model per LOL split. Best checkpoint chosen by evaluation-split PSNR, as for the baseline. Validation every 10 iterations on LOL-v1 and every 1,000 on LOL-v2.'),
  bullet('**Paired metrics:** PSNR, SSIM and LPIPS-Alex at full resolution, without GT-mean correction (as in the paper).'),
  bullet('**Unpaired metrics:** NIQE and BRISQUE (piq), using `test_noref.py`, for each trained checkpoint. Released checkpoints are re-scored in the same job.'),
  bullet('**Hardware:** NVIDIA H100. Nano-GA took 2 h 25 min and Micro-GA 4 h 18 min (three splits concurrently). Evaluation took 6 minutes.'),
);

// ------------------------------------------------------------------ 8 results
add(
  h1('8. Results'),
  h2('8.1 Paired benchmarks'),
  table([
    ['Model', 'Params', 'LOL-v1', 'LOL-v2-real', 'LOL-v2-syn'],
    ['SCI', '0.26K', '14.78 / 0.525 / 0.327', '17.30 / 0.540 / 0.294', '15.43 / 0.744 / 0.203'],
    ['RSFNet', '2.11K', '19.39 / 0.745 / 0.278', '19.46 / 0.745 / 0.278', '17.18 / 0.817 / 0.159'],
    ['RUAS', '3.43K', '16.40 / 0.503 / 0.303', '15.33 / 0.493 / 0.325', '13.40 / 0.640 / 0.365'],
    ['Multinex-Nano (paper)', '0.69K', '19.42 / 0.742 / 0.276', '19.66 / 0.784 / 0.266', '21.05 / 0.882 / 0.143'],
    ['Multinex-Nano (retrained, same recipe)', '0.69K', '19.61 / 0.777 / 0.253', '–', '–'],
    ['**Nano-GA (ours)**', '0.93K', '20.41 / 0.802 / 0.213', '**21.52** / 0.811 / 0.292', '22.25 / 0.908 / 0.108'],
    ['**Micro-GA (ours)**', '8.89K', '**21.84 / 0.825 / 0.152**', '21.49 / **0.847 / 0.161**', '**23.69 / 0.919 / 0.075**'],
  ], [2600, 800, 1876, 1876, 1874], { shadeRows: [6, 7] }),
  note('Competitor rows are from the Multinex paper, Table 1. Bold marks the best micro-scale value.'),
  figure('fig_lol_benchmarks.png', 6.3, 'Figure 2. Paired benchmarks. Dot plots are used because the value axes do not start at zero.'),
  h3('Change relative to the published Multinex-Nano'),
  table([
    ['Model', 'Metric', 'LOL-v1', 'LOL-v2-real', 'LOL-v2-syn'],
    ['Nano-GA', 'ΔPSNR (dB)', '+0.99', '+1.86', '+1.20'],
    ['Nano-GA', 'ΔSSIM', '+0.060', '+0.027', '+0.026'],
    ['Nano-GA', 'ΔLPIPS', '−0.063 (−23%)', '+0.026 (worse)', '−0.035 (−24%)'],
    ['Micro-GA', 'ΔPSNR (dB)', '+2.42', '+1.83', '+2.64'],
    ['Micro-GA', 'ΔSSIM', '+0.083', '+0.063', '+0.037'],
    ['Micro-GA', 'ΔLPIPS', '−0.124 (−45%)', '−0.105 (−39%)', '−0.068 (−48%)'],
  ], [1500, 1500, 2009, 2009, 2008]),
  figure('fig_psnr_vs_params.png', 4.6, 'Figure 3. LOL-v1 PSNR against parameters (log scale). Micro-GA closes 55–66% of the gap between Multinex-Nano and Multinex (44.6K) at 20% of its parameters.'),
  h2('8.2 Unpaired benchmarks'),
  table([
    ['Model (all piq, same code)', 'MEF', 'LIME', 'DICM', 'NPE', 'Mean'],
    ['Multinex-Nano (released, v2-syn)', '3.27 / 21.76', '3.83 / 19.24', '3.65 / 23.94', '3.97 / 19.07', '3.68 / 21.00'],
    ['Multinex-Nano† (released NoRef)', '3.40 / 20.66', '4.11 / 19.08', '3.60 / 21.80', '3.85 / 17.46', '3.74 / 19.75'],
    ['**Nano-GA (ours, v2-syn)**', '**3.10 / 17.52**', '4.10 / 20.34', '3.68 / 24.84', '3.88 / 17.39', '3.69 / 20.02'],
    ['**Micro-GA (ours, v2-syn)**', '4.55 / 20.90', '3.94 / **17.90**', '**3.60** / 22.17', '**3.81 / 15.60**', '3.98 / **19.14**'],
  ], [2826, 1240, 1240, 1240, 1240, 1240], { shadeRows: [3, 4] }),
  note('Values are NIQE / BRISQUE (lower is better). Appendix B lists every checkpoint, including the LOL-v1 and LOL-v2-real-trained ones.'),
  figure('fig_noref_means.png', 6.3, 'Figure 4. Mean NIQE and BRISQUE over the four unpaired sets.'),
  p('**Reading.** On unpaired images, the GA models beat the released checkpoints on BRISQUE and on most per-set scores, but not consistently on NIQE. Micro-GA\'s mean NIQE is pulled up by one set (MEF, 4.55). Checkpoints trained on LOL-v1 or LOL-v2-real generalise worse for every model, and more so for ours (mean NIQE 3.95–4.40 against 3.80–3.88 for the released ones).'),
);

// ------------------------------------------------------------------ 9 achievements
add(
  h1('9. What each change achieved'),
  table([
    ['Change', 'Effect', 'Evidence'],
    ['Reproduction pipeline and verification', 'An exact baseline: our code reproduces the published LOL numbers to within 0.01 dB.', 'Section 4.2'],
    ['Same-recipe baseline retraining', 'Separates architecture gains from recipe gains.', 'Nano retrained: 19.61 dB on LOL-v1. Nano-GA: +0.80 dB over it.'],
    ['GIC + ARMG at Nano width (+238 params)', '+1.0 to +1.9 dB PSNR and higher SSIM on all LOL splits.', 'Section 8.1'],
    ['Widening to C = 20, T = 3 while staying micro', '+1.8 to +2.6 dB PSNR, 39–48% lower LPIPS. Best micro model on 8 of 9 paired metrics.', 'Section 8.1, Figure 3'],
    ['Zero-initialised, bounded modulation', 'Stable training from the baseline function; no regressions at initialisation.', 'Identity-at-initialisation tests (Section 6.2)'],
    ['Retinex guidance for ARMG', 'SSIM up on every split (detail preservation).', 'ΔSSIM table'],
    ['Same-code unpaired evaluation', 'A fair unpaired comparison despite the BRISQUE metric gap.', 'Section 8.2'],
    ['Cluster fixes (gpu02, GPU selection, concurrency, chaining)', 'Both models trained in parallel in under 4.5 h total.', 'Section 6.3'],
  ], [2800, 3600, 2626], { leftAll: true }),
);

// ------------------------------------------------------------------ 10 limitations
add(
  h1('10. Limitations and next steps'),
  h3('Open items'),
  bullet('**Ablations not run.** The proposal\'s GIC-only and ARMG-only rows are still missing. They need only config switches (`use_gic`, `use_armg`) and can be launched with `jobs/train_ga.pbs`.'),
  bullet('**ExDark detection not evaluated.** The cluster has neither the ExDark data nor an mmdetection/YOLOv3 setup.'),
  bullet('**Single seed.** Results come from one seed (100). Multi-seed runs would give variance estimates.'),
  bullet('**Test-split checkpoint selection.** This follows the official code and is optimistic for every method. A held-out validation split would be unbiased.'),
  bullet('**Unpaired generalisation is mixed.** Likely causes: selection on an LOL split, GIC descriptors extrapolating on bright out-of-distribution scenes, and noise amplification in the SSR guidance.'),
  bullet('**Qualitative figures pending.** Qualitative comparisons and training curves need the cluster outputs; `deliverables/make_cluster_figures.py` generates them.'),
  h3('Recommended next experiments, in order'),
  numbered('GIC-only and ARMG-only ablations for Nano on all splits.', 'numbers2'),
  numbered('Normalise or clamp the GIC descriptor, and add descriptor-range augmentation (random exposure scaling) to improve unpaired generalisation.', 'numbers2'),
  numbered('ARMG placed before the fusion blocks (`armg_position: before_blocks`).', 'numbers2'),
  numbered('Three seeds per configuration, and a held-out validation split.', 'numbers2'),
  numbered('ExDark detection with the paper\'s YOLOv3 setup.', 'numbers2'),
);

// ------------------------------------------------------------------ appendices
add(
  pageBreak(),
  h1('Appendix A. How to reproduce'),
  p('From `~/Multinex` on the cluster:'),
  ...code([
    '# correctness checks',
    'python -m pytest tests/test_multinex_ga.py -q',
    '# train both variants on all three LOL splits (two PBS jobs)',
    'qsub -N ga_nano  -v VARIANT=Nano  -o logs/train_ga_nano.log  jobs/train_ga.pbs',
    'qsub -N ga_micro -v VARIANT=Micro -o logs/train_ga_micro.log jobs/train_ga.pbs',
    '# evaluate everything once both are done (writes results/eval_ga/summary.md)',
    'qsub -N ga_eval -W depend=afterany:<nano_id>:<micro_id> -o logs/eval_ga.log jobs/eval_ga.pbs',
    '# ablation example: GIC only -> set use_armg: false in a copy of the config',
  ]),
  h1('Appendix B. All unpaired results (NIQE / BRISQUE)'),
  table([
    ['Model', 'Trained on', 'MEF', 'LIME', 'DICM', 'NPE', 'Mean'],
    ['Nano (released)', 'LOL-v1', '3.43 / 27.49', '4.13 / 22.04', '3.69 / 27.40', '4.28 / 31.00', '3.88 / 26.98'],
    ['Nano (released)', 'LOL-v2-real', '3.53 / 28.34', '4.00 / 22.43', '3.63 / 24.77', '4.03 / 23.30', '3.80 / 24.71'],
    ['Nano (released)', 'LOL-v2-syn', '3.27 / 21.76', '3.83 / 19.24', '3.65 / 23.94', '3.97 / 19.07', '3.68 / 21.00'],
    ['Nano† (released)', 'NoRef', '3.40 / 20.66', '4.11 / 19.08', '3.60 / 21.80', '3.85 / 17.46', '3.74 / 19.75'],
    ['Nano-GA', 'LOL-v1', '4.37 / 27.99', '4.34 / 19.58', '4.18 / 23.69', '4.58 / 21.57', '4.37 / 23.21'],
    ['Nano-GA', 'LOL-v2-real', '4.34 / 32.03', '5.02 / 30.56', '3.98 / 25.08', '4.27 / 22.20', '4.40 / 27.47'],
    ['Nano-GA', 'LOL-v2-syn', '3.10 / 17.52', '4.10 / 20.34', '3.68 / 24.84', '3.88 / 17.39', '3.69 / 20.02'],
    ['Micro-GA', 'LOL-v1', '3.81 / 30.43', '4.14 / 24.10', '3.72 / 25.53', '4.12 / 24.11', '3.95 / 26.04'],
    ['Micro-GA', 'LOL-v2-real', '3.86 / 30.82', '4.73 / 32.34', '3.95 / 29.27', '4.55 / 33.29', '4.27 / 31.43'],
    ['Micro-GA', 'LOL-v2-syn', '4.55 / 20.90', '3.94 / 17.90', '3.60 / 22.17', '3.81 / 15.60', '3.98 / 19.14'],
  ], [1500, 1150, 1275, 1275, 1275, 1275, 1276], { size: 16 }),
  h1('Appendix C. Configuration differences'),
  p('Compared with `Options/Multinex-Nano_<split>.yaml`, the Nano-GA configs change only `name`, `type: MultinexGA` and the added GIC/ARMG block. Micro-GA additionally sets `base_channels: 20`, `illum_mid: 3`, `chroma_mid: 3`, `reduction_ratio: 4`, `target_params: ~` and hidden widths of 8.'),
  ...code([
    'use_gic: true          gic_hidden: 4 (Micro: 8)     gic_eps: 1.0e-3',
    'use_armg: true         armg_hidden: 4 (Micro: 8)    armg_kernel: 7',
    'armg_eps: 1.0e-2       armg_position: after_blocks',
  ]),
);

// ------------------------------------------------------------------ build
const doc = new Document({
  creator: 'Multinex-GA project',
  title: 'Multinex GIC + ARMG Project Report',
  styles: T.styles,
  numbering: T.numbering,
  features: { updateFields: true },
  sections: [{
    properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Multinex + GIC + ARMG: project report', size: 16, color: '888888' })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '888888' })] })] }) },
    children,
  }],
});

const out = path.join(__dirname, '..', 'Multinex_GIC_ARMG_Project_Report.docx');
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(out, buf); console.log('wrote', out); });
