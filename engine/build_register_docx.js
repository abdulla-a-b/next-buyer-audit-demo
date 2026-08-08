/**
 * build_register_docx.js — generates the NEXT COP Clause Register as a Word document.
 *
 * Reads data/seed_data.json (the single source of truth) and writes
 * build/NEXT-COP-Clause-Register.docx
 *
 * Usage:  node engine/build_register_docx.js
 *         make register
 *
 * Credit partner    : Industry Compliance & Sustainability Platform
 * Technology partner: guulba — technology for better performance
 */

const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, BorderStyle, ShadingType,
  PageOrientation, PageBreak, Header, Footer, PageNumber, TableOfContents,
  VerticalAlign, TabStopType,
} = require('docx');

const ROOT = path.join(__dirname, '..');
const SEED = path.join(ROOT, 'data', 'seed_data.json');
const OUT  = path.join(ROOT, 'build', 'NEXT-COP-Clause-Register.docx');

const board = JSON.parse(fs.readFileSync(SEED, 'utf8'));

/* ----------------------------------------------------------------- theme -- */
const INK    = '0F1A1F';
const STEEL  = '2E6F8E';
const MUTE   = '5C6B71';
const LINE   = 'D2DAD7';
const PAPER  = 'F6F8F7';

const GRADE = {
  'CAT 6': { bg: 'C6342A', fg: 'FFFFFF', weight: 13,
             meaning: 'Zero tolerance. Stops the order.' },
  'CAT 5': { bg: 'E8B004', fg: '0F1A1F', weight: 8,
             meaning: 'Zero tolerance. Stops the order.' },
  'CAT 4': { bg: 'B88700', fg: 'FFFFFF', weight: 5,
             meaning: 'Immediate corrective action required.' },
  'MAJOR': { bg: 'E4EEF3', fg: '20536B', weight: 3,
             meaning: 'Corrective action plan, verified at follow-up.' },
  'MINOR': { bg: 'EFF2F0', fg: '5C6B71', weight: 1,
             meaning: 'Continuous improvement.' },
};
const ORDER = ['CAT 6', 'CAT 5', 'CAT 4', 'MAJOR', 'MINOR'];

/* ------------------------------------------------------------- geometry --- */
// A4 portrait dimensions; PageOrientation.LANDSCAPE swaps them internally.
const PAGE = { width: 11906, height: 16838 };
const MARGIN = 720;                       // 0.5 inch
const USABLE = PAGE.height - MARGIN * 2;  // 15398 after the landscape swap

const COLS = [850, 2500, 5500, 4300, 1050, 1198];  // sums to 15398

/* ------------------------------------------------------------- helpers ---- */
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const HAIRLINE  = { style: BorderStyle.SINGLE, size: 2, color: LINE };
const cellBorders = {
  top: HAIRLINE, bottom: HAIRLINE, left: HAIRLINE, right: HAIRLINE,
};

function txt(text, opts = {}) {
  return new TextRun({
    text: String(text ?? ''),
    size: opts.size ?? 16,            // half-points: 16 = 8pt
    bold: opts.bold ?? false,
    color: opts.color ?? INK,
    font: opts.font ?? 'Calibri',
    italics: opts.italics ?? false,
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    alignment: opts.align ?? AlignmentType.LEFT,
    spacing: { before: opts.before ?? 0, after: opts.after ?? 40, line: opts.line ?? 240 },
    heading: opts.heading,
    pageBreakBefore: opts.pageBreakBefore ?? false,
    children: Array.isArray(text) ? text : [txt(text, opts)],
  });
}

function cell(children, opts = {}) {
  return new TableCell({
    width: { size: opts.width, type: WidthType.DXA },
    shading: opts.bg
      ? { type: ShadingType.CLEAR, color: 'auto', fill: opts.bg }
      : undefined,
    margins: opts.tight
      ? { top: 24, bottom: 24, left: 90, right: 90 }
      : { top: 60, bottom: 60, left: 90, right: 90 },
    verticalAlign: opts.valign ?? VerticalAlign.TOP,
    borders: cellBorders,
    children: Array.isArray(children) ? children : [children],
  });
}

function gradeCell(grade, width) {
  const g = GRADE[grade];
  return cell(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
      children: [txt(grade, { bold: true, color: g.fg, size: 15 })],
    }),
    { width, bg: g.bg, valign: VerticalAlign.CENTER },
  );
}

function headerRow(labels) {
  return new TableRow({
    tableHeader: true,
    children: labels.map((l, i) =>
      cell(
        new Paragraph({
          spacing: { after: 0 },
          alignment: i >= 4 ? AlignmentType.CENTER : AlignmentType.LEFT,
          children: [txt(l.toUpperCase(), { bold: true, color: 'FFFFFF', size: 14 })],
        }),
        { width: COLS[i], bg: INK, valign: VerticalAlign.CENTER },
      )),
  });
}

function table(rows, widths = COLS) {
  return new Table({
    columnWidths: widths,
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    rows,
  });
}

function rule() {
  return new Paragraph({
    spacing: { before: 60, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: LINE } },
    children: [txt('')],
  });
}

function counts(items) {
  const c = {};
  ORDER.forEach(g => { c[g] = items.filter(x => x.grade === g).length; });
  return c;
}

/* ------------------------------------------------------------ front page -- */
const total = board.items.length;
const all = counts(board.items);
const zeroTol = all['CAT 6'] + all['CAT 5'];
const totalWeight = board.items.reduce((a, x) => a + GRADE[x.grade].weight, 0);
const today = new Date().toISOString().slice(0, 10);

const front = [
  new Paragraph({
    spacing: { before: 1400, after: 0 },
    children: [txt('NEXT CODE OF PRACTICE', { bold: true, size: 22, color: STEEL })],
  }),
  new Paragraph({
    spacing: { before: 120, after: 0 },
    children: [txt('Clause Register', { bold: true, size: 60, color: INK })],
  }),
  new Paragraph({
    spacing: { before: 60, after: 400 },
    children: [txt('Twenty section groups · 255 auditable clauses · five-level severity ladder',
      { size: 22, color: MUTE })],
  }),
  rule(),
  p([txt('Standard  ', { bold: true, size: 18 }),
     txt('NEXT plc Supplier Auditing Standards, issued June 2025', { size: 18 })], { after: 80 }),
  p([txt('Register  ', { bold: true, size: 18 }),
     txt(`${total} clauses · ${totalWeight} total severity weight · ${zeroTol} zero-tolerance controls`, { size: 18 })], { after: 80 }),
  p([txt('Generated ', { bold: true, size: 18 }),
     txt(`${today} from data/seed_data.json`, { size: 18 })], { after: 400 }),
  rule(),
  p([txt('What this document is for', { bold: true, size: 20 })], { after: 120 }),
  p('NEXT does not publish a short code of conduct. It publishes an auditing standards booklet, ' +
    'and that booklet is the operational code. This register breaks every requirement in it into ' +
    'a single auditable control, states the evidence an auditor will ask for, and records the ' +
    'grade NEXT would raise if that control fails.', { size: 18, after: 120 }),
  p('Read it three ways. A department head reads their own section to see what they own. ' +
    'A compliance manager reads the severity ladder and the zero-tolerance index to decide what ' +
    'gets done first. Senior management reads the section map to see where the exposure sits.',
    { size: 18, after: 400 }),
  rule(),
  p([txt('Credit partner  ', { bold: true, size: 16, color: MUTE }),
     txt('Industry Compliance & Sustainability Platform', { size: 16 })], { after: 60 }),
  p([txt('Technology partner  ', { bold: true, size: 16, color: MUTE }),
     txt('guulba — technology for better performance', { size: 16 })], { after: 0 }),
];

/* --------------------------------------------------------------- contents */
const contents = [
  new Paragraph({ pageBreakBefore: true, heading: HeadingLevel.HEADING_1,
    spacing: { after: 160 }, children: [txt('Contents', { bold: true, size: 32 })] }),
];

[
  ['1.', 'The severity ladder', 'The five grades, their weights, and what each one costs you.'],
  ['2.', 'How to read a clause', 'What the six fields mean and how ORSVAI routing works.'],
  ['3.', 'The twenty section groups', 'Clause counts and grade profile for every group.'],
  ['4.', 'Zero-tolerance index', `All ${zeroTol} Category 6 and Category 5 clauses in one place.`],
  ['5.', 'The register', `All ${total} clauses in section order, with requirement and evidence.`],
  ['6.', 'Scope and limits', 'What this register is, and what it is not.'],
].forEach(([n, title, sub]) => {
  contents.push(new Paragraph({
    spacing: { before: 80, after: 20 },
    children: [
      txt(`${n}  `, { bold: true, size: 20, color: STEEL }),
      txt(title, { bold: true, size: 20 }),
    ],
  }));
  contents.push(new Paragraph({
    spacing: { after: 60 }, indent: { left: 340 },
    children: [txt(sub, { size: 17, color: MUTE })],
  }));
});

contents.push(new Paragraph({
  spacing: { before: 200, after: 100 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE } },
  children: [txt('Section groups inside part 5', { bold: true, size: 18, color: MUTE })],
}));

// Three balanced columns of section names, each on its own page in part 5.
const secLines = board.sections.map(s => {
  const items = board.items.filter(x => x.sectionKey === s.key);
  return { no: s.no, title: s.title.replace('Health & Safety — ', 'H&S · '), n: items.length };
});
const per = Math.ceil(secLines.length / 3);
const cols3 = [secLines.slice(0, per), secLines.slice(per, per * 2), secLines.slice(per * 2)];
contents.push(new Table({
  columnWidths: [5133, 5133, 5132],
  width: { size: 15398, type: WidthType.DXA },
  rows: [new TableRow({
    children: cols3.map((col, ci) => new TableCell({
      width: { size: [5133, 5133, 5132][ci], type: WidthType.DXA },
      margins: { top: 40, bottom: 40, left: 0, right: 200 },
      borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
      children: col.map(l => new Paragraph({
        spacing: { after: 40 },
        children: [
          txt(`${l.no}`.padEnd(6, ' '), { bold: true, size: 17, color: STEEL }),
          txt(`  ${l.title}  `, { size: 17 }),
          txt(`(${l.n})`, { size: 17, color: MUTE }),
        ],
      })),
    })),
  })],
}));

/* -------------------------------------------------- 1. the severity ladder */
const ladder = [
  new Paragraph({ pageBreakBefore: true, heading: HeadingLevel.HEADING_1,
    spacing: { after: 120 }, children: [txt('1. The severity ladder', { bold: true, size: 32 })] }),
  p('Every clause in this register carries one grade: the category NEXT would raise if that ' +
    'control were found to have failed. The grade is not a description of how hard the work is. ' +
    'It is a statement of what happens commercially if the work is not done.', { size: 18, after: 160 }),

  table([
    headerRow(['Grade', 'Weight', 'What it means at audit', 'Clauses in this register', '% of register', 'Share of weight'])
      .root ? headerRow(['Grade', 'Weight', 'What it means at audit', 'Clauses', 'Share of clauses', 'Share of weight'])
            : null,
  ].filter(Boolean).concat(
    ORDER.map(g => {
      const n = all[g];
      const w = n * GRADE[g].weight;
      return new TableRow({
        children: [
          gradeCell(g, COLS[0] + 400),
          cell(p(String(GRADE[g].weight), { size: 18, align: AlignmentType.CENTER, after: 0 }), { width: 900, valign: VerticalAlign.CENTER }),
          cell(p(GRADE[g].meaning, { size: 18, after: 0 }), { width: 5000, valign: VerticalAlign.CENTER }),
          cell(p(String(n), { size: 18, align: AlignmentType.CENTER, after: 0 }), { width: 1400, valign: VerticalAlign.CENTER }),
          cell(p(`${(n / total * 100).toFixed(1)}%`, { size: 18, align: AlignmentType.CENTER, after: 0 }), { width: 3300, valign: VerticalAlign.CENTER }),
          cell(p(`${(w / totalWeight * 100).toFixed(1)}%`, { size: 18, align: AlignmentType.CENTER, after: 0 }), { width: 3548, valign: VerticalAlign.CENTER }),
        ],
      });
    })
  ), [COLS[0] + 400, 900, 5000, 1400, 3300, 3548]),

  p('', { after: 200 }),
  p([txt('Why the weights matter. ', { bold: true, size: 18 }),
     txt('Closing one Category 6 clause removes as much exposure as closing thirteen Minor ones. ' +
         'A readiness figure that counts clauses instead of weight lets a team report steady ' +
         'progress while the fire alarm is still unfinished. Every score in this system is ' +
         'weighted for exactly that reason.', { size: 18 })], { after: 160 }),
  p([txt('The zero-tolerance gate. ', { bold: true, size: 18 }),
     txt(`Category 5 and Category 6 are different in kind, not degree. ${zeroTol} of the ${total} ` +
         'clauses here sit in those two bands. While any one of them is open, the site is not ' +
         'audit ready — no amount of Major and Minor closure compensates. Section 4 of this ' +
         'document indexes all of them in one place.', { size: 18 })], { after: 160 }),
  p([txt('A caution on grading. ', { bold: true, size: 18, color: 'A32D2D' }),
     txt('The booklet states in every section that its non-conformity lists are not exhaustive ' +
         'and that auditor discretion applies. Treat the grade in this register as a planning ' +
         'priority, not a guarantee of how a specific finding will be raised on the day.',
         { size: 18 })], { after: 0 }),
];

/* --------------------------------------------------- 2. how to read a row */
const howto = [
  new Paragraph({ pageBreakBefore: true, heading: HeadingLevel.HEADING_1,
    spacing: { after: 120 }, children: [txt('2. How to read a clause', { bold: true, size: 32 })] }),
  p('Each row in the register carries six fields.', { size: 18, after: 160 }),
  table([
    headerRow(['Field', 'What it holds', 'How to use it']).root ? null : new TableRow({
      tableHeader: true,
      children: ['Field', 'What it holds', 'How to use it'].map((l, i) =>
        cell(new Paragraph({ spacing: { after: 0 }, children: [txt(l.toUpperCase(), { bold: true, color: 'FFFFFF', size: 14 })] }),
          { width: [2200, 5600, 7598][i], bg: INK, valign: VerticalAlign.CENTER })),
    }),
  ].filter(Boolean).concat([
    ['Ref', 'A stable identifier, NX-001 to NX-255.',
     'Quote it in corrective action plans, purchase orders and audit correspondence. It never changes.'],
    ['Clause', 'A short name for the control.',
     'This is what appears on the dashboard and in task titles.'],
    ['Requirement', 'What the standard asks for, in plain terms.',
     'Read this before deciding whether the control is in place. Ambiguity here is the most common cause of a failed clause.'],
    ['Evidence', 'What the auditor will ask to see.',
     'This is the acceptance test. A control is not closed until this evidence exists, is dated and can be produced on request.'],
    ['If failed', 'The grade NEXT would raise.',
     'Drives sequencing. Clear Category 6, then 5, then 4, then Major.'],
    ['Workstream', 'Policy, Records, Practice, Facility, Engineering, Training or Licence.',
     'Groups clauses by the kind of work involved, which is how budget and contractors get allocated.'],
  ].map(([a, b, c]) => new TableRow({
    children: [
      cell(p(a, { bold: true, size: 18, after: 0 }), { width: 2200, bg: PAPER }),
      cell(p(b, { size: 18, after: 0 }), { width: 5600 }),
      cell(p(c, { size: 18, after: 0 }), { width: 7598 }),
    ],
  }))), [2200, 5600, 7598]),

  p('', { after: 200 }),
  p([txt('ORSVAI routing. ', { bold: true, size: 18 }),
     txt('Every section group carries a default accountability set — Owner, Responsible, Support, ' +
         'Verify, Approve, Inform — shown in the heading block of each section below. Verify is ' +
         'never the same party as Responsible; a control checked by the person who performed it ' +
         'is not verified.', { size: 18 })], { after: 0 }),
];

/* ------------------------------------------------------- 3. the section map */
const map = [
  new Paragraph({ pageBreakBefore: true, heading: HeadingLevel.HEADING_1,
    spacing: { after: 120 }, children: [txt('3. The twenty section groups', { bold: true, size: 32 })] }),
  p('Sections 1 to 10 of the standard, with Health & Safety expanded into its eleven sub-sections. ' +
    'The split is deliberate: 3.2 Fire Safety and 3.11 Environmental Protection are different ' +
    'departments, different budgets and different failure modes, and rolling them into one line ' +
    'hides where the exposure actually sits.', { size: 18, after: 60 }),
  p([txt('Where the weight sits. ', { bold: true, size: 18 }),
     txt('Section 1 is the shortest group in the register and the most dangerous — eight of its ' +
         'eleven clauses are Category 6, because forced labour findings are almost all ' +
         'zero-tolerance by nature. Section 3.2 Fire Safety is the largest single group at ' +
         '24 clauses and carries the heaviest engineering spend. Section 10 Management Systems ' +
         'is where an otherwise compliant site most often fails, because it tests whether the ' +
         'other nineteen groups can be evidenced rather than merely done.', { size: 18 })],
    { after: 100 }),

  table([
    new TableRow({
      tableHeader: true,
      children: ['§', 'Section group', 'Clauses', 'Cat 6', 'Cat 5', 'Cat 4', 'Major', 'Minor', 'Weight']
        .map((l, i) => cell(
          new Paragraph({ spacing: { after: 0 }, alignment: i >= 2 ? AlignmentType.CENTER : AlignmentType.LEFT,
            children: [txt(l.toUpperCase(), { bold: true, color: 'FFFFFF', size: 14 })] }),
          { width: [900, 5498, 1200, 1100, 1100, 1100, 1100, 1100, 2300][i], bg: INK, tight: true, valign: VerticalAlign.CENTER })),
    }),
  ].concat(
    board.sections.map(s => {
      const items = board.items.filter(x => x.sectionKey === s.key);
      const c = counts(items);
      const w = items.reduce((a, x) => a + GRADE[x.grade].weight, 0);
      const num = (v, colour) => cell(
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 },
          children: [txt(v || '·', { size: 18, bold: v > 0 && !!colour, color: v > 0 && colour ? colour : (v ? INK : LINE) })] }),
        { width: 1100, tight: true, valign: VerticalAlign.CENTER });
      return new TableRow({
        children: [
          cell(p(s.no, { bold: true, size: 18, after: 0 }), { width: 900, bg: PAPER, tight: true, valign: VerticalAlign.CENTER }),
          cell(p(s.title, { size: 18, after: 0 }), { width: 5498, tight: true, valign: VerticalAlign.CENTER }),
          cell(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 },
            children: [txt(String(items.length), { size: 18, bold: true })] }), { width: 1200, tight: true, valign: VerticalAlign.CENTER }),
          num(c['CAT 6'], 'C6342A'), num(c['CAT 5'], 'B88700'), num(c['CAT 4'], 'B88700'),
          num(c['MAJOR'], null), num(c['MINOR'], null),
          cell(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 },
            children: [txt(String(w), { size: 18, color: MUTE })] }), { width: 2300, tight: true, valign: VerticalAlign.CENTER }),
        ],
      });
    })
  ).concat([
    new TableRow({
      children: [
        cell(p('', { after: 0 }), { width: 900, bg: INK, tight: true }),
        cell(p([txt('Total', { bold: true, size: 18, color: 'FFFFFF' })], { after: 0 }), { width: 5498, bg: INK, tight: true }),
        ...[String(total), String(all['CAT 6']), String(all['CAT 5']), String(all['CAT 4']),
            String(all['MAJOR']), String(all['MINOR']), String(totalWeight)]
          .map((v, i) => cell(
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 },
              children: [txt(v, { bold: true, size: 18, color: 'FFFFFF' })] }),
            { width: [1200, 1100, 1100, 1100, 1100, 1100, 2300][i], bg: INK, tight: true })),
      ],
    }),
  ]), [900, 5498, 1200, 1100, 1100, 1100, 1100, 1100, 2300]),

];

/* -------------------------------------------- 4. the zero-tolerance index -- */
const ztItems = board.items
  .filter(x => x.grade === 'CAT 6' || x.grade === 'CAT 5')
  .sort((a, b) => (ORDER.indexOf(a.grade) - ORDER.indexOf(b.grade))
                  || a.id.localeCompare(b.id));

const ztCols = [900, 1400, 5400, 6400, 1298];
const zeroTolerance = [
  new Paragraph({ pageBreakBefore: true, heading: HeadingLevel.HEADING_1,
    spacing: { after: 120 }, children: [txt('4. Zero-tolerance index', { bold: true, size: 32 })] }),
  p([txt(`${zeroTol} clauses — every Category 6 and Category 5 control in one place. `, { bold: true, size: 18 }),
     txt('While any row here is open, the site is not audit ready. This is the list to work ' +
         'first, and the list to check before requesting an audit date.', { size: 18 })], { after: 160 }),

  table([
    new TableRow({
      tableHeader: true,
      children: ['Grade', 'Ref', 'Clause', 'Evidence required', '§']
        .map((l, i) => cell(
          new Paragraph({ spacing: { after: 0 }, alignment: (i === 0 || i === 4) ? AlignmentType.CENTER : AlignmentType.LEFT,
            children: [txt(l.toUpperCase(), { bold: true, color: 'FFFFFF', size: 14 })] }),
          { width: ztCols[i], bg: INK, valign: VerticalAlign.CENTER })),
    }),
  ].concat(ztItems.map(x => new TableRow({
    children: [
      gradeCell(x.grade, ztCols[0]),
      cell(p(x.id, { size: 16, bold: true, after: 0 }), { width: ztCols[1], bg: PAPER }),
      cell(p(x.clause, { size: 17, bold: true, after: 0 }), { width: ztCols[2] }),
      cell(p(x.evidence, { size: 16, color: MUTE, after: 0 }), { width: ztCols[3] }),
      cell(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 },
        children: [txt(x.sectionNo, { size: 16, color: MUTE })] }), { width: ztCols[4] }),
    ],
  }))), ztCols),
];

/* ------------------------------------------------------ 5. the register ---- */
const register = [
  new Paragraph({ pageBreakBefore: true, heading: HeadingLevel.HEADING_1,
    spacing: { after: 120 }, children: [txt('5. The register', { bold: true, size: 32 })] }),
  p('All 255 clauses, in section order. Each section opens with its default ORSVAI routing and ' +
    'its grade profile.', { size: 18, after: 200 }),
];

board.sections.forEach((s, idx) => {
  const items = board.items.filter(x => x.sectionKey === s.key);
  const c = counts(items);
  const ex = items[0];
  const profile = ORDER.filter(g => c[g] > 0).map(g => `${c[g]} × ${g}`).join('   ·   ');

  register.push(new Paragraph({
    pageBreakBefore: idx > 0,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: idx === 0 ? 0 : 120, after: 60 },
    children: [txt(`Section ${s.no} — ${s.title.replace('Health & Safety — ', '')}`,
      { bold: true, size: 26, color: INK })],
  }));

  register.push(new Paragraph({
    spacing: { after: 40 },
    children: [
      txt(`${items.length} clauses      `, { bold: true, size: 17, color: STEEL }),
      txt(profile, { size: 17, color: MUTE }),
    ],
  }));

  register.push(new Paragraph({
    spacing: { after: 140 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE } },
    children: [
      txt('O ', { bold: true, size: 15, color: STEEL }), txt(`${ex.owner}    `, { size: 15 }),
      txt('R ', { bold: true, size: 15, color: STEEL }), txt(`${ex.responsible}    `, { size: 15 }),
      txt('S ', { bold: true, size: 15, color: STEEL }), txt(`${ex.support}    `, { size: 15 }),
      txt('V ', { bold: true, size: 15, color: STEEL }), txt(`${ex.verify}    `, { size: 15 }),
      txt('A ', { bold: true, size: 15, color: STEEL }), txt(`${ex.approve}    `, { size: 15 }),
      txt('I ', { bold: true, size: 15, color: STEEL }), txt(`${ex.inform}`, { size: 15 }),
    ],
  }));

  register.push(table(
    [headerRow(['Ref', 'Clause', 'Requirement', 'Evidence required', 'If failed', 'Workstream'])]
      .concat(items.map(x => new TableRow({
        children: [
          cell(p(x.id, { size: 16, bold: true, after: 0 }), { width: COLS[0], bg: PAPER }),
          cell(p(x.clause, { size: 17, bold: true, after: 0 }), { width: COLS[1] }),
          cell(p(x.requirement, { size: 16, after: 0 }), { width: COLS[2] }),
          cell(p(x.evidence, { size: 16, color: MUTE, after: 0 }), { width: COLS[3] }),
          gradeCell(x.grade, COLS[4]),
          cell(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 },
            children: [txt(x.workstream, { size: 16, color: MUTE })] }),
            { width: COLS[5], valign: VerticalAlign.CENTER }),
        ],
      })))
  ));
});

/* ------------------------------------------------------------ 6. closing -- */
const closing = [
  new Paragraph({ pageBreakBefore: true, heading: HeadingLevel.HEADING_1,
    spacing: { after: 120 }, children: [txt('6. Scope and limits', { bold: true, size: 32 })] }),
  p([txt('Grading is a planning judgement. ', { bold: true, size: 18 }),
     txt('Each grade here is this register\'s reading of the Minor, Major, Category 4, 5 and 6 ' +
         'tables in the June 2025 booklet. Those tables are explicitly non-exhaustive and subject ' +
         'to auditor discretion. Use the grade to sequence work, not to predict an outcome.',
         { size: 18 })], { after: 160 }),
  p([txt('Policies issued separately. ', { bold: true, size: 18 }),
     txt('Several clauses reference NEXT policies that sit outside the auditing standards: the ' +
         'Child Remediation Programme, Migrant Labour Policy, Agency Labour Policy, Shared ' +
         'Premises Policy, Chemical Management Manual and the Effective Grievance Mechanism ' +
         'Policy. These are on the NEXT supplier extranet. Section 10 covers their adoption, but ' +
         'the documents themselves are needed before a mock audit.', { size: 18 })], { after: 160 }),
  p([txt('Local law still governs. ', { bold: true, size: 18 }),
     txt('Where the Bangladesh Labour Act 2006, its 2015 Rules, or a collective agreement affords ' +
         'greater protection than this register states, the local instrument applies. Several ' +
         'clauses are written as "where required by law" precisely because the threshold is set ' +
         'locally, not by NEXT.', { size: 18 })], { after: 160 }),
  p([txt('This is a preparation tool. ', { bold: true, size: 18 }),
     txt('It does not replace a NEXT audit, an accredited third-party audit, or professional ' +
         'legal advice on labour compliance.', { size: 18 })], { after: 400 }),
  rule(),
  p([txt('Source  ', { bold: true, size: 16, color: MUTE }),
     txt('NEXT plc Supplier Auditing Standards, June 2025 · nextplc.co.uk', { size: 16 })], { after: 60 }),
  p([txt('Generated from  ', { bold: true, size: 16, color: MUTE }),
     txt('data/seed_data.json by engine/build_register_docx.js', { size: 16 })], { after: 160 }),
  p([txt('Credit partner  ', { bold: true, size: 16, color: MUTE }),
     txt('Industry Compliance & Sustainability Platform', { size: 16 })], { after: 60 }),
  p([txt('Technology partner  ', { bold: true, size: 16, color: MUTE }),
     txt('guulba — technology for better performance', { size: 16 })], { after: 0 }),
];

/* -------------------------------------------------------------- assemble -- */
const doc = new Document({
  creator: 'Industry Compliance & Sustainability Platform',
  title: 'NEXT Code of Practice — Clause Register',
  description: 'All 255 auditable clauses of the NEXT plc Supplier Auditing Standards, June 2025, with severity grading.',
  styles: {
    default: {
      document: { run: { font: 'Calibri', size: 18, color: INK } },
    },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, color: INK, font: 'Calibri' },
        paragraph: { spacing: { before: 0, after: 160 } } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, color: INK, font: 'Calibri' },
        paragraph: { spacing: { before: 120, after: 80 } } },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: PAGE.width, height: PAGE.height, orientation: PageOrientation.LANDSCAPE },
        margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          spacing: { after: 80 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE } },
          tabStops: [{ type: TabStopType.RIGHT, position: USABLE }],
          children: [
            txt('NEXT Code of Practice — Clause Register', { size: 15, bold: true, color: MUTE }),
            new TextRun({ text: '\tSupplier Auditing Standards, June 2025', size: 15, color: MUTE, font: 'Calibri' }),
          ],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          spacing: { before: 80 },
          tabStops: [{ type: TabStopType.RIGHT, position: USABLE }],
          children: [
            txt('Credit partner: Industry Compliance & Sustainability Platform  ·  Technology partner: guulba',
              { size: 14, color: MUTE }),
            new TextRun({ children: ['\tPage ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES],
              size: 14, color: MUTE, font: 'Calibri' }),
          ],
        })],
      }),
    },
    children: [...front, ...contents, ...ladder, ...howto, ...map, ...zeroTolerance, ...register, ...closing],
  }],
});

fs.mkdirSync(path.dirname(OUT), { recursive: true });
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUT, buf);
  console.log(`written : ${OUT}`);
  console.log(`clauses : ${total}  (${zeroTol} zero-tolerance)`);
  console.log(`sections: ${board.sections.length}`);
});
