"""Correctness checks for MultinexGA (GIC + ARMG).

Run from the repo root:  python -m pytest tests/test_multinex_ga.py -q
"""
import copy
import os

import pytest
import torch
import yaml

from basicsr.models.archs.MultinexGA_arch import MultinexGA
from basicsr.models.archs.MultinexNano_arch import MultinexNano

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASETS = ('LOL-v1', 'LOL-v2-real', 'LOL-v2-synthetic')
MICRO_BUDGET = 10_000  # paper's "micro" regime: fewer than 10K parameters


def _net_opt(cfg):
    with open(os.path.join(ROOT, 'Options', f'{cfg}.yaml'), encoding='utf-8') as f:
        opt = yaml.safe_load(f)['network_g']
    opt.pop('type')
    return opt


def _build(cls, cfg, **overrides):
    torch.manual_seed(0)
    opt = _net_opt(cfg)
    opt.update(overrides)
    return cls(**opt).eval()


def _n_params(m):
    return sum(p.numel() for p in m.parameters() if p.requires_grad)


def _randomise(module):
    """Gives zero-initialised layers non-zero weights so modulation is active."""
    torch.manual_seed(1)
    with torch.no_grad():
        for p in module.parameters():
            p.normal_(0.0, 0.3)


def _shipped_nano_state():
    path = os.path.join(ROOT, 'pretrained_weights', 'Multinex-Nano_LOL-v1.pth')
    return torch.load(path, map_location='cpu', weights_only=True)['params']


@pytest.fixture
def low_light():
    torch.manual_seed(2)
    return torch.rand(2, 3, 67, 93) * 0.15  # odd size, dark like LOL inputs


@pytest.mark.parametrize('ds', DATASETS)
def test_param_budgets(ds):
    nano = _build(MultinexGA, f'MultinexGA-Nano_{ds}')
    micro = _build(MultinexGA, f'MultinexGA-Micro_{ds}')
    base = _build(MultinexNano, f'Multinex-Nano_{ds}')
    assert _n_params(base) == 696
    assert nano.C == base.C == 3, 'Nano-GA must keep the exact Nano width'
    assert _n_params(nano) == 934
    assert _n_params(micro) == 8890
    assert _n_params(micro) < MICRO_BUDGET


def test_disabled_modules_reproduce_multinex_nano(low_light):
    """With GIC and ARMG off, MultinexGA is MultinexNano: same keys, same output."""
    state = _shipped_nano_state()
    base = _build(MultinexNano, 'Multinex-Nano_LOL-v1')
    ga = _build(MultinexGA, 'MultinexGA-Nano_LOL-v1', use_gic=False, use_armg=False)
    base.load_state_dict(state, strict=True)
    ga.load_state_dict(state, strict=True)
    with torch.no_grad():
        torch.testing.assert_close(ga(low_light), base(low_light), rtol=0, atol=0)


@pytest.mark.parametrize('position', MultinexGA.ARMG_POSITIONS)
def test_identity_at_init(low_light, position):
    """Zero-initialised GIC/ARMG heads leave the pretrained Nano function unchanged."""
    state = _shipped_nano_state()
    base = _build(MultinexNano, 'Multinex-Nano_LOL-v1')
    ga = _build(MultinexGA, 'MultinexGA-Nano_LOL-v1', armg_position=position)
    base.load_state_dict(state, strict=True)
    missing, unexpected = ga.load_state_dict(state, strict=False)
    assert not unexpected
    assert all(k.startswith(('gic.', 'armg.')) for k in missing)
    with torch.no_grad():
        torch.testing.assert_close(ga(low_light), base(low_light), rtol=0, atol=1e-6)


@pytest.mark.parametrize('cfg', ['MultinexGA-Nano_LOL-v1', 'MultinexGA-Micro_LOL-v1'])
def test_gradients_reach_new_modules(low_light, cfg):
    ga = _build(MultinexGA, cfg).train()
    out = ga(low_light)
    out.square().mean().backward()
    # Zero-initialised output layers receive gradient immediately ...
    assert ga.gic.fc2.weight.grad.abs().sum() > 0
    assert ga.armg.head.weight.grad.abs().sum() > 0
    # ... and after one step the hidden layers do too.
    ga.zero_grad()
    with torch.no_grad():
        ga.gic.fc2.weight.add_(0.01)
        ga.armg.head.weight.add_(0.01)
    ga(low_light).square().mean().backward()
    assert ga.gic.fc1.weight.grad.abs().sum() > 0
    assert ga.armg.dw.weight.grad.abs().sum() > 0
    assert all(torch.isfinite(p.grad).all() for p in ga.parameters() if p.grad is not None)


@pytest.mark.parametrize('cfg', ['MultinexGA-Nano_LOL-v1', 'MultinexGA-Micro_LOL-v1'])
def test_samples_are_independent(low_light, cfg):
    """GIC statistics are per image: batching must not leak across samples."""
    ga = _build(MultinexGA, cfg)
    _randomise(ga.gic)
    _randomise(ga.armg)
    with torch.no_grad():
        batched = ga(low_light)
        single = torch.cat([ga(low_light[i:i + 1]) for i in range(low_light.shape[0])])
    assert batched.shape == low_light.shape
    torch.testing.assert_close(batched, single, rtol=1e-5, atol=1e-6)


def test_gic_responds_to_global_exposure():
    """The same scene at two exposures must receive different conditioning."""
    ga = _build(MultinexGA, 'MultinexGA-Nano_LOL-v1')
    _randomise(ga.gic)
    torch.manual_seed(3)
    scene = torch.rand(1, 3, 32, 32)
    dark, bright = scene * 0.05, scene * 0.8
    with torch.no_grad():
        d_dark = ga.gic.descriptor(ga.illum_extractor(dark), ga.chroma_extractor(dark))
        d_bright = ga.gic.descriptor(ga.illum_extractor(bright), ga.chroma_extractor(bright))
    assert not torch.allclose(d_dark, d_bright)
    # Chromaticity-type chroma maps (r, g, S) are exposure invariant, so the
    # difference must come from the illumination statistics.
    k = ga.K_L
    assert (d_dark[:, :3 * k] - d_bright[:, :3 * k]).abs().max() > 0.1


def test_reflectance_guidance_is_illumination_invariant():
    """Single-scale Retinex guidance ignores a global gain (up to eps effects)."""
    ga = _build(MultinexGA, 'MultinexGA-Nano_LOL-v1', armg_eps=1e-6)
    torch.manual_seed(4)
    scene = torch.rand(1, 3, 40, 40) * 0.5 + 0.25
    with torch.no_grad():
        g1 = ga.armg.guidance(scene)
        g2 = ga.armg.guidance(scene * 0.1)
    torch.testing.assert_close(g1, g2, rtol=0, atol=1e-4)


def test_invalid_armg_position():
    with pytest.raises(ValueError):
        _build(MultinexGA, 'MultinexGA-Nano_LOL-v1', armg_position='middle')


def test_extreme_inputs_are_finite():
    ga = _build(MultinexGA, 'MultinexGA-Micro_LOL-v1')
    _randomise(ga.gic)
    _randomise(ga.armg)
    with torch.no_grad():
        for x in (torch.zeros(1, 3, 16, 16), torch.ones(1, 3, 16, 16)):
            assert torch.isfinite(ga(x)).all()


def test_full_model_wrapper_loads_config():
    """The configs build through BasicSR's registry, as train.py/test.py do."""
    from basicsr.models.archs import define_network
    for ds in DATASETS:
        for v in ('Nano', 'Micro'):
            cfg = f'MultinexGA-{v}_{ds}'
            opt = _net_opt(cfg)
            opt['type'] = 'MultinexGA'
            net = define_network(copy.deepcopy(opt))
            assert isinstance(net, MultinexGA)
