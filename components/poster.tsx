import type { CSSProperties, PointerEvent as ReactPointerEvent, RefObject } from 'react';
import { cellIntersects, normalizeRect } from '@/lib/schedule';
import type { BlockId, Cell, ScheduleDoc, Selection, TableId, TextStyle } from '@/lib/types';

type Hover = { table: TableId; row: number; col: number } | null;

type PosterProps = {
  doc: ScheduleDoc;
  admin: boolean;
  selection: Selection | null;
  hover: Hover;
  canvasRef: RefObject<HTMLDivElement | null>;
  onCanvasPointerDown: () => void;
  onBlockPointerDown: (event: ReactPointerEvent<HTMLElement>, id: BlockId) => void;
  onSelect: (selection: Selection) => void;
  onCellPointerDown: (event: ReactPointerEvent<HTMLTableCellElement>, table: TableId, row: number, col: number) => void;
};

function paint(style: TextStyle): CSSProperties {
  return {
    color: style.color,
    background: style.background,
    fontSize: `${style.fontSize}px`,
  };
}

function place(block: { x: number; y: number; width: number }): CSSProperties {
  return { left: `${block.x}%`, top: `${block.y}%`, width: `${block.width}%` };
}

function mergeLabel(cell: Cell) {
  if (cell.rowSpan < 2 && cell.colSpan < 2) return null;
  if (cell.colSpan < 2) return `${cell.rowSpan} tiết`;
  if (cell.rowSpan < 2) return `${cell.colSpan} ngày`;
  return `${cell.rowSpan}×${cell.colSpan}`;
}

function TableView({
  doc,
  tableId,
  admin,
  selection,
  hover,
  onBlockPointerDown,
  onSelect,
  onCellPointerDown,
}: {
  doc: ScheduleDoc;
  tableId: TableId;
  admin: boolean;
  selection: Selection | null;
  hover: Hover;
  onBlockPointerDown: PosterProps['onBlockPointerDown'];
  onSelect: PosterProps['onSelect'];
  onCellPointerDown: PosterProps['onCellPointerDown'];
}) {
  const table = doc[tableId];
  const range =
    selection?.kind === 'cells' && selection.table === tableId
      ? normalizeRect(selection.r1, selection.c1, selection.r2, selection.c2)
      : null;

  return (
    <section className="table-block" style={place(table)}>
      {admin && (
        <span
          className="move-handle no-print"
          title="Kéo để di chuyển bảng"
          onPointerDown={(event) => onBlockPointerDown(event, tableId)}
        >
          ⋮⋮
        </span>
      )}
      <div className="table-card">
        <table className={`grid-table${tableId === 'morning' ? ' morning' : ''}`}>
          <colgroup>
            <col style={{ width: '18%' }} />
            {Array.from({ length: 6 }, (_, index) => (
              <col key={index} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {table.headers.map((header, index) => (
                <th
                  key={index}
                  className={`head-cell${index === 0 ? ' time-col' : ''}${
                    selection?.kind === 'header' && selection.table === tableId && selection.index === index
                      ? ' chosen'
                      : ''
                  }`}
                  style={paint(header)}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    if (admin) onSelect({ kind: 'header', table: tableId, index });
                  }}
                >
                  {header.text}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <th
                  className={`period-cell time-col${
                    selection?.kind === 'period' && selection.table === tableId && selection.row === rowIndex
                      ? ' chosen'
                      : ''
                  }`}
                  style={paint(row.period)}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    if (admin) onSelect({ kind: 'period', table: tableId, row: rowIndex });
                  }}
                >
                  {row.period.text}
                </th>
                {row.cells.map((cell, col) => {
                  if (cell.covered) return null;
                  const inRange = range ? cellIntersects(rowIndex, col, cell, range) : false;
                  const isHover = hover?.table === tableId && hover.row === rowIndex && hover.col === col;
                  const flag = admin ? mergeLabel(cell) : null;
                  return (
                    <td
                      key={col}
                      className={`slot${inRange ? ' chosen' : ''}${isHover ? ' drop-target' : ''}`}
                      style={paint(cell)}
                      rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
                      colSpan={cell.colSpan > 1 ? cell.colSpan : undefined}
                      data-slot={`${tableId}:${rowIndex}:${col}`}
                      onPointerDown={(event) => onCellPointerDown(event, tableId, rowIndex, col)}
                    >
                      {cell.text}
                      {flag && <span className="merge-flag no-print">{flag}</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function Poster({
  doc,
  admin,
  selection,
  hover,
  canvasRef,
  onCanvasPointerDown,
  onBlockPointerDown,
  onSelect,
  onCellPointerDown,
}: PosterProps) {
  return (
    <div
      ref={canvasRef}
      className={`poster${admin ? ' is-admin' : ''}`}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onCanvasPointerDown();
      }}
    >
      <TableView
        doc={doc}
        tableId="morning"
        admin={admin}
        selection={selection}
        hover={hover}
        onBlockPointerDown={onBlockPointerDown}
        onSelect={onSelect}
        onCellPointerDown={onCellPointerDown}
      />
      <TableView
        doc={doc}
        tableId="afternoon"
        admin={admin}
        selection={selection}
        hover={hover}
        onBlockPointerDown={onBlockPointerDown}
        onSelect={onSelect}
        onCellPointerDown={onCellPointerDown}
      />
      <img className="poster-bg" src="/poster-bg.png" alt="" />
    </div>
  );
}
