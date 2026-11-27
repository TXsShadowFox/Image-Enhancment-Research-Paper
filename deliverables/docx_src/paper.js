// Builds deliverables/Multinex_GIC_ARMG_Paper_Draft.docx (same content as paper_latex/main.tex).
const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, AlignmentType, Footer, PageNumber } = require('docx');
const { makeTheme } = require('./docgen');

const T = makeTheme({ font: 'Times New Roman', size: 22, accent: '2F2F2F', subscripts: true });
const { p, h1, h2, bullet, numbered, equation, note, figure, table, spacer } = T;

// ---- numbered citations, assigned in order of first use
const REFS = {
  brateanu2026multinex: 'A. Brateanu, T. Mu, C. O. Ancuti, and C. Ancuti, "Multinex: Lightweight low-light image enhancement via multi-prior Retinex," in Proc. IEEE/CVF CVPR, 2026. arXiv:2604.10359.',
  cai2023retinexformer: 'Y. Cai, H. Bian, J. Lin, H. Wang, R. Timofte, and Y. Zhang, "Retinexformer: One-stage Retinex-based transformer for low-light image enhancement," in Proc. IEEE/CVF ICCV, 2023.',
  yan2025hvi: 'Q. Yan et al., "HVI: A new color space for low-light image enhancement," in Proc. IEEE/CVF CVPR, 2025.',
  ma2022sci: 'L. Ma, T. Ma, R. Liu, X. Fan, and Z. Luo, "Toward fast, flexible, and robust low-light image enhancement," in Proc. IEEE/CVF CVPR, 2022.',
  liu2021ruas: 'R. Liu, L. Ma, J. Zhang, X. Fan, and Z. Luo, "Retinex-inspired unrolling with cooperative prior architecture search for low-light image enhancement," in Proc. IEEE/CVF CVPR, 2021.',
  ouyang2023rsfnet: 'W. Ouyang et al., "RSFNet: A white-box image retouching approach using region-specific color filters," in Proc. IEEE/CVF ICCV, 2023.',
  perez2018film: 'E. Perez, F. Strub, H. de Vries, V. Dumoulin, and A. Courville, "FiLM: Visual reasoning with a general conditioning layer," in Proc. AAAI, 2018.',
  jobson1997ssr: 'D. J. Jobson, Z. Rahman, and G. A. Woodell, "Properties and performance of a center/surround retinex," IEEE Trans. Image Process., vol. 6, no. 3, pp. 451–462, 1997.',
  land1971retinex: 'E. H. Land and J. J. McCann, "Lightness and Retinex theory," J. Opt. Soc. Am., vol. 61, no. 1, pp. 1–11, 1971.',
  jobson1997msr: 'D. J. Jobson, Z. Rahman, and G. A. Woodell, "A multiscale retinex for bridging the gap between color images and the human observation of scenes," IEEE Trans. Image Process., vol. 6, no. 7, pp. 965–976, 1997.',
  guo2017lime: 'X. Guo, Y. Li, and H. Ling, "LIME: Low-light image enhancement via illumination map estimation," IEEE Trans. Image Process., vol. 26, no. 2, pp. 982–993, 2017.',
  wei2018retinexnet: 'C. Wei, W. Wang, W. Yang, and J. Liu, "Deep Retinex decomposition for low-light enhancement," in Proc. BMVC, 2018.',
  guo2020zerodce: 'C. Guo et al., "Zero-reference deep curve estimation for low-light image enhancement," in Proc. IEEE/CVF CVPR, 2020.',
  brateanu2025lytnet: 'A. Brateanu, R. Balmez, A. Avram, C. Orhei, and C. Ancuti, "LYT-NET: Lightweight YUV transformer-based network for low-light image enhancement," IEEE Signal Process. Lett., 2025.',
  hu2018se: 'J. Hu, L. Shen, and G. Sun, "Squeeze-and-excitation networks," in Proc. IEEE CVPR, 2018.',
  reinhard2002tone: 'E. Reinhard, M. Stark, P. Shirley, and J. Ferwerda, "Photographic tone reproduction for digital images," in Proc. ACM SIGGRAPH, 2002.',
  buchsbaum1980grayworld: 'G. Buchsbaum, "A spatial processor model for object colour perception," J. Franklin Inst., vol. 310, no. 1, pp. 1–26, 1980.',
  yang2021lolv2: 'W. Yang, W. Wang, H. Huang, S. Wang, and J. Liu, "Sparse gradient regularized deep Retinex network for robust low-light image enhancement," IEEE Trans. Image Process., vol. 30, pp. 2072–2086, 2021.',
  ma2015mef: 'K. Ma, K. Zeng, and Z. Wang, "Perceptual quality assessment for multi-exposure image fusion," IEEE Trans. Image Process., vol. 24, no. 11, pp. 3345–3356, 2015.',
  lee2013dicm: 'C. Lee, C. Lee, and C.-S. Kim, "Contrast enhancement based on layered difference representation of 2D histograms," IEEE Trans. Image Process., vol. 22, no. 12, pp. 5372–5384, 2013.',
  wang2013npe: 'S. Wang, J. Zheng, H.-M. Hu, and B. Li, "Naturalness preserved enhancement algorithm for non-uniform illumination images," IEEE Trans. Image Process., vol. 22, no. 9, pp. 3538–3548, 2013.',
  kingma2015adam: 'D. P. Kingma and J. Ba, "Adam: A method for stochastic optimization," in Proc. ICLR, 2015.',
  loshchilov2017sgdr: 'I. Loshchilov and F. Hutter, "SGDR: Stochastic gradient descent with warm restarts," in Proc. ICLR, 2017.',
  zhang2018mixup: 'H. Zhang, M. Cisse, Y. N. Dauphin, and D. Lopez-Paz, "mixup: Beyond empirical risk minimization," in Proc. ICLR, 2018.',
  wang2003msssim: 'Z. Wang, E. P. Simoncelli, and A. C. Bovik, "Multiscale structural similarity for image quality assessment," in Proc. Asilomar Conf. Signals, Systems and Computers, 2003.',
  simonyan2015vgg: 'K. Simonyan and A. Zisserman, "Very deep convolutional networks for large-scale image recognition," in Proc. ICLR, 2015.',
  paszke2019pytorch: 'A. Paszke et al., "PyTorch: An imperative style, high-performance deep learning library," in Proc. NeurIPS, 2019.',
  wang2004ssim: 'Z. Wang, A. C. Bovik, H. R. Sheikh, and E. P. Simoncelli, "Image quality assessment: From error visibility to structural similarity," IEEE Trans. Image Process., vol. 13, no. 4, pp. 600–612, 2004.',
  zhang2018lpips: 'R. Zhang, P. Isola, A. A. Efros, E. Shechtman, and O. Wang, "The unreasonable effectiveness of deep features as a perceptual metric," in Proc. IEEE CVPR, 2018.',
  mittal2013niqe: 'A. Mittal, R. Soundararajan, and A. C. Bovik, "Making a \'completely blind\' image quality analyzer," IEEE Signal Process. Lett., vol. 20, no. 3, pp. 209–212, 2013.',
  mittal2012brisque: 'A. Mittal, A. K. Moorthy, and A. C. Bovik, "No-reference image quality assessment in the spatial domain," IEEE Trans. Image Process., vol. 21, no. 12, pp. 4695–4708, 2012.',
  loh2019exdark: 'Y. P. Loh and C. S. Chan, "Getting to know low-light images with the Exclusively Dark dataset," Comput. Vis. Image Underst., vol. 178, pp. 30–42, 2019.',
};
const order = [];
const c = (...keys) => '[' + keys.map((k) => {
  if (!REFS[k]) throw new Error(`unknown ref ${k}`);
  if (!order.includes(k)) order.push(k);
  return order.indexOf(k) + 1;
}).join(', ') + ']';

const todo = (text) => new Paragraph({
  spacing: { after: 120 },
  children: [new TextRun({ text: `[TODO: ${text}]`, color: 'C00000', bold: true })],
});

// Figures built on the cluster by deliverables/make_cluster_figures.py; each is inserted once it exists.
const { FIG_DIR } = require('./docgen');
const CLUSTER_FIGS = [
  ['fig_qualitative_LOL-v1.png', 6.2, 'LOL-v1 test images. Columns: input, Multinex-Nano, Nano-GA, Micro-GA and ground truth; PSNR against the ground truth is shown under each output.'],
  ['fig_qualitative_LOL-v2-real.png', 6.2, 'LOL-v2-real test images, in the same layout as the LOL-v1 figure.'],
  ['fig_qualitative_unpaired.png', 6.2, 'Unpaired images (MEF, LIME). Columns: input, then the outputs of Multinex-Nano, Nano-GA and Micro-GA, all from the LOL-v2-synthetic checkpoints.'],
  ['fig_guidance.png', 5.0, 'ARMG guidance G for a LOL-v1 input (input brightened ×4 for display only). The map has no parameters and responds to texture equally in dark and bright regions.'],
];
let nextFig = 5;
function clusterFigures() {
  const present = CLUSTER_FIGS.filter(([f]) => fs.existsSync(path.join(FIG_DIR, f)));
  const missing = CLUSTER_FIGS.filter(([f]) => !fs.existsSync(path.join(FIG_DIR, f))).map(([f]) => f);
  const out = present.flatMap(([f, w, cap]) => figure(f, w, `Figure ${nextFig++}. ${cap}`));
  if (missing.length) out.push(todo(`Generate ${missing.join(', ')} with deliverables/make_cluster_figures.py (needs the cluster outputs under results/eval_ga).`));
  return out;
}

const children = [];
const add = (...xs) => xs.flat().forEach((x) => children.push(x));

// ------------------------------------------------------------------ front matter
add(
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 200 }, children: [new TextRun({ text: 'Global Illumination Conditioning and Reflectance-Guided Modulation for Micro-Scale Low-Light Image Enhancement', bold: true, size: 34 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '[Author names] · [Affiliation] · [email]', color: 'C00000' })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: 'Draft, 2 November 2026: not for distribution', italics: true, size: 18, color: '666666' })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Abstract', bold: true })] }),
  p(`Micro-scale low-light image enhancement (LLIE) models with fewer than ten thousand parameters are attractive for always-on and embedded cameras. Their tiny receptive fields, however, leave them blind to the global exposure of a scene, and their smooth learned corrections wash out texture when an image is brightened. We study both problems on Multinex-Nano, a 696-parameter multi-prior Retinex model, and propose two plug-in modules. The *Global Illumination Conditioner* (GIC) summarises analytic illumination and chrominance priors into a global descriptor (mean, spread, log-average luminance and gray-world colour) and applies feature-wise affine conditioning. The *Adaptive Reflectance Modulation Guidance* (ARMG) module derives a parameter-free single-scale Retinex reflectance map and predicts pixel-wise multiplicative and additive feature maps. These re-inject illumination-invariant detail right before the Retinex decoding heads. Both modules are zero-initialised, so training starts exactly from the baseline function. Adding only 238 parameters (934 in total), Nano-GA improves PSNR by +0.99, +1.86 and +1.20 dB on LOL-v1, LOL-v2-real and LOL-v2-synthetic, and improves SSIM on all three. A widened variant, Micro-GA (8.9K parameters, 0.44 GFLOPs), improves PSNR by +1.8 to +2.6 dB over Multinex-Nano and reduces LPIPS by 39–48%, while staying inside the micro regime. On unpaired benchmarks (MEF, LIME, DICM, NPE) the gains are mixed: the best checkpoints match or improve BRISQUE but not consistently NIQE. We report and analyse this openly.`, { run: { size: 20 } }),
  p('**Keywords:** low-light image enhancement, Retinex, lightweight networks, feature-wise conditioning, micro models.', { run: { size: 20 } }),
);

// ------------------------------------------------------------------ 1 intro
add(
  h1('1. Introduction'),
  p(`Low-light images suffer from low contrast, noise and colour casts, and LLIE aims to restore visibility, colour fidelity and structure. Recent state-of-the-art methods ${c('cai2023retinexformer', 'yan2025hvi')} reach high fidelity with millions of parameters, which rules them out for always-on, battery-powered or in-sensor processing. At the other end of the scale, *micro* models with fewer than 10K parameters ${c('ma2022sci', 'liu2021ruas', 'ouyang2023rsfnet', 'brateanu2026multinex')} run in about a millisecond or less, but trade away accuracy.`),
  p(`Multinex ${c('brateanu2026multinex')} showed that a principled Retinex residual formulation, Î = I + L̂ ⊙ R̂, driven by stacks of analytic illumination and chrominance priors, lets a 696-parameter model (Multinex-Nano) outperform larger lightweight models. We identify two limitations that matter specifically at this scale:`),
  numbered('**No global exposure awareness.** Through its convolutions, each output pixel of Multinex-Nano sees an 11×11 window. Its only global pathway is the squeeze-excitation inside MSEF, which at width C = 3 passes through a single hidden unit. The correction an image needs, however, depends on its overall exposure: the same local patch should be brightened more in a globally dark image than in a high-contrast image with a dark corner.', 'numbers'),
  numbered('**Texture attenuation.** The learned corrections L̂ and R̂ are spatially smooth, so the added term L̂ ⊙ R̂ brightens without scaling up local contrast, and the result looks flat.', 'numbers'),
  p(`We address these with two modules designed for the micro regime. **GIC** is an image-level FiLM-style ${c('perez2018film')} conditioner driven by tone-mapping statistics of the analytic prior stacks. **ARMG** is a pixel-wise modulation driven by a parameter-free single-scale Retinex ${c('jobson1997ssr')} reflectance map. Our contributions are:`),
  bullet('two zero-initialised modules that cost 238 parameters at Nano scale and leave the baseline function intact at initialisation;'),
  bullet('Nano-GA (934 parameters) and Micro-GA (8,890 parameters), which improve on Multinex-Nano\'s PSNR and SSIM on all three LOL benchmarks under the released training recipe;'),
  bullet('a transparent evaluation. It re-evaluates the released baseline checkpoints with identical code and discusses where the method does *not* yet help (unpaired benchmarks).'),
);

// ------------------------------------------------------------------ 2 related
add(
  h1('2. Related Work'),
  p(`**Retinex-based enhancement.** Retinex theory ${c('land1971retinex')} models an image as reflectance times illumination. Classical single- and multi-scale Retinex ${c('jobson1997ssr', 'jobson1997msr')} estimate reflectance as log I − log(G * I), and LIME ${c('guo2017lime')} refines a max-channel illumination map. Deep Retinex models learn the decomposition ${c('wei2018retinexnet')} or its residual correction ${c('cai2023retinexformer')}. Multinex ${c('brateanu2026multinex')} replaces a single learned decomposition with fusion over multiple analytic colour representations. We reuse the classical SSR estimate as a free guidance signal rather than as the output.`),
  p(`**Lightweight and micro LLIE.** Zero-DCE ${c('guo2020zerodce')} predicts pixel-wise curves with 79K parameters. RUAS ${c('liu2021ruas')} searches Retinex-inspired unrolled architectures (3.4K). SCI ${c('ma2022sci')} learns self-calibrated illumination (0.26K at inference). RSFNet ${c('ouyang2023rsfnet')} applies region-specific colour filters (2.1K). LYT-Net ${c('brateanu2025lytnet')} and Multinex (44.6K) target the lightweight regime. To our knowledge, Multinex-Nano (0.7K) is the strongest published micro model on LOL, and we build on it directly.`),
  p(`**Feature conditioning.** Squeeze-and-excitation ${c('hu2018se')} rescales channels from pooled features, and FiLM ${c('perez2018film')} applies feature-wise affine transforms predicted from a conditioning input. GIC is a FiLM layer whose conditioning input is a handful of interpretable photometric statistics rather than learned features. The log-average luminance comes from tone mapping ${c('reinhard2002tone')}, and the chrominance means implement the gray-world assumption ${c('buchsbaum1980grayworld')}.`),
);

// ------------------------------------------------------------------ 3 method
add(
  h1('3. Method'),
  ...figure('fig_architecture.png', 6.2, 'Figure 1. Multinex-GA. Each branch (illumination, top; chrominance, bottom) follows Multinex-Nano: analytic prior stack, 1×1 stem with channel-wise attention (CWA), fusion blocks and a 1×1 head. GIC (orange) applies an image-level affine transform before the fusion blocks; ARMG (green) applies pixel-wise modulation after them. The output keeps the Retinex residual form Î = I + L̂ ⊙ R̂.'),
  h2('3.1 Preliminaries: Multinex-Nano'),
  p('Given an RGB input I ∈ [0,1]^{3×H×W}, Multinex computes two prior stacks:'),
  bullet('**Illumination stack S_L** (K_L = 4): Rec.709 luma, max-channel value, HSL lightness and the RGB L2 norm.'),
  bullet('**Chrominance stack S_R** (K_R = 5): Cb, Cr, chromaticities r and g, and HSV saturation.'),
  p('Each branch b ∈ {L, R} computes'),
  equation('F_b = Stem_b(S_b) ⊙ σ(Proj_b(DW_{7×7}(S_b)))', 1),
  p('processes F_b with T fusion blocks (depthwise-separable conv + BN + ReLU, followed by an MSEF block) and decodes it with a 1×1 head into L̂ (1 channel) or R̂ (3 channels). The output is Î = I + L̂ ⊙ R̂. Multinex-Nano uses width C = 3 and T = 1, for 696 parameters.'),
  h2('3.2 Global Illumination Conditioner (GIC)'),
  p('GIC computes a global descriptor from the prior stacks, which are already computed, so it costs no extra feature extraction:'),
  equation('d(I) = [ μ(S_L), sd(S_L), μ(log(S_L + ε)), μ(S_R) ] ∈ ℝ^D,   D = 3K_L + K_R', 2),
  p(`Here μ and sd are the spatial mean and standard deviation of each map. The log-mean of each illumination map is the log-average luminance, or "key", that tone operators ${c('reinhard2002tone')} use to decide how much to expose an image. The standard deviation separates uniformly dark scenes from high-contrast ones, and the chrominance means are a gray-world estimate of the illuminant colour ${c('buchsbaum1980grayworld')}. A two-layer MLP with SiLU predicts per-channel parameters for both branches, and each branch is conditioned as`),
  equation('(g_b, β_b) = W_2 · SiLU(W_1 d(I) + c_1) + c_2', 3),
  equation('GIC(F_b) = F_b ⊙ (1 + tanh g_b) + β_b', 4),
  p('The scale 1 + tanh g_b ∈ (0, 2) can attenuate or amplify a channel but never flip its sign. GIC is applied before the fusion blocks, so the blocks process exposure-normalised features.'),
  h2('3.3 Adaptive Reflectance Modulation Guidance (ARMG)'),
  p(`ARMG supplies the spatial detail that the smooth corrections lack. Its guidance is the classical single-scale Retinex reflectance ${c('jobson1997ssr')}, computed per RGB channel with a k×k box filter:`),
  equation('G_c = log(I_c + ε_r) − log(Box_k(I_c) + ε_r),   c ∈ {r, g, b}', 5),
  p('Up to ε_r, G is invariant to a global gain on I. It responds to local texture and edges equally in dark and bright regions and has no parameters. A light network (depthwise 3×3, pointwise 3→h, SiLU and a pointwise head) predicts pixel-wise maps for both branches:'),
  equation('(m_b, a_b) = Head(SiLU(PW(DW(G))))', 6),
  equation('ARMG(F_b) = F_b ⊙ (1 + tanh m_b) + a_b', 7),
  p('This is the multiplicative-plus-additive form F·M + A. ARMG is applied *after* the fusion blocks, where detail would otherwise already be smoothed, so local structure steers the features immediately before decoding.'),
  h2('3.4 Identity initialisation and budget'),
  p('The output layers of GIC (W_2, c_2) and of the ARMG head are zero-initialised. At step 0, therefore, GIC = ARMG = identity, and Multinex-GA computes exactly the Multinex-Nano function. We verified this numerically against the released checkpoint (maximum deviation < 10⁻⁶). The new modules thus cannot hurt at initialisation; they only learn a residual on top of the baseline. All other layers are initialised as in the baseline under the same seed. At Nano width, GIC adds 132 parameters and ARMG 106.'),
  p('**Variants.** *Nano-GA* keeps every Multinex-Nano hyperparameter (C = 3, T = 1, SE reduction 3) and uses hidden widths h = 4, for 934 parameters. *Micro-GA* widens to C = 20, uses T = 3 fusion blocks per branch, SE reduction 4 and h = 8, for 8,890 parameters. This is inside the micro regime (<10K) defined in ' + c('brateanu2026multinex') + '.'),
);

// ------------------------------------------------------------------ 4 experiments
add(
  h1('4. Experiments'),
  h2('4.1 Setup'),
  p(`**Data.** We use LOL-v1 ${c('wei2018retinexnet')} (485/15 train/test pairs) and LOL-v2-real/synthetic ${c('yang2021lolv2')} (689/100 and 900/100). Unpaired generalisation is measured on MEF ${c('ma2015mef')} (17 images), LIME ${c('guo2017lime')} (10), DICM ${c('lee2013dicm')} (64) and NPE ${c('wang2013npe')} (8).`),
  p('**Training.** To isolate the effect of the architecture, both variants reuse the released Multinex-Nano training configuration unchanged:'),
  bullet(`Adam ${c('kingma2015adam')} with an initial learning rate of 4×10⁻⁴ and a two-cycle cosine-restart schedule ${c('loshchilov2017sgdr')}: 40K iterations to 3×10⁻⁴, then 60K to 10⁻⁶, for 100K iterations in total.`),
  bullet(`Batch 8 with 256×256 crops, flip/rotation augmentation and mixup ${c('zhang2018mixup')}.`),
  bullet('Gradient-norm clipping at 0.01.'),
  bullet(`Loss L = L_{MSE} + 0.2 L_{MS-SSIM} + 0.01 L_{VGG} ${c('wang2003msssim', 'simonyan2015vgg')}.`),
  bullet('Seed 100.'),
  p(`One model is trained per LOL split. Following the official implementation, the reported checkpoint is the one with the best PSNR on the split's evaluation set, the same protocol behind the published baseline (Sec. 6). The implementation uses PyTorch ${c('paszke2019pytorch')}. All models were trained on a single NVIDIA H100, with three runs sharing one GPU concurrently, taking 2.4 h (Nano-GA) and 4.3 h (Micro-GA) of wall-clock time.`),
  p(`**Metrics.** Following ${c('brateanu2026multinex')}, the paired benchmarks use PSNR, SSIM ${c('wang2004ssim')} and LPIPS-Alex ${c('zhang2018lpips')}, on full-resolution RGB without GT-mean correction. The unpaired benchmarks use NIQE ${c('mittal2013niqe')} and BRISQUE ${c('mittal2012brisque')}, computed with the released evaluation script (BRISQUE via piq). Complexity is reported as parameters and GFLOPs (thop multiply-accumulates at 3×256×256, which reproduces the paper's 0.04 GFLOPs for Multinex-Nano), plus median GPU latency at 600×400.`),
  p('**Baseline verification.** Re-evaluating the released Multinex-Nano checkpoints with our pipeline reproduces the published LOL numbers to within 0.01 dB (Table 1), so the paired comparison is exact. For the unpaired metrics, our BRISQUE values for the released checkpoints are 3–6 points higher than published; we traced this to resolution-dependent preprocessing in the metric setup. We therefore compare unpaired scores only against the *released checkpoints re-scored with the same code*.'),

  h2('4.2 Results on paired benchmarks'),
  p('**Table 1.** Paired benchmarks (PSNR↑ / SSIM↑ / LPIPS↓). Competitor rows are from ' + c('brateanu2026multinex') + ', Table 1. ‡ = released checkpoint re-evaluated with our pipeline; § = Multinex-Nano retrained by us with the released configuration (LOL-v1 only). Bold marks the best micro value.', { run: { size: 19 }, align: AlignmentType.LEFT }),
  table([
    ['Model', 'Params', 'GFLOPs', 'LOL-v1', 'LOL-v2-real', 'LOL-v2-syn'],
    ['SCI', '0.26K', '0.06', '14.78 / 0.525 / 0.327', '17.30 / 0.540 / 0.294', '15.43 / 0.744 / 0.203'],
    ['RSFNet', '2.11K', '–', '19.39 / 0.745 / 0.278', '19.46 / 0.745 / 0.278', '17.18 / 0.817 / 0.159'],
    ['RUAS', '3.43K', '0.83', '16.40 / 0.503 / 0.303', '15.33 / 0.493 / 0.325', '13.40 / 0.640 / 0.365'],
    ['Multinex-Nano', '0.69K', '0.04', '19.42 / 0.742 / 0.276', '19.66 / 0.784 / 0.266', '21.05 / 0.882 / 0.143'],
    ['Multinex-Nano ‡', '0.69K', '0.04', '19.42 / 0.742 / 0.276', '19.66 / 0.784 / 0.266', '21.06 / 0.882 / 0.143'],
    ['Multinex-Nano §', '0.69K', '0.04', '19.61 / 0.777 / 0.253', '–', '–'],
    ['**Nano-GA (ours)**', '0.93K', '0.05', '20.41 / 0.802 / 0.213', '**21.52** / 0.811 / 0.292', '22.25 / 0.908 / 0.108'],
    ['**Micro-GA (ours)**', '8.89K', '0.44', '**21.84 / 0.825 / 0.152**', '21.49 / **0.847 / 0.161**', '**23.69 / 0.919 / 0.075**'],
    ['Multinex ‡ (lightweight ref.)', '44.6K', '2.50', '23.19 / 0.843 / 0.125', '22.96 / 0.850 / 0.179', '25.04 / 0.930 / 0.068'],
  ], [1750, 820, 880, 1859, 1859, 1858], { shadeRows: [7, 8], size: 17 }),
  spacer(),
  ...figure('fig_lol_benchmarks.png', 6.2, 'Figure 2. Paired benchmarks for Multinex-Nano and our two variants. Dot plots are used because the value axes do not start at zero.'),
  p('Table 1 and Fig. 2 summarise the paired results.'),
  bullet('**Nano-GA** improves Multinex-Nano by **+0.99, +1.86 and +1.20 dB** PSNR and **+0.060, +0.027 and +0.026** SSIM on LOL-v1, v2-real and v2-synthetic. This costs 238 extra parameters and +13% FLOPs. LPIPS improves on LOL-v1 (−23%) and v2-synthetic (−24%) but worsens on v2-real (0.292 vs. 0.266).'),
  bullet('**The gain is not a training-recipe effect.** Under the identical recipe and seed, our retrained Multinex-Nano reaches 19.61 dB on LOL-v1. Nano-GA still gains +0.80 dB, +0.025 SSIM and −0.040 LPIPS over it.'),
  bullet('**Micro-GA** is the best micro model on every metric of every split, except LOL-v2-real PSNR, where it ties Nano-GA (21.49 vs. 21.52). It improves PSNR by +2.42, +1.83 and +2.64 dB over Multinex-Nano and reduces LPIPS by 39–48%.'),
  bullet('**Against Multinex (44.6K).** With 8.9K parameters and 0.44 GFLOPs, Micro-GA closes 55–66% of the PSNR gap between Multinex-Nano and Multinex, at 20% of its parameters and 18% of its FLOPs (Fig. 3).'),
  ...figure('fig_psnr_vs_params.png', 4.4, 'Figure 3. LOL-v1 PSNR against parameter count (log scale). The shaded band is the micro regime (<10K parameters). Multinex is the released 44.6K checkpoint, re-evaluated.'),

  h2('4.3 Results on unpaired benchmarks'),
  p('**Table 2.** Unpaired benchmarks (NIQE↓ / BRISQUE↓). Rows under "same evaluation code" were all scored with identical code (piq BRISQUE), using checkpoints trained on LOL-v2-synthetic, the split used by the released no-reference command. † = the released no-reference checkpoint. Bold marks the best same-code value.', { run: { size: 19 }, align: AlignmentType.LEFT }),
  table([
    ['Model', 'MEF', 'LIME', 'DICM', 'NPE', 'Mean'],
    ['*As published (different BRISQUE setup):*', '', '', '', '', ''],
    ['Multinex-Nano', '3.49 / 15.06', '3.85 / 15.17', '3.90 / 19.97', '4.05 / 15.42', '3.82 / 16.41'],
    ['Multinex-Nano †', '3.45 / 12.55', '3.92 / 14.54', '3.65 / 17.40', '3.94 / 13.67', '3.67 / 16.05'],
    ['*Same evaluation code:*', '', '', '', '', ''],
    ['Multinex-Nano (released, v2-syn)', '3.27 / 21.76', '**3.83** / 19.24', '3.65 / 23.94', '3.97 / 19.07', '**3.68** / 21.00'],
    ['Multinex-Nano † (released)', '3.40 / 20.66', '4.11 / 19.08', '**3.60 / 21.80**', '3.85 / 17.46', '3.74 / 19.75'],
    ['**Nano-GA (ours, v2-syn)**', '**3.10 / 17.52**', '4.10 / 20.34', '3.68 / 24.84', '3.88 / 17.39', '3.69 / 20.02'],
    ['**Micro-GA (ours, v2-syn)**', '4.55 / 20.90', '3.94 / **17.90**', '**3.60** / 22.17', '**3.81 / 15.60**', '3.98 / **19.14**'],
  ], [2726, 1260, 1260, 1260, 1260, 1260], { shadeRows: [7, 8], size: 17 }),
  spacer(),
  ...figure('fig_noref_means.png', 6.2, 'Figure 4. Mean NIQE and BRISQUE over MEF, LIME, DICM and NPE (same evaluation code for all rows).'),
  p('The picture on unpaired images is mixed:'),
  bullet('**Nano-GA** matches the released v2-synthetic checkpoint in mean NIQE (3.69 vs. 3.68) and improves mean BRISQUE (20.02 vs. 21.00). It is best on MEF in both metrics.'),
  bullet('**Micro-GA** attains the best mean BRISQUE (19.14) and the best NIQE on DICM and NPE. Its mean NIQE (3.98) is hurt by a single set, MEF (4.55).'),
  bullet('**Checkpoints trained on LOL-v1 and LOL-v2-real** generalise worse for every model, including the released ones (Appendix, Table A1). For ours the gap is larger: mean NIQE 3.95–4.40, against 3.80–3.88 for the released checkpoints.'),

  h2('4.4 Efficiency'),
  p('**Table 3.** Complexity. GFLOPs are thop MACs at 256×256. Latency is the median of 200 runs at 600×400, batch 1, FP32, on one H100 of a shared node.', { run: { size: 19 }, align: AlignmentType.LEFT }),
  table([
    ['Model', 'Params', 'GFLOPs', 'Latency (ms)'],
    ['Multinex-Nano', '696', '0.0435', '0.79'],
    ['Nano-GA (ours)', '934', '0.0493', '1.03'],
    ['Micro-GA (ours)', '8,890', '0.4414', '3.22'],
    ['Multinex (reference)', '44.6K', '2.50', '–'],
  ], [3026, 2000, 2000, 2000]),
  spacer(),
  p('At Nano scale, GIC and ARMG add 34% parameters, 13% FLOPs and about 0.24 ms of latency. At this size latency is dominated by kernel launches rather than arithmetic, so a fused implementation would reduce the overhead further.'),

  h2('4.5 Ablation study'),
  todo('Train and evaluate the single-module variants, which need only config switches (use_gic / use_armg): Nano + GIC only and Nano + ARMG only, on the three LOL splits and the four unpaired sets. Also run ARMG placed before the fusion blocks (armg_position: before_blocks). Then fill in Table 4.'),
  p('**Table 4.** Ablation on LOL-v1 at Nano width (PSNR / SSIM / LPIPS).', { run: { size: 19 }, align: AlignmentType.LEFT }),
  table([
    ['GIC', 'ARMG', 'LOL-v1'],
    ['–', '–', '19.61 / 0.777 / 0.253 (retrained baseline)'],
    ['✓', '–', '[pending]'],
    ['–', '✓', '[pending]'],
    ['✓', '✓', '20.41 / 0.802 / 0.213'],
  ], [1500, 1500, 6026]),
  spacer(),
  h2('4.6 Qualitative results'),
  ...clusterFigures(),
);

// ------------------------------------------------------------------ 5-7
add(
  h1('5. Discussion'),
  p('**Why the paired gains are large for so few parameters.** At C = 3, Multinex-Nano cannot infer scene-level exposure: every pixel receives a correction based on an 11×11 neighbourhood plus a one-unit channel gate. GIC injects this information at negligible cost, since a handful of photometric statistics fully determine where an LOL image lies on the exposure axis. ARMG gives the decoding heads direct access to illumination-invariant structure, which raises SSIM on all three splits.'),
  p('**Why generalisation is mixed.** We see three plausible causes, not yet separated experimentally:'),
  numbered('**Selection bias.** Checkpoints are selected by PSNR on an LOL test split, and more expressive models can fit that split more closely at the expense of out-of-distribution behaviour.', 'numbers2'),
  numbered('**Descriptor extrapolation.** MEF, LIME, DICM and NPE contain much brighter and more varied scenes than LOL, so GIC\'s MLP sees descriptor values outside its training range, and a tiny MLP extrapolates without constraint. Micro-GA\'s MEF outlier is consistent with this.', 'numbers2'),
  numbered('**Noise in the guidance.** The SSR map amplifies sensor noise in very dark regions, and ARMG may learn LOL-specific noise statistics that do not transfer.', 'numbers2'),
  p('The single-module ablations and descriptor normalisation or clamping are the natural next experiments.'),
  h1('6. Limitations'),
  bullet('**Checkpoint selection.** Following the official implementation, checkpoints are chosen by evaluation-split PSNR (validation every 10 iterations on LOL-v1). This is optimistic for every method, including the published baseline; a held-out validation split would give unbiased estimates.'),
  bullet('**Single seed.** All numbers come from one training seed, so variance across seeds is not yet reported.'),
  bullet(`**Missing results.** The single-module ablations are pending, and the ExDark ${c('loh2019exdark')} detection benchmark of ${c('brateanu2026multinex')} was not run.`),
  bullet('**Metric reproducibility.** Our BRISQUE values do not match the published values even for released checkpoints, so absolute BRISQUE numbers are comparable only within this paper.'),
  h1('7. Conclusion'),
  p('We introduced two plug-in modules for micro-scale Retinex enhancement: GIC, a global photometric FiLM conditioner, and ARMG, a reflectance-guided pixel-wise modulator. Both are zero-initialised and cost a few hundred parameters. Adding them to Multinex-Nano raises PSNR by 1.0–1.9 dB, and SSIM on all LOL benchmarks, with fewer than a thousand parameters. A widened 8.9K-parameter variant becomes the strongest micro model on every paired metric but one (LOL-v2-real PSNR, where it trails Nano-GA by 0.03 dB). The immediate next steps are improving unpaired generalisation, completing the ablations, and adding multi-seed and detection results.'),
  p('**Acknowledgements and licence.** This work builds on the Multinex code and models, which are released for non-commercial research and educational use. All experiments here are non-commercial and educational.'),
);

// ------------------------------------------------------------------ references
add(h1('References'));
order.forEach((k, i) => add(new Paragraph({
  spacing: { after: 60 },
  indent: { left: 440, hanging: 440 },
  children: [new TextRun({ text: `[${i + 1}]\t${REFS[k]}`, size: 18 })],
  tabStops: [{ type: 'left', position: 440 }],
})));

// ------------------------------------------------------------------ appendix
add(
  h1('Appendix A. All unpaired results'),
  p('**Table A1.** NIQE / BRISQUE for every checkpoint, by training split (same evaluation code).', { run: { size: 19 }, align: AlignmentType.LEFT }),
  table([
    ['Model', 'Trained on', 'MEF', 'LIME', 'DICM', 'NPE', 'Mean'],
    ['Nano (released)', 'LOL-v1', '3.43 / 27.49', '4.13 / 22.04', '3.69 / 27.40', '4.28 / 31.00', '3.88 / 26.98'],
    ['Nano (released)', 'LOL-v2-real', '3.53 / 28.34', '4.00 / 22.43', '3.63 / 24.77', '4.03 / 23.30', '3.80 / 24.71'],
    ['Nano (released)', 'LOL-v2-syn', '3.27 / 21.76', '3.83 / 19.24', '3.65 / 23.94', '3.97 / 19.07', '3.68 / 21.00'],
    ['Nano † (released)', 'NoRef', '3.40 / 20.66', '4.11 / 19.08', '3.60 / 21.80', '3.85 / 17.46', '3.74 / 19.75'],
    ['Nano-GA', 'LOL-v1', '4.37 / 27.99', '4.34 / 19.58', '4.18 / 23.69', '4.58 / 21.57', '4.37 / 23.21'],
    ['Nano-GA', 'LOL-v2-real', '4.34 / 32.03', '5.02 / 30.56', '3.98 / 25.08', '4.27 / 22.20', '4.40 / 27.47'],
    ['Nano-GA', 'LOL-v2-syn', '3.10 / 17.52', '4.10 / 20.34', '3.68 / 24.84', '3.88 / 17.39', '3.69 / 20.02'],
    ['Micro-GA', 'LOL-v1', '3.81 / 30.43', '4.14 / 24.10', '3.72 / 25.53', '4.12 / 24.11', '3.95 / 26.04'],
    ['Micro-GA', 'LOL-v2-real', '3.86 / 30.82', '4.73 / 32.34', '3.95 / 29.27', '4.55 / 33.29', '4.27 / 31.43'],
    ['Micro-GA', 'LOL-v2-syn', '4.55 / 20.90', '3.94 / 17.90', '3.60 / 22.17', '3.81 / 15.60', '3.98 / 19.14'],
  ], [1500, 1150, 1275, 1275, 1275, 1275, 1276], { size: 16 }),
  spacer(),
  h1('Appendix B. Implementation details'),
  table([
    ['', 'Nano-GA', 'Micro-GA'],
    ['Width C / fusion blocks T', '3 / 1', '20 / 3'],
    ['MSEF SE reduction', '3', '4'],
    ['GIC hidden width / ε', '4 / 10⁻³', '8 / 10⁻³'],
    ['ARMG hidden width / box k / ε_r', '4 / 7 / 10⁻²', '8 / 7 / 10⁻²'],
    ['ARMG position', 'after blocks', 'after blocks'],
    ['GIC / ARMG parameters', '132 / 106', '864 / 782'],
    ['Total parameters', '934', '8,890'],
  ], [4026, 2500, 2500]),
);

const doc = new Document({
  creator: 'Multinex-GA project',
  title: 'Global Illumination Conditioning and Reflectance-Guided Modulation for Micro-Scale LLIE (draft)',
  styles: T.styles,
  numbering: T.numbering,
  sections: [{
    properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18 })] })] }) },
    children,
  }],
});

const out = path.join(__dirname, '..', 'Multinex_GIC_ARMG_Paper_Draft.docx');
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(out, buf); console.log('wrote', out, '-', order.length, 'references'); });
