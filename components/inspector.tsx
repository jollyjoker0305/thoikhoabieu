import { frameOf, getMergeState, patchFrame, patchSelection, selectedAnchors } from '@/lib/schedule';
import type { ScheduleDoc, Selection, TextStyle } from '@/lib/types';

type InspectorProps = {
  doc: ScheduleDoc;
  selection: Selection | null;
  onChange: (doc: ScheduleDoc) => void;
  embedded?: boolean;
};

function firstStyle(doc: ScheduleDoc, selection: Selection): TextStyle | null {
  if (selection.kind === 'classTitle') return doc.classTitle;
  if (selection.kind === 'banner') return doc.banner;
  if (selection.kind === 'badge') return doc[selection.table].badge;
  if (selection.kind === 'header') return doc[selection.table].headers[selection.index];
  if (selection.kind === 'period') return doc[selection.table].rows[selection.row].period;
  if (selection.kind === 'cells') {
    const anchors = selectedAnchors(doc, selection);
    if (anchors.length === 0) return null;
    return doc[anchors[0].table].rows[anchors[0].row].cells[anchors[0].col];
  }
  return null;
}

export function Inspector({ doc, selection, onChange, embedded = false }: InspectorProps) {
  const shell = `inspector no-print${embedded ? ' embedded' : ''}`;
  if (!selection) {
    return (
      <aside className={shell}>
        <h2>Chỉnh sửa</h2>
        <p>Bấm vào tiêu đề, nhãn buổi, hoặc một ô môn để sửa chữ, màu và cỡ chữ.</p>
      </aside>
    );
  }

  if (selection.kind === 'canvas') {
    return (
      <aside className={shell}>
        <h2>Nền tờ thời khóa biểu</h2>
        <label className="field">
          Màu nền
          <span className="color-row">
            <input
              type="color"
              value={doc.canvasBackground}
              onChange={(event) => onChange({ ...doc, canvasBackground: event.target.value })}
            />
            <input
              type="text"
              value={doc.canvasBackground}
              maxLength={7}
              onChange={(event) => {
                if (/^#[0-9a-fA-F]{6}$/.test(event.target.value)) {
                  onChange({ ...doc, canvasBackground: event.target.value.toLowerCase() });
                }
              }}
            />
          </span>
        </label>
        <label className="field">
          Màu viền
          <span className="color-row">
            <input
              type="color"
              value={doc.frameColor}
              onChange={(event) => onChange({ ...doc, frameColor: event.target.value })}
            />
            <input
              type="text"
              value={doc.frameColor}
              maxLength={7}
              onChange={(event) => {
                if (/^#[0-9a-fA-F]{6}$/.test(event.target.value)) {
                  onChange({ ...doc, frameColor: event.target.value.toLowerCase() });
                }
              }}
            />
          </span>
        </label>
      </aside>
    );
  }

  const style = firstStyle(doc, selection);
  if (!style) return null;
  const many = selection.kind === 'cells' && selectedAnchors(doc, selection).length > 1;
  const merge = getMergeState(doc, selection);
  const frame = frameOf(selection);
  const block = frame ? doc[frame] : null;

  function patch(partial: Partial<TextStyle>) {
    onChange(patchSelection(doc, selection!, partial));
  }

  return (
    <aside className={shell}>
      <h2>{many ? `Đang chọn ${merge.rows} tiết × ${merge.cols} ngày` : 'Nội dung đang chọn'}</h2>
      {selection.kind === 'cells' && merge.canUnmerge && (
        <p>
          Ô này đang gộp {merge.rows} tiết
          {merge.cols > 1 ? ` và ${merge.cols} ngày` : ''}. Bấm Tách ô để trả về từng tiết. Chữ cũ của mỗi ô được giữ lại.
        </p>
      )}
      {many && <p>Bấm Gộp ô để nhập thành một ô. Kéo ô để đổi nội dung sang chỗ khác.</p>}

      {!many && (
        <label className="field">
          Chữ
          <textarea
            value={style.text}
            maxLength={200}
            onChange={(event) => patch({ text: event.target.value })}
          />
        </label>
      )}

      <label className="field">
        Màu chữ
        <span className="color-row">
          <input type="color" value={style.color} onChange={(event) => patch({ color: event.target.value })} />
          <input type="text" value={style.color} readOnly />
        </span>
      </label>

      <label className="field">
        Màu nền
        <span className="color-row">
          <input
            type="color"
            value={style.background === 'transparent' ? '#ffffff' : style.background}
            onChange={(event) => patch({ background: event.target.value })}
          />
          <input type="text" value={style.background} readOnly />
        </span>
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={style.background === 'transparent'}
          onChange={(event) => patch({ background: event.target.checked ? 'transparent' : '#ffffff' })}
        />
        Không nền
      </label>

      <label className="field">
        Cỡ chữ ({Math.round(style.fontSize)}px)
        <input
          className="slider"
          type="range"
          min={12}
          max={32}
          step={1}
          value={style.fontSize}
          onChange={(event) => patch({ fontSize: Number(event.target.value) })}
        />
      </label>

      {block && (
        <>
          <label className="field">
            Vị trí ngang ({block.x.toFixed(1)}%)
            <input
              className="slider"
              type="range"
              min={0}
              max={80}
              step={0.5}
              value={block.x}
              onChange={(event) => onChange(patchFrame(doc, frame!, { x: Number(event.target.value) }))}
            />
          </label>
          <label className="field">
            Vị trí dọc ({block.y.toFixed(1)}%)
            <input
              className="slider"
              type="range"
              min={0}
              max={90}
              step={0.5}
              value={block.y}
              onChange={(event) => onChange(patchFrame(doc, frame!, { y: Number(event.target.value) }))}
            />
          </label>
          <label className="field">
            Chiều rộng ({block.width.toFixed(1)}%)
            <input
              className="slider"
              type="range"
              min={30}
              max={100}
              step={0.5}
              value={block.width}
              onChange={(event) => onChange(patchFrame(doc, frame!, { width: Number(event.target.value) }))}
            />
          </label>
        </>
      )}
    </aside>
  );
}
