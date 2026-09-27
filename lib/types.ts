export type TextStyle = {
  text: string;
  color: string;
  background: string;
  fontSize: number;
};

export type Cell = TextStyle & {
  rowSpan: number;
  colSpan: number;
  covered: boolean;
};

export type PeriodRow = {
  period: TextStyle;
  cells: Cell[];
};

export type TableBlock = {
  x: number;
  y: number;
  width: number;
  badge: TextStyle;
  headers: TextStyle[];
  rows: PeriodRow[];
};

export type TextBlock = TextStyle & {
  x: number;
  y: number;
  width: number;
};

export type ScheduleDoc = {
  version: 1;
  canvasBackground: string;
  frameColor: string;
  classTitle: TextBlock;
  banner: TextBlock;
  morning: TableBlock;
  afternoon: TableBlock;
};

export type TableId = 'morning' | 'afternoon';

export type BlockId = 'classTitle' | 'banner' | 'morning' | 'afternoon';

export type Selection =
  | { kind: 'canvas' }
  | { kind: 'classTitle' }
  | { kind: 'banner' }
  | { kind: 'badge'; table: TableId }
  | { kind: 'header'; table: TableId; index: number }
  | { kind: 'period'; table: TableId; row: number }
  | {
      kind: 'cells';
      table: TableId;
      r1: number;
      c1: number;
      r2: number;
      c2: number;
    };

export type CellRect = { r1: number; c1: number; r2: number; c2: number };

export type Slot = { table: TableId; row: number; col: number };
