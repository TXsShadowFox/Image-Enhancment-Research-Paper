"""Builds the report/paper figures from the evaluated numbers (results/eval_ga/summary.md).

    python deliverables/make_figures.py      # writes deliverables/figures/*.png
"""
import os

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'figures')
os.makedirs(OUT, exist_ok=True)

# Validated categorical slots (dataviz reference palette, light mode), fixed order.
BLUE, ORANGE, AQUA, YELLOW = '#2a78d6', '#eb6834', '#1baf7a', '#eda100'
INK, INK2, MUTED, GRID, AXIS, SURF = '#0b0b0b', '#52514e', '#898781', '#e1e0d9', '#c3c2b7', '#ffffff'

plt.rcParams.update({
    'font.family': 'DejaVu Sans', 'font.size': 9, 'axes.edgecolor': AXIS,
    'axes.labelcolor': INK2, 'xtick.color': INK2, 'ytick.color': INK2,
    'axes.spines.top': False, 'axes.spines.right': False, 'axes.grid': True,
    'grid.color': GRID, 'grid.linewidth': 0.6, 'axes.axisbelow': True,
    'figure.facecolor': SURF, 'axes.facecolor': SURF, 'savefig.dpi': 300,
    'legend.frameon': False,
})

LOL = ['LOL-v1', 'LOL-v2-real', 'LOL-v2-syn']
MODELS = {  # PSNR, SSIM, LPIPS per LOL split
    'Multinex-Nano (696 params)': ([19.42, 19.66, 21.05], [0.742, 0.784, 0.882], [0.276, 0.266, 0.143]),
    'Nano-GA, ours (934)': ([20.41, 21.52, 22.25], [0.802, 0.811, 0.908], [0.213, 0.292, 0.108]),
    'Micro-GA, ours (8,890)': ([21.84, 21.49, 23.69], [0.825, 0.847, 0.919], [0.152, 0.161, 0.075]),
}
COLORS = [BLUE, ORANGE, AQUA]


def save(fig, name):
    fig.savefig(os.path.join(OUT, name), bbox_inches='tight', facecolor=SURF)
    plt.close(fig)
    print('wrote', name)


# ---------------------------------------------------------------- LOL dots
def fig_lol():
    """Dot plot: a value axis that need not start at zero (bars would have to)."""
    fig, axes = plt.subplots(1, 3, figsize=(7.4, 2.7))
    metrics = [('PSNR (dB) ↑', 0, (18.5, 24.5)), ('SSIM ↑', 1, (0.72, 0.94)),
               ('LPIPS ↓', 2, (0.05, 0.31))]
    markers = ['o', 'D', 's']
    for ax, (title, k, ylim) in zip(axes, metrics):
        for i, (name, vals) in enumerate(MODELS.items()):
            xs = [j + (i - 1) * 0.18 for j in range(3)]
            ax.scatter(xs, vals[k], s=46, color=COLORS[i], marker=markers[i], edgecolor=SURF,
                       linewidth=1.2, label=name, zorder=3)
        ax.set_xticks(range(3), ['LOL-v1', 'v2-real', 'v2-syn'])
        ax.set_xlim(-0.5, 2.5)
        ax.set_ylim(*ylim)
        ax.set_title(title, color=INK, fontsize=9.5, loc='left')
        ax.grid(axis='x', visible=False)
        ax.tick_params(axis='x', length=0)
    handles, labels = axes[0].get_legend_handles_labels()
    fig.legend(handles, labels, loc='lower center', ncol=3, fontsize=8.5,
               handletextpad=0.3, columnspacing=1.6)
    fig.subplots_adjust(left=0.07, right=0.99, top=0.88, bottom=0.25, wspace=0.38)
    save(fig, 'fig_lol_benchmarks.png')


# ------------------------------------------------- PSNR vs params (LOL-v1)
def fig_efficiency():
    pts = [  # name, params (K), LOL-v1 PSNR, color, ours?
        ('SCI', 0.26, 14.78, MUTED, False), ('RUAS', 3.43, 16.40, MUTED, False),
        ('RSFNet', 2.11, 19.39, MUTED, False), ('Multinex-Nano', 0.69, 19.42, BLUE, False),
        ('Multinex', 44.6, 23.19, MUTED, False),
        ('Nano-GA (ours)', 0.934, 20.41, ORANGE, True), ('Micro-GA (ours)', 8.89, 21.84, AQUA, True)]
    fig, ax = plt.subplots(figsize=(4.6, 3.0))
    ax.axvspan(0.15, 10, color='#f0efec', zorder=0)
    ax.text(0.17, 23.6, 'micro regime (<10K params)', color=INK2, fontsize=8)
    ax.annotate('', xy=(0.934, 20.41), xytext=(0.69, 19.42),
                arrowprops=dict(arrowstyle='->', color=MUTED, lw=1))
    offsets = {'SCI': (6, -3), 'RUAS': (6, -3), 'RSFNet': (6, -9), 'Multinex-Nano': (-8, -12),
               'Multinex': (-14, -14), 'Nano-GA (ours)': (-32, 8), 'Micro-GA (ours)': (-30, 8)}
    for name, p, psnr, c, ours in pts:
        ax.scatter(p, psnr, s=60 if ours else 40, color=c, edgecolor=SURF, linewidth=1.5,
                   zorder=3, marker='D' if ours else 'o')
        ax.annotate(name, (p, psnr), textcoords='offset points', xytext=offsets[name],
                    fontsize=8, color=INK, fontweight='bold' if ours else 'normal')
    ax.set_xscale('log')
    ax.set_xlim(0.15, 100)
    ax.set_ylim(14, 24.5)
    ax.set_xlabel('Parameters (K, log scale)')
    ax.set_ylabel('LOL-v1 PSNR (dB)')
    fig.tight_layout()
    save(fig, 'fig_psnr_vs_params.png')


# ------------------------------------------------------- no-reference means
def fig_noref():
    rows = [  # label, mean NIQE, mean BRISQUE (piq), colour, marker
        ('Multinex-Nano (shipped, v2-syn)', 3.68, 21.00, BLUE, 'o'),
        ('Multinex-Nano† (shipped NoRef)', 3.74, 19.75, YELLOW, 'v'),
        ('Nano-GA (ours, v2-syn)', 3.69, 20.02, ORANGE, 'D'),
        ('Micro-GA (ours, v2-syn)', 3.98, 19.14, AQUA, 's')]
    fig, axes = plt.subplots(1, 2, figsize=(7.4, 2.1), sharey=True)
    ys = list(range(len(rows)))[::-1]
    for ax, k, title, xlim in ((axes[0], 1, 'Mean NIQE ↓', (3.5, 4.1)),
                               (axes[1], 2, 'Mean BRISQUE (piq) ↓', (18.5, 21.6))):
        for y, r in zip(ys, rows):
            ax.scatter(r[k], y, s=50, color=r[3], marker=r[4], edgecolor=SURF, linewidth=1.2, zorder=3)
            ax.annotate(f'{r[k]:.2f}', (r[k], y), textcoords='offset points', xytext=(8, -3),
                        fontsize=8, color=INK)
        ax.set_xlim(*xlim)
        ax.set_ylim(-0.6, len(rows) - 0.4)
        ax.set_title(title, color=INK, fontsize=9.5, loc='left')
        ax.grid(axis='y', visible=False)
        ax.tick_params(axis='y', length=0)
    axes[0].set_yticks(ys, [r[0] for r in rows], fontsize=8)
    fig.tight_layout()
    save(fig, 'fig_noref_means.png')


# ---------------------------------------------------------- architecture
def fig_architecture():
    fig, ax = plt.subplots(figsize=(8.6, 3.6))
    ax.set_xlim(0, 124)
    ax.set_ylim(0, 50)
    ax.axis('off')

    def box(x, y, w, h, text, fc='#f0efec', ec=AXIS, bold=False, fs=7.2, tc=INK):
        ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle='round,pad=0.3,rounding_size=1.2',
                                    fc=fc, ec=ec, lw=1.0))
        text = text.replace(r'\n', '\n')  # raw mathtext labels spell line breaks as \n
        ax.text(x + w / 2, y + h / 2, text, ha='center', va='center', fontsize=fs, color=tc,
                fontweight='bold' if bold else 'normal', linespacing=1.3)

    def arrow(x0, y0, x1, y1, c=INK2):
        ax.annotate('', xy=(x1, y1), xytext=(x0, y0),
                    arrowprops=dict(arrowstyle='-|>', color=c, lw=0.9, shrinkA=0, shrinkB=0,
                                    mutation_scale=8))

    GIC_FC, ARMG_FC = '#fbe1d6', '#d2f0e4'
    box(0.5, 21, 9, 8, r'Low-light\ninput $I$', bold=True)
    rows = [(35, r'Illumination priors $S_L$\nRec.709, Vmax,\nLightness, L2', r'$\hat{L}$ (1 ch)'),
            (7, r'Chrominance priors $S_R$\nCb, Cr, r, g, S', r'$\hat{R}$ (3 ch)')]
    for y, prior, head in rows:
        arrow(10, 25, 12.5, y + 4)
        box(13, y, 18, 8, prior, fs=6.6)
        arrow(31.6, y + 4, 33.6, y + 4)
        box(34, y, 11, 8, 'Stem 1×1\n⊙ CWA')
        arrow(45.6, y + 4, 47.6, y + 4)
        box(48, y, 11, 8, r'GIC\n$F\cdot\gamma+\beta$', fc=GIC_FC, ec=ORANGE, bold=True)
        arrow(59.6, y + 4, 61.6, y + 4)
        box(62, y, 15, 8, 'Fusion blocks ×T\nDSConv + MSEF')
        arrow(77.6, y + 4, 79.6, y + 4)
        box(80, y, 11, 8, r'ARMG\n$F\cdot M+A$', fc=ARMG_FC, ec=AQUA, bold=True)
        arrow(91.6, y + 4, 93.6, y + 4)
        box(94, y, 10, 8, 'Head 1×1\n' + head, fs=7)
        arrow(104.6, y + 4, 108.6, 25)
    box(109, 20.5, 14.5, 9, r'$\hat{I} = I + \hat{L}\odot\hat{R}$\nenhanced', bold=True)

    box(45.5, 22, 16, 6, r'global stats $d(I)$\nmean · std · log-mean', fc='#fdf2ec', ec=ORANGE, fs=6.4)
    arrow(53.5, 28.4, 53.5, 34.6, ORANGE)
    arrow(53.5, 21.6, 53.5, 15.4, ORANGE)
    box(77.5, 22, 16, 6, r'Retinex guidance\n$\log I-\log \mathrm{Blur}(I)$', fc='#eaf7f1', ec=AQUA, fs=6.4)
    arrow(85.5, 28.4, 85.5, 34.6, AQUA)
    arrow(85.5, 21.6, 85.5, 15.4, AQUA)

    ax.text(53.5, 47, r'GIC: image-level $(\gamma,\beta)$' + '\nper channel', ha='center', fontsize=7,
            color='#b4461b', linespacing=1.2)
    ax.text(85.5, 47, 'ARMG: pixel-wise $(M, A)$\nmaps', ha='center', fontsize=7,
            color='#0f7a54', linespacing=1.2)
    save(fig, 'fig_architecture.png')


if __name__ == '__main__':
    fig_architecture()
    fig_lol()
    fig_efficiency()
    fig_noref()
