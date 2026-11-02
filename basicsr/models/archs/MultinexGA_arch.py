# Multinex-GA: Multinex-Nano extended with
#   GIC  - Global Illumination Conditioner       (F' = gamma(I) * F + beta(I))
#   ARMG - Adaptive Reflectance Modulation Guidance (F' = F * M + A)
#
# Built on Multinex (Brateanu et al., CVPR 2026), which is licensed for
# non-commercial research and educational use only. See LICENSE for details.

from typing import Dict, List, Optional, Sequence

import torch
import torch.nn as nn
import torch.nn.functional as F

from basicsr.models.archs.MultinexNano_arch import MultinexNano


def _zero_init(layer: nn.Module) -> None:
    nn.init.zeros_(layer.weight)
    if layer.bias is not None:
        nn.init.zeros_(layer.bias)


def _modulate(feats: Sequence[torch.Tensor], params: torch.Tensor) -> List[torch.Tensor]:
    """Applies F * (1 + tanh(m)) + a to each feature map.

    `params` holds [m_0, a_0, m_1, a_1, ...] stacked on dim 1, each with as many
    channels as the matching feature map. The scale is bounded to (0, 2) so the
    conditioning can attenuate or amplify a channel but never flip its sign, and
    zero parameters give the identity.
    """
    chunks = params.chunk(2 * len(feats), dim=1)
    return [f * (1.0 + torch.tanh(chunks[2 * i])) + chunks[2 * i + 1]
            for i, f in enumerate(feats)]


class GlobalIlluminationConditioner(nn.Module):
    """GIC: image-level FiLM conditioning on global illumination statistics.

    Compact networks have a small receptive field, so each pixel sees too little of
    the image to judge how much exposure correction the image as a whole needs.
    GIC summarises the illumination prior stack into a global descriptor and maps
    it to per-channel (gamma, beta) for every branch:
        - per illumination map: mean, standard deviation and log-mean (the
          log-average luminance used as the key value in tone mapping), which
          separate underexposed, high-contrast and well-lit inputs;
        - per chrominance map: mean (gray-world estimate of the illuminant colour).

    The output layer is zero-initialised, so at initialisation the module is the
    identity and the network starts from plain Multinex-Nano.
    """

    def __init__(self, k_illum: int, k_chroma: int, channels: Sequence[int],
                 hidden: int = 4, eps: float = 1e-3):
        super().__init__()
        self.channels = list(channels)
        self.eps = eps
        in_dim = 3 * k_illum + k_chroma
        self.fc1 = nn.Linear(in_dim, hidden)
        self.act = nn.SiLU()
        self.fc2 = nn.Linear(hidden, 2 * sum(self.channels))
        _zero_init(self.fc2)

    def descriptor(self, illum: torch.Tensor, chroma: torch.Tensor) -> torch.Tensor:
        illum = illum.float()
        mean = illum.mean(dim=(2, 3))
        std = illum.std(dim=(2, 3), unbiased=False)
        log_mean = torch.log(illum.clamp_min(0.0) + self.eps).mean(dim=(2, 3))
        chroma_mean = chroma.float().mean(dim=(2, 3))
        return torch.cat([mean, std, log_mean, chroma_mean], dim=1)

    def forward(self, illum: torch.Tensor, chroma: torch.Tensor,
                feats: Sequence[torch.Tensor]) -> List[torch.Tensor]:
        d = self.descriptor(illum, chroma)
        params = self.fc2(self.act(self.fc1(d))).to(feats[0].dtype)
        return _modulate(feats, params[:, :, None, None])


class ReflectanceGuidance(nn.Module):
    """Parameter-free reflectance prior: single-scale Retinex per RGB channel.

        R_c = log(I_c + eps) - log(Blur_k(I_c) + eps)

    Dividing out the locally smoothed illumination (a difference in the log
    domain) leaves an illumination-invariant map of local texture and edges, so
    the guidance is equally informative in dark and bright regions.
    """

    def __init__(self, kernel_size: int = 7, eps: float = 1e-2):
        super().__init__()
        if kernel_size % 2 != 1:
            raise ValueError(f'kernel_size must be odd, got {kernel_size}')
        self.eps = eps
        self.blur = nn.AvgPool2d(kernel_size, stride=1, padding=kernel_size // 2,
                                 count_include_pad=False)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = x.float().clamp_min(0.0)
        return torch.log(x + self.eps) - torch.log(self.blur(x) + self.eps)


class AdaptiveReflectanceModulation(nn.Module):
    """ARMG: pixel-wise modulation F * M + A driven by the reflectance prior.

    Brightening a low-light image tends to wash out texture because the learned
    luminance/chroma corrections are spatially smooth. ARMG predicts a
    multiplicative map M and an additive map A for each branch from the
    reflectance guidance, letting local structure steer the features right before
    they are decoded into the Retinex correction. Zero-initialised output, so the
    module starts as the identity.
    """

    def __init__(self, channels: Sequence[int], hidden: int = 4,
                 kernel_size: int = 7, eps: float = 1e-2):
        super().__init__()
        self.channels = list(channels)
        self.guidance = ReflectanceGuidance(kernel_size, eps)
        self.dw = nn.Conv2d(3, 3, 3, padding=1, groups=3, bias=True)
        self.pw = nn.Conv2d(3, hidden, 1, bias=True)
        self.act = nn.SiLU()
        self.head = nn.Conv2d(hidden, 2 * sum(self.channels), 1, bias=True)
        _zero_init(self.head)

    def forward(self, x: torch.Tensor, feats: Sequence[torch.Tensor]) -> List[torch.Tensor]:
        g = self.guidance(x).to(feats[0].dtype)
        params = self.head(self.act(self.pw(self.dw(g))))
        return _modulate(feats, params)


class MultinexGA(MultinexNano):
    """MultinexNano with optional GIC and ARMG.

    Data flow per branch (illumination / chrominance):
        priors -> stem -> CWA -> [GIC] -> fusion blocks -> [ARMG] -> head
    then out = I + L_hat * R_hat, unchanged from Multinex.

    GIC sits before the fusion blocks so they process exposure-normalised
    features. ARMG sits after them by default ('after_blocks'), because the
    blocks are where spatial detail gets smoothed; 'before_blocks' places it
    next to GIC instead.

    All MultinexNano arguments are accepted unchanged. With use_gic and use_armg
    both false the forward pass and state dict match MultinexNano exactly.
    """

    ARMG_POSITIONS = ('after_blocks', 'before_blocks')

    def __init__(self,
                 *args,
                 use_gic: bool = True,
                 gic_hidden: int = 4,
                 gic_eps: float = 1e-3,
                 use_armg: bool = True,
                 armg_hidden: int = 4,
                 armg_kernel: int = 7,
                 armg_eps: float = 1e-2,
                 armg_position: str = 'after_blocks',
                 **kwargs):
        super().__init__(*args, **kwargs)
        if armg_position not in self.ARMG_POSITIONS:
            raise ValueError(f'armg_position must be one of {self.ARMG_POSITIONS}, '
                             f'got {armg_position!r}')
        self.armg_position = armg_position

        # Built after the parent so its (possibly budget-fitted) width self.C is
        # final, and so the parent's layers get the same random init as plain
        # MultinexNano under the same seed.
        channels = (self.C, self.C)
        self.gic = (GlobalIlluminationConditioner(self.K_L, self.K_C, channels,
                                                  gic_hidden, gic_eps)
                    if use_gic else None)
        self.armg = (AdaptiveReflectanceModulation(channels, armg_hidden,
                                                   armg_kernel, armg_eps)
                     if use_armg else None)

    def _attend(self, feat, stack, att, proj):
        mask = torch.sigmoid(self._att_project_to_C(att(stack), proj))
        return feat * mask

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        B, _, H, W = x.shape

        L_stack = self.illum_extractor(x)
        if L_stack.shape[1] == 0:
            L_stack = x.new_zeros(B, 1, H, W)
        C_stack = self.chroma_extractor(x)
        if C_stack.shape[1] == 0:
            C_stack = x.new_zeros(B, 1, H, W)

        fL = self.illum_stem(L_stack)
        fC = self.chroma_stem(C_stack)
        if self.use_illum_attn:
            fL = self._attend(fL, L_stack, self.illum_att, self.illum_att_proj)
        if self.use_chroma_attn:
            fC = self._attend(fC, C_stack, self.chroma_att, self.chroma_att_proj)

        if self.gic is not None:
            fL, fC = self.gic(L_stack, C_stack, (fL, fC))
        if self.armg is not None and self.armg_position == 'before_blocks':
            fL, fC = self.armg(x, (fL, fC))

        fL = self.illum_mid_seq(fL)
        fC = self.chroma_mid_seq(fC)

        if self.armg is not None and self.armg_position == 'after_blocks':
            fL, fC = self.armg(x, (fL, fC))

        L_hat = self._apply_head_act(self.head_luma(fL), self.luma_head_act)
        C_hat = self._apply_head_act(self.head_chroma(fC), self.chroma_head_act)

        out = C_hat * L_hat
        if self.retinex_residual:
            out = out + x
        return out
