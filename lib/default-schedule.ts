import type { Cell, PeriodRow, ScheduleDoc, TableBlock, TextStyle } from './types';

const ink = '#17375a';

function lesson(
  text: string,
  background: string,
  options?: { rowSpan?: number; covered?: boolean },
): Cell {
  return {
    text,
    color: ink,
    background,
    fontSize: 16,
    rowSpan: options?.rowSpan ?? 1,
    colSpan: 1,
    covered: options?.covered ?? false,
  };
}

const empty = () => lesson('', 'transparent');

function label(text: string, color: string, background: string, fontSize: number): TextStyle {
  return { text, color, background, fontSize };
}

function period(text: string): TextStyle {
  return label(text, '#1a4e78', '#e7f4fc', 16);
}

function headers(): TextStyle[] {
  return ['Tiết', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'].map((text) =>
    label(text, '#ffffff', '#2b9ae8', 16),
  );
}

const toan = '#ffe39a';
const ngoaiNgu = '#f8cfe2';
const nguVan = '#cfeefb';
const amNhac = '#f6c9dc';
const miThuat = '#e6d4f8';
const theChat = '#d2f0c2';
const toanTa = '#fbf1c4';
const tan = '#fff4cc';
const tin = '#f7c6e0';
const khtn = '#d5f1c6';
const su = '#e5f6d2';
const congNghe = '#e4d2f7';
const dia = '#c9ebf8';
const diaPhuong = '#f8dfc2';
const hdtn = '#d4f0fb';
const gdcd = '#f7f0c4';

function row(periodText: string, cells: Cell[]): PeriodRow {
  return { period: period(periodText), cells };
}

function morning(): TableBlock {
  return {
    x: 3.1,
    y: 28.1,
    width: 93.8,
    badge: label('Buổi sáng', '#ffffff', '#f0a020', 16),
    headers: headers(),
    rows: [
      row('1 (7h30 - 8h15)', [
        lesson('Toán 47', toan, { rowSpan: 2 }),
        lesson('Ngoại ngữ 47', ngoaiNgu, { rowSpan: 2 }),
        lesson('Ngữ văn 47', nguVan, { rowSpan: 2 }),
        lesson('Âm nhạc', amNhac),
        empty(),
        empty(),
      ]),
      row('2 (8h20 - 9h05)', [
        lesson('', 'transparent', { covered: true }),
        lesson('', 'transparent', { covered: true }),
        lesson('', 'transparent', { covered: true }),
        lesson('Mĩ thuật', miThuat),
        empty(),
        empty(),
      ]),
      row('3 (9h20-10h05)', [
        lesson('Ngữ văn 47\nTan 10h35', nguVan, { rowSpan: 2 }),
        lesson('Toán TA\n(207-A)', toanTa, { rowSpan: 2 }),
        lesson('Toán 47\nTan 10h35', toan, { rowSpan: 2 }),
        lesson('Giáo dục thể\nchất', theChat),
        empty(),
        empty(),
      ]),
      row('4 (10h10-10h55)', [
        lesson('Tan 10h35', tan, { covered: true }),
        lesson('', 'transparent', { covered: true }),
        lesson('Tan 10h35', tan, { covered: true }),
        lesson('Giáo dục thể\nchất', theChat),
        empty(),
        empty(),
      ]),
    ],
  };
}

function afternoon(): TableBlock {
  return {
    x: 3.1,
    y: 65.4,
    width: 93.8,
    badge: label('Buổi chiều', '#ffffff', '#2fbe78', 16),
    headers: headers(),
    rows: [
      row('1 (13h-13h45)', [
        lesson('Ngữ văn', nguVan),
        lesson('Toán', toan),
        lesson('Tin học', tin),
        lesson('Ngữ văn', nguVan),
        lesson('Ngữ văn', nguVan),
        empty(),
      ]),
      row('2 (13h50-14h35)', [
        lesson('Khoa học\ntự nhiên', khtn),
        lesson('Khoa học\ntự nhiên', khtn),
        lesson('Khoa học\ntự nhiên', khtn),
        lesson('Lịch sử', su),
        lesson('Ngữ văn', nguVan),
        empty(),
      ]),
      row('3 (14h40-15h25)', [
        lesson('Ngoại ngữ', ngoaiNgu),
        lesson('Công nghệ', congNghe),
        lesson('Khoa học\ntự nhiên', khtn),
        lesson('Ngoại ngữ', ngoaiNgu),
        lesson('Lịch sử', su),
        empty(),
      ]),
      row('4 (15h40-16h25)', [
        lesson('Toán', toan),
        lesson('Địa lý', dia),
        lesson('Toán', toan),
        lesson('Giáo dục địa\nphương', diaPhuong),
        lesson('Toán', toan),
        empty(),
      ]),
      row('5 (16h30-17h15)', [
        lesson('HĐTN', hdtn),
        lesson('Ngoại ngữ', ngoaiNgu),
        lesson('Giáo dục\ncông dân', gdcd),
        empty(),
        lesson('HĐTN', hdtn),
        empty(),
      ]),
    ],
  };
}

const template: ScheduleDoc = {
  version: 1,
  canvasBackground: '#e7f6ff',
  frameColor: '#7ec8f0',
  classTitle: {
    text: 'Lớp 6A01',
    color: '#1578c9',
    background: 'transparent',
    fontSize: 16,
    x: 18,
    y: 1.4,
    width: 64,
  },
  banner: {
    text: 'THỜI KHÓA BIỂU',
    color: '#ffffff',
    background: '#1d84d6',
    fontSize: 16,
    x: 14,
    y: 7.6,
    width: 72,
  },
  morning: morning(),
  afternoon: afternoon(),
};

export function defaultSchedule(): ScheduleDoc {
  return structuredClone(template);
}
