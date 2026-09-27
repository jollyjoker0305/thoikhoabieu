import { defaultSchedule } from './default-schedule';
import type {
  BlockId,
  Cell,
  CellRect,
  ScheduleDoc,
  Selection,
  Slot,
  TableBlock,
  TableId,
  TextStyle,
} from './types';

const HEX = /^#[0-9a-fA-F]{6}$/;

function cleanText(value: string, max: number) {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, max);
}

function clampNum(value: unknown, min: number, max: number, fallback: number) {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(Math.min(max, Math.max(min, n)) * 100) / 100;
}

function parseFontSize(value: unknown, fallback: number) {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  // Older timetables stored size in cqw (about 0.5–7). 16px matches normal text.
  if (n < 8) return 16;
  return Math.round(Math.min(40, Math.max(12, n)));
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function parseStyle(value: unknown, fallback: TextStyle, maxLen: number): TextStyle {
  const v = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const text = typeof v.text === 'string' ? cleanText(v.text, maxLen) : fallback.text;
  const color = typeof v.color === 'string' && HEX.test(v.color) ? v.color.toLowerCase() : fallback.color;
  let background = fallback.background;
  if (v.background === 'transparent') background = 'transparent';
  else if (typeof v.background === 'string' && HEX.test(v.background)) background = v.background.toLowerCase();
  return {
    text,
    color,
    background,
    fontSize: parseFontSize(v.fontSize, fallback.fontSize),
  };
}

function parseFrame(value: unknown, fallback: { x: number; y: number; width: number }) {
  const v = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const width = clampNum(v.width, 20, 100, fallback.width);
  let x = clampNum(v.x, 0, 100, fallback.x);
  const y = clampNum(v.y, 0, 92, fallback.y);
  if (x + width > 100) x = Math.max(0, 100 - width);
  return { x, y, width };
}

export function recomputeCovered(table: TableBlock) {
  for (const row of table.rows) {
    for (const cell of row.cells) cell.covered = false;
  }
  const rowCount = table.rows.length;
  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < 6; c++) {
      const cell = table.rows[r].cells[c];
      if (cell.covered) {
        cell.rowSpan = 1;
        cell.colSpan = 1;
        continue;
      }
      cell.rowSpan = Math.max(1, Math.min(cell.rowSpan, rowCount - r));
      cell.colSpan = Math.max(1, Math.min(cell.colSpan, 6 - c));
      for (let rr = r; rr < r + cell.rowSpan; rr++) {
        for (let cc = c; cc < c + cell.colSpan; cc++) {
          if (rr === r && cc === c) continue;
          const covered = table.rows[rr].cells[cc];
          covered.covered = true;
          covered.rowSpan = 1;
          covered.colSpan = 1;
        }
      }
    }
  }
}

function parseTable(value: unknown, fallback: TableBlock): TableBlock | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.headers) || v.headers.length !== 7) return null;
  if (!Array.isArray(v.rows) || v.rows.length < 1 || v.rows.length > 16) return null;

  const rows = [];
  for (let i = 0; i < v.rows.length; i++) {
    const source = v.rows[i];
    if (!source || typeof source !== 'object') return null;
    const row = source as Record<string, unknown>;
    if (!Array.isArray(row.cells) || row.cells.length !== 6) return null;
    const fallbackRow = fallback.rows[Math.min(i, fallback.rows.length - 1)];
    const cells: Cell[] = row.cells.map((cell, col) => {
      const base = fallbackRow.cells[col];
      const style = parseStyle(cell, base, 200);
      const raw = cell && typeof cell === 'object' ? (cell as Record<string, unknown>) : {};
      return {
        ...style,
        rowSpan: clampInt(raw.rowSpan, 1, 16, 1),
        colSpan: clampInt(raw.colSpan, 1, 6, 1),
        covered: false,
      };
    });
    rows.push({
      period: parseStyle(row.period, fallbackRow.period, 80),
      cells,
    });
  }

  const table: TableBlock = {
    ...parseFrame(v, fallback),
    badge: parseStyle(v.badge, fallback.badge, 40),
    headers: v.headers.map((header, index) => parseStyle(header, fallback.headers[index], 40)),
    rows,
  };
  recomputeCovered(table);
  return table;
}

export function parseSchedule(value: unknown): ScheduleDoc | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (v.version !== 1) return null;
  const fallback = defaultSchedule();
  const morning = parseTable(v.morning, fallback.morning);
  const afternoon = parseTable(v.afternoon, fallback.afternoon);
  if (!morning || !afternoon) return null;
  const canvasBackground =
    typeof v.canvasBackground === 'string' && HEX.test(v.canvasBackground)
      ? v.canvasBackground.toLowerCase()
      : fallback.canvasBackground;
  const frameColor =
    typeof v.frameColor === 'string' && HEX.test(v.frameColor)
      ? v.frameColor.toLowerCase()
      : fallback.frameColor;
  return {
    version: 1,
    canvasBackground,
    frameColor,
    classTitle: { ...parseStyle(v.classTitle, fallback.classTitle, 80), ...parseFrame(v.classTitle, fallback.classTitle) },
    banner: { ...parseStyle(v.banner, fallback.banner, 80), ...parseFrame(v.banner, fallback.banner) },
    morning,
    afternoon,
  };
}

export function normalizeRect(r1: number, c1: number, r2: number, c2: number): CellRect {
  return {
    r1: Math.min(r1, r2),
    c1: Math.min(c1, c2),
    r2: Math.max(r1, r2),
    c2: Math.max(c1, c2),
  };
}

export function findAnchor(table: TableBlock, row: number, col: number) {
  for (let r = 0; r < table.rows.length; r++) {
    for (let c = 0; c < 6; c++) {
      const cell = table.rows[r].cells[c];
      if (cell.covered) continue;
      if (row >= r && row < r + cell.rowSpan && col >= c && col < c + cell.colSpan) {
        return { row: r, col: c };
      }
    }
  }
  return { row, col };
}

export function expandRect(table: TableBlock, rect: CellRect): CellRect {
  let current = { ...rect };
  let changed = true;
  while (changed) {
    changed = false;
    for (let r = current.r1; r <= current.r2; r++) {
      for (let c = current.c1; c <= current.c2; c++) {
        const anchor = findAnchor(table, r, c);
        const cell = table.rows[anchor.row].cells[anchor.col];
        const next: CellRect = {
          r1: Math.min(current.r1, anchor.row),
          c1: Math.min(current.c1, anchor.col),
          r2: Math.max(current.r2, anchor.row + cell.rowSpan - 1),
          c2: Math.max(current.c2, anchor.col + cell.colSpan - 1),
        };
        if (next.r1 !== current.r1 || next.c1 !== current.c1 || next.r2 !== current.r2 || next.c2 !== current.c2) {
          current = next;
          changed = true;
        }
      }
    }
  }
  return current;
}

function anchorsIn(table: TableBlock, rect: CellRect) {
  const map = new Map<string, { row: number; col: number }>();
  for (let r = rect.r1; r <= rect.r2; r++) {
    for (let c = rect.c1; c <= rect.c2; c++) {
      const anchor = findAnchor(table, r, c);
      map.set(`${anchor.row}:${anchor.col}`, anchor);
    }
  }
  return [...map.values()];
}

export function getMergeState(doc: ScheduleDoc, selection: Selection | null) {
  const empty = { canMerge: false, canUnmerge: false, rows: 0, cols: 0 };
  if (!selection || selection.kind !== 'cells') return empty;
  const table = doc[selection.table];
  const rect = normalizeRect(selection.r1, selection.c1, selection.r2, selection.c2);
  if (rect.r1 < 0 || rect.c1 < 0 || rect.r2 >= table.rows.length || rect.c2 > 5) return empty;
  const expanded = expandRect(table, rect);
  const anchors = anchorsIn(table, expanded);
  const rows = expanded.r2 - expanded.r1 + 1;
  const cols = expanded.c2 - expanded.c1 + 1;
  const only = anchors.length === 1 ? table.rows[anchors[0].row].cells[anchors[0].col] : null;
  const exact =
    !!only &&
    anchors[0].row === expanded.r1 &&
    anchors[0].col === expanded.c1 &&
    only.rowSpan === rows &&
    only.colSpan === cols;
  return {
    canMerge: rows * cols > 1 && !exact,
    canUnmerge: !!only && (only.rowSpan > 1 || only.colSpan > 1),
    rows,
    cols,
  };
}

export function selectedAnchors(doc: ScheduleDoc, selection: Selection | null) {
  if (!selection || selection.kind !== 'cells') return [];
  const table = doc[selection.table];
  const rect = normalizeRect(selection.r1, selection.c1, selection.r2, selection.c2);
  if (rect.r2 >= table.rows.length || rect.c2 > 5) return [];
  return anchorsIn(table, rect).map((anchor) => ({ table: selection.table, ...anchor }));
}

export function mergeRect(doc: ScheduleDoc, tableId: TableId, rect: CellRect) {
  const next = structuredClone(doc);
  const table = next[tableId];
  const expanded = expandRect(table, rect);
  const anchors = anchorsIn(table, expanded);
  const visibleText = anchors
    .map((anchor) => table.rows[anchor.row].cells[anchor.col].text.trim())
    .filter(Boolean);
  const spans = anchors.map((anchor) => {
    const cell = table.rows[anchor.row].cells[anchor.col];
    return { ...anchor, rowSpan: cell.rowSpan, colSpan: cell.colSpan };
  });

  for (const anchor of spans) {
    for (let r = anchor.row; r < anchor.row + anchor.rowSpan; r++) {
      for (let c = anchor.col; c < anchor.col + anchor.colSpan; c++) {
        const target = table.rows[r].cells[c];
        target.covered = false;
        target.rowSpan = 1;
        target.colSpan = 1;
      }
    }
  }

  const anchor = table.rows[expanded.r1].cells[expanded.c1];
  anchor.rowSpan = expanded.r2 - expanded.r1 + 1;
  anchor.colSpan = expanded.c2 - expanded.c1 + 1;
  anchor.covered = false;
  if (!anchor.text.trim() && visibleText.length > 0) anchor.text = visibleText[0];
  for (let r = expanded.r1; r <= expanded.r2; r++) {
    for (let c = expanded.c1; c <= expanded.c2; c++) {
      if (r === expanded.r1 && c === expanded.c1) continue;
      const cell = table.rows[r].cells[c];
      cell.covered = true;
      cell.rowSpan = 1;
      cell.colSpan = 1;
    }
  }
  recomputeCovered(table);
  return { doc: next, rect: expanded };
}

export function unmergeSlot(doc: ScheduleDoc, slot: Slot) {
  const next = structuredClone(doc);
  const table = next[slot.table];
  const anchor = findAnchor(table, slot.row, slot.col);
  const cell = table.rows[anchor.row].cells[anchor.col];
  for (let r = anchor.row; r < anchor.row + cell.rowSpan; r++) {
    for (let c = anchor.col; c < anchor.col + cell.colSpan; c++) {
      const target = table.rows[r].cells[c];
      target.covered = false;
      target.rowSpan = 1;
      target.colSpan = 1;
    }
  }
  recomputeCovered(table);
  return { doc: next, anchor };
}

export function swapCellContent(doc: ScheduleDoc, a: Slot, b: Slot) {
  const next = structuredClone(doc);
  const aa = findAnchor(next[a.table], a.row, a.col);
  const bb = findAnchor(next[b.table], b.row, b.col);
  if (a.table === b.table && aa.row === bb.row && aa.col === bb.col) return doc;
  const left = next[a.table].rows[aa.row].cells[aa.col];
  const right = next[b.table].rows[bb.row].cells[bb.col];
  const snapshot = {
    text: left.text,
    color: left.color,
    background: left.background,
    fontSize: left.fontSize,
  };
  left.text = right.text;
  left.color = right.color;
  left.background = right.background;
  left.fontSize = right.fontSize;
  right.text = snapshot.text;
  right.color = snapshot.color;
  right.background = snapshot.background;
  right.fontSize = snapshot.fontSize;
  return next;
}

function styleNodes(doc: ScheduleDoc, selection: Selection): TextStyle[] {
  if (selection.kind === 'classTitle') return [doc.classTitle];
  if (selection.kind === 'banner') return [doc.banner];
  if (selection.kind === 'badge') return [doc[selection.table].badge];
  if (selection.kind === 'header') return [doc[selection.table].headers[selection.index]];
  if (selection.kind === 'period') return [doc[selection.table].rows[selection.row].period];
  if (selection.kind === 'cells') {
    return selectedAnchors(doc, selection).map((slot) => doc[slot.table].rows[slot.row].cells[slot.col]);
  }
  return [];
}

export function patchSelection(doc: ScheduleDoc, selection: Selection, patch: Partial<TextStyle>) {
  const next = structuredClone(doc);
  const nodes = styleNodes(next, selection);
  if (nodes.length === 0) return doc;
  const nextPatch = { ...patch };
  if (nodes.length > 1) delete nextPatch.text;
  for (const node of nodes) Object.assign(node, nextPatch);
  return next;
}

export function patchFrame(doc: ScheduleDoc, id: BlockId, patch: Partial<{ x: number; y: number; width: number }>) {
  const next = structuredClone(doc);
  const block = next[id];
  if (patch.width != null) block.width = clampNum(patch.width, 20, 100, block.width);
  if (patch.x != null) block.x = clampNum(patch.x, 0, 100, block.x);
  if (patch.y != null) block.y = clampNum(patch.y, 0, 92, block.y);
  if (block.x + block.width > 100) block.x = Math.max(0, Math.round((100 - block.width) * 100) / 100);
  return next;
}

export function frameOf(selection: Selection | null): BlockId | null {
  if (!selection) return null;
  if (selection.kind === 'classTitle' || selection.kind === 'banner') return selection.kind;
  if (selection.kind === 'badge') return selection.table;
  return null;
}

export function cellIntersects(row: number, col: number, cell: Cell, rect: CellRect) {
  const r2 = row + cell.rowSpan - 1;
  const c2 = col + cell.colSpan - 1;
  return !(r2 < rect.r1 || row > rect.r2 || c2 < rect.c1 || col > rect.c2);
}
