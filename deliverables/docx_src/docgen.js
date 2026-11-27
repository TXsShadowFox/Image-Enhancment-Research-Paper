// Shared helpers for building the report and paper .docx files with docx-js.
const fs = require('fs');
const path = require('path');
const {
  Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, ImageRun, LevelFormat, PageBreak,
  TabStopType, TableLayoutType, VerticalAlign,
} = require('docx');

const FIG_DIR = path.join(__dirname, '..', 'figures');
const A4_TEXT_WIDTH = 9026; // DXA: A4 (11906) minus 2 x 1440 margins

function makeTheme({ font = 'Calibri', size = 22, accent = '1F4E79', codeFont = 'Consolas', subscripts = false } = {}) {
  // `_x` / `_{...}` -> subscript, `^x` / `^{...}` -> superscript (only when the theme enables it)
  function scripted(text, base) {
    if (!subscripts) return [new TextRun({ ...base, text })];
    const out = [];
    const re = /([_^])(\{[^}]*\}|[^\s{}()])/g;
    let last = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) out.push(new TextRun({ ...base, text: text.slice(last, m.index) }));
      const val = m[2].startsWith('{') ? m[2].slice(1, -1) : m[2];
      out.push(new TextRun({ ...base, text: val, subScript: m[1] === '_', superScript: m[1] === '^' }));
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push(new TextRun({ ...base, text: text.slice(last) }));
    return out;
  }

  // ---- inline markup: **bold**, *italic*, `code`
  function runs(text, base = {}) {
    const out = [];
    const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
    let last = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) out.push(...scripted(text.slice(last, m.index), base));
      const tok = m[0];
      if (tok.startsWith('**')) out.push(...scripted(tok.slice(2, -2), { ...base, bold: true }));
      else if (tok.startsWith('`')) out.push(new TextRun({ ...base, text: tok.slice(1, -1), font: codeFont, size: Math.round((base.size || size) * 0.9) }));
      else out.push(...scripted(tok.slice(1, -1), { ...base, italics: true }));
      last = m.index + tok.length;
    }
    if (last < text.length) out.push(...scripted(text.slice(last), base));
    return out;
  }

  const p = (text, opts = {}) => new Paragraph({
    children: runs(text, opts.run || {}),
    spacing: { after: 120, line: opts.line || 276 },
    alignment: opts.align || AlignmentType.JUSTIFIED,
    ...opts.para,
  });
  const h1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
  const h2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
  const h3 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(text)] });
  const bullet = (text, level = 0) => new Paragraph({
    numbering: { reference: 'bullets', level }, children: runs(text), spacing: { after: 60 },
  });
  const numbered = (text, ref = 'numbers') => new Paragraph({
    numbering: { reference: ref, level: 0 }, children: runs(text), spacing: { after: 60 },
  });
  const pageBreak = () => new Paragraph({ children: [new PageBreak()] });
  // Equation text: `_x` or `_{...}` becomes a subscript, `^x` or `^{...}` a superscript.
  function eqRuns(text) {
    const out = [];
    const re = /([_^])(\{[^}]*\}|[^\s{}()])/g;
    let last = 0;
    let m;
    const font = 'Cambria Math';
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), font }));
      const val = m[2].startsWith('{') ? m[2].slice(1, -1) : m[2];
      out.push(new TextRun({ text: val, font, subScript: m[1] === '_', superScript: m[1] === '^' }));
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push(new TextRun({ text: text.slice(last), font }));
    return out;
  }
  const equation = (text, num, width = A4_TEXT_WIDTH) => new Paragraph({
    tabStops: [{ type: TabStopType.CENTER, position: Math.round(width / 2) },
               { type: TabStopType.RIGHT, position: width }],
    spacing: { before: 80, after: 120 },
    keepLines: true,
    children: [new TextRun({ text: '\t' }), ...eqRuns(text),
               new TextRun({ text: num ? `\t(${num})` : '' })],
  });
  const code = (lines) => lines.map((l, i) => new Paragraph({
    children: [new TextRun({ text: l || ' ', font: codeFont, size: 18 })],
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F3F3F1' },
    spacing: { after: i === lines.length - 1 ? 160 : 0, line: 240 },
    indent: { left: 120, right: 120 },
  }));
  const caption = (text) => new Paragraph({
    children: runs(text, { size: Math.round(size * 0.86), color: '444444' }),
    alignment: AlignmentType.CENTER, spacing: { before: 60, after: 240 },
  });
  const note = (text) => new Paragraph({
    children: runs(text, { size: Math.round(size * 0.86), color: '555555', italics: true }),
    spacing: { after: 160 },
  });

  function pngSize(file) {
    const b = fs.readFileSync(file);
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  }
  function figure(name, widthInches, captionText) {
    const file = path.join(FIG_DIR, name);
    const { w, h } = pngSize(file);
    const wpx = Math.round(widthInches * 96);
    return [
      new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { before: 120, after: 0 }, keepNext: true,
        children: [new ImageRun({ type: 'png', data: fs.readFileSync(file),
          transformation: { width: wpx, height: Math.round(wpx * h / w) },
          altText: { title: name, description: captionText, name } })],
      }),
      caption(captionText),
    ];
  }

  // ---- tables: rows = array of arrays of strings; first row is the header
  const border = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };
  const borders = { top: border, bottom: border, left: border, right: border };
  function table(rows, widths, opts = {}) {
    const total = widths.reduce((a, b) => a + b, 0);
    const fs_ = opts.size || Math.round(size * 0.82);
    const boldRows = new Set(opts.boldRows || []);
    const shadeRows = new Set(opts.shadeRows || []);
    return new Table({
      width: { size: total, type: WidthType.DXA },
      columnWidths: widths,
      layout: TableLayoutType.FIXED,
      rows: rows.map((row, r) => new TableRow({
        tableHeader: r === 0,
        cantSplit: true,
        children: row.map((cell, c) => new TableCell({
          width: { size: widths[c], type: WidthType.DXA },
          borders,
          verticalAlign: VerticalAlign.CENTER,
          shading: r === 0 ? { type: ShadingType.CLEAR, color: 'auto', fill: accent }
            : shadeRows.has(r) ? { type: ShadingType.CLEAR, color: 'auto', fill: 'EAF2E3' }
            : (r % 2 === 0 ? { type: ShadingType.CLEAR, color: 'auto', fill: 'F7F7F5' } : undefined),
          margins: { top: 50, bottom: 50, left: 90, right: 90 },
          children: [new Paragraph({
            alignment: (c === 0 || opts.leftAll) ? AlignmentType.LEFT : AlignmentType.CENTER,
            children: runs(String(cell), {
              size: fs_, bold: r === 0 || boldRows.has(r), color: r === 0 ? 'FFFFFF' : undefined,
            }),
          })],
        })),
      })),
    });
  }
  const spacer = () => new Paragraph({ children: [], spacing: { after: 60 } });

  const styles = {
    default: { document: { run: { font, size } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: Math.round(size * 1.45), bold: true, font, color: accent },
        paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0, keepNext: true } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: Math.round(size * 1.18), bold: true, font, color: accent },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1, keepNext: true } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: Math.round(size * 1.02), bold: true, font, color: '333333' },
        paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 2, keepNext: true } },
    ],
  };
  const numbering = {
    config: [
      { reference: 'bullets', levels: [
        { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 270 } } } },
        { level: 1, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1080, hanging: 270 } } } }] },
      ...['numbers', 'numbers2', 'numbers3', 'numbers4'].map((reference) => ({ reference, levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] })),
    ],
  };
  return { runs, p, h1, h2, h3, bullet, numbered, pageBreak, equation, code, caption, note,
           figure, table, spacer, styles, numbering, TEXT_WIDTH: A4_TEXT_WIDTH };
}

module.exports = { makeTheme, FIG_DIR, A4_TEXT_WIDTH };
