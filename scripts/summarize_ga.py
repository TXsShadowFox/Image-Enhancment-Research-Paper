"""Collects the outputs of jobs/eval_ga.pbs into one Markdown report.

    python scripts/summarize_ga.py --logs logs/eval_ga --results results/eval_ga --out results/eval_ga/summary.md
"""
import argparse
import json
import os
import re

LOL = ('LOL-v1', 'LOL-v2-real', 'LOL-v2-synthetic')
NOREF = ('MEF', 'LIME', 'DICM', 'NPE')  # column order of the paper's Table 2

# Multinex-Nano rows of the paper (arXiv 2604.10359v3), Tables 1 and 2.
PAPER_LOL = {'LOL-v1': (19.42, 0.742, 0.276),
             'LOL-v2-real': (19.66, 0.784, 0.266),
             'LOL-v2-synthetic': (21.05, 0.882, 0.143)}
PAPER_NOREF = {'Nano': {'MEF': (3.49, 15.06), 'LIME': (3.85, 15.17),
                        'DICM': (3.90, 19.97), 'NPE': (4.05, 15.42)},
               'Nano-dagger': {'MEF': (3.45, 12.55), 'LIME': (3.92, 14.54),
                               'DICM': (3.65, 17.40), 'NPE': (3.94, 13.67)}}

ROWS = (('Nano-shipped', 'Multinex-Nano (shipped ckpt, re-evaluated)'),
        ('GA-Nano', 'Multinex-Nano + GIC + ARMG (ours)'),
        ('GA-Micro', 'Multinex-Micro + GIC + ARMG (ours)'))


def parse_lol(path):
    if not os.path.exists(path):
        return None
    text = open(path, encoding='utf-8', errors='replace').read()
    vals = []
    for pat in (r'RGB  - PSNR: ([\d.]+)', r'RGB  - SSIM: ([\d.]+)', r'LPIPS \(alex\): ([\d.]+)'):
        m = re.search(pat, text)
        if not m:
            return None
        vals.append(float(m.group(1)))
    return tuple(vals)


def parse_noref(path):
    if not os.path.exists(path):
        return None
    with open(path, encoding='utf-8') as f:
        report = json.load(f)
    return {d['dataset']: (d['avg_niqe'], d['avg_brisque']) for d in report['datasets']}


def mean_of(scores):
    if scores is None or any(k not in scores for k in NOREF):
        return None
    return tuple(sum(scores[k][i] for k in NOREF) / len(NOREF) for i in range(2))


def fmt(v, nd):
    return '–' if v is None else f'{v:.{nd}f}'


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--logs', default='logs/eval_ga')
    p.add_argument('--results', default='results/eval_ga')
    p.add_argument('--out', default='results/eval_ga/summary.md')
    args = p.parse_args()

    out = ['# Multinex + GIC + ARMG: evaluation summary', '']

    # ---- reference benchmarks
    out += ['## LOL benchmarks (PSNR↑ / SSIM↑ / LPIPS↓)', '',
            '| Model | ' + ' | '.join(LOL) + ' |', '|---|' + '---|' * len(LOL)]
    out.append('| Multinex-Nano (paper, Table 1) | ' + ' | '.join(
        '{:.2f} / {:.3f} / {:.3f}'.format(*PAPER_LOL[d]) for d in LOL) + ' |')
    for tag, label in ROWS:
        cells = []
        for d in LOL:
            r = parse_lol(os.path.join(args.logs, f'{tag}_{d}.log'))
            cells.append('–' if r is None else '{:.2f} / {:.3f} / {:.3f}'.format(*r))
        out.append(f'| {label} | ' + ' | '.join(cells) + ' |')

    # ---- no-reference benchmarks
    out += ['', '## No-reference benchmarks (NIQE↓ / BRISQUE↓)', '',
            'Each row is one checkpoint; "trained on" names its LOL training split.',
            'Our BRISQUE (piq) does not reproduce the paper\'s values for the shipped '
            'checkpoints, so compare our models with the re-evaluated shipped rows, not with '
            'the paper rows.', '',
            '| Model | Trained on | ' + ' | '.join(NOREF) + ' | Mean |',
            '|---|---|' + '---|' * (len(NOREF) + 1)]
    for key, label in (('Nano', 'Multinex-Nano (paper, Table 2)'),
                       ('Nano-dagger', 'Multinex-Nano† (paper, Table 2)')):
        s = PAPER_NOREF[key]
        m = mean_of(s)
        out.append(f'| {label} | ? | ' + ' | '.join(
            f'{s[k][0]:.2f} / {s[k][1]:.2f}' for k in NOREF) + f' | {m[0]:.2f} / {m[1]:.2f} |')
    splits = ('dagger',) + LOL
    for tag, label in ROWS:
        for split in splits:
            s = parse_noref(os.path.join(args.results, f'{tag}_NoRef_{split}', 'final_report.json'))
            if s is None:
                continue
            m = mean_of(s)
            cells = [f'{fmt(s.get(k, (None,))[0], 2)} / {fmt(s.get(k, (None, None))[1], 2)}'
                     for k in NOREF]
            mean_cell = '–' if m is None else f'{m[0]:.2f} / {m[1]:.2f}'
            split_label = 'NoRef† ckpt' if split == 'dagger' else split
            out.append(f'| {label} | {split_label} | ' + ' | '.join(cells) + f' | {mean_cell} |')

    # ---- complexity
    cx = os.path.join(args.results, 'complexity.md')
    if os.path.exists(cx):
        out += ['', '## Complexity', '', open(cx, encoding='utf-8').read().strip()]

    text = '\n'.join(out) + '\n'
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with open(args.out, 'w', encoding='utf-8') as f:
        f.write(text)
    print(text)


if __name__ == '__main__':
    main()
