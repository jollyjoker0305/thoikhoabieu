'use client';

import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Inspector } from '@/components/inspector';
import { Poster } from '@/components/poster';
import { capturePoster, saveBlob } from '@/lib/capture-poster';
import { defaultSchedule } from '@/lib/default-schedule';
import { findAnchor, getMergeState, mergeRect, normalizeRect, swapCellContent, unmergeSlot } from '@/lib/schedule';
import type { BlockId, ScheduleDoc, Selection, TableId } from '@/lib/types';

type Hover = { table: TableId; row: number; col: number } | null;

function useNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 960px)');
    const apply = () => setNarrow(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);
  return narrow;
}

function readSlot(x: number, y: number): Hover {
  const node = document.elementFromPoint(x, y)?.closest('[data-slot]') as HTMLElement | null;
  const raw = node?.dataset.slot;
  if (!raw) return null;
  const [table, row, col] = raw.split(':');
  if ((table !== 'morning' && table !== 'afternoon') || row == null || col == null) return null;
  return { table, row: Number(row), col: Number(col) };
}

export function HomeClient({
  initialSchedule,
  initialAdmin,
}: {
  initialSchedule: ScheduleDoc;
  initialAdmin: boolean;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState(initialSchedule);
  const [saved, setSaved] = useState(() => JSON.stringify(initialSchedule));
  const [admin, setAdmin] = useState(initialAdmin);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [hover, setHover] = useState<Hover>(null);
  const [ghost, setGhost] = useState<{ text: string; x: number; y: number } | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const printSheetRef = useRef<HTMLImageElement>(null);
  const printUrlRef = useRef<string | null>(null);
  const narrow = useNarrow();

  const dirty = JSON.stringify(doc) !== saved;
  const merge = getMergeState(doc, selection);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2400);
  }

  async function posterBlob() {
    const poster = canvasRef.current;
    if (!poster) throw new Error('missing poster');
    return capturePoster(poster);
  }

  function pageStyle(size: 'A4' | 'A5') {
    let style = document.getElementById('print-page-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'print-page-style';
      document.head.appendChild(style);
    }
    style.textContent = `@media print { @page { size: ${size} landscape; margin: 0; } }`;
  }

  async function printSize(size: 'A4' | 'A5') {
    if (exporting) return;
    setExporting(true);
    try {
      const blob = await posterBlob();
      const sheet = printSheetRef.current;
      if (!sheet) throw new Error('missing sheet');
      if (printUrlRef.current) URL.revokeObjectURL(printUrlRef.current);
      const url = URL.createObjectURL(blob);
      printUrlRef.current = url;
      sheet.src = url;
      await sheet.decode();
      document.documentElement.classList.remove('print-a4', 'print-a5');
      document.documentElement.classList.add(size === 'A4' ? 'print-a4' : 'print-a5');
      pageStyle(size);
      window.print();
    } catch {
      showToast('Không tạo được bản in');
    } finally {
      setExporting(false);
    }
  }

  async function downloadImage() {
    if (exporting) return;
    setExporting(true);
    try {
      const blob = await posterBlob();
      saveBlob(blob, 'thoi-khoa-bieu-6a01.jpg');
    } catch {
      showToast('Không tải được ảnh');
    } finally {
      setExporting(false);
    }
  }

  function onBlockPointerDown(event: ReactPointerEvent<HTMLElement>, id: BlockId) {
    if (!admin) return;
    event.preventDefault();
    event.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = { x: doc[id].x, y: doc[id].y };
    if (id === 'classTitle' || id === 'banner') setSelection({ kind: id });
    else setSelection({ kind: 'badge', table: id });

    const onMove = (ev: PointerEvent) => {
      if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 3) return;
      const dx = ((ev.clientX - startX) / rect.width) * 100;
      const dy = ((ev.clientY - startY) / rect.height) * 100;
      setDoc((prev) => {
        const next = structuredClone(prev);
        const block = next[id];
        block.x = Math.round(Math.min(100 - block.width, Math.max(0, origin.x + dx)) * 10) / 10;
        block.y = Math.round(Math.min(92, Math.max(0, origin.y + dy)) * 10) / 10;
        return next;
      });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function onCellPointerDown(
    event: ReactPointerEvent<HTMLTableCellElement>,
    table: TableId,
    row: number,
    col: number,
  ) {
    if (!admin) return;
    event.preventDefault();
    event.stopPropagation();
    const anchor = findAnchor(doc[table], row, col);
    const cell = doc[table].rows[anchor.row].cells[anchor.col];

    if (event.shiftKey) {
      setSelection((prev) => {
        if (prev?.kind === 'cells' && prev.table === table) {
          return { ...prev, r2: anchor.row, c2: anchor.col };
        }
        return {
          kind: 'cells',
          table,
          r1: anchor.row,
          c1: anchor.col,
          r2: anchor.row + cell.rowSpan - 1,
          c2: anchor.col + cell.colSpan - 1,
        };
      });
      const onMove = (ev: PointerEvent) => {
        const slot = readSlot(ev.clientX, ev.clientY);
        if (!slot || slot.table !== table) return;
        setSelection((prev) => (prev?.kind === 'cells' ? { ...prev, r2: slot.row, c2: slot.col } : prev));
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      return;
    }

    setSelection({
      kind: 'cells',
      table,
      r1: anchor.row,
      c1: anchor.col,
      r2: anchor.row + cell.rowSpan - 1,
      c2: anchor.col + cell.colSpan - 1,
    });

    const startX = event.clientX;
    const startY = event.clientY;
    let moved = false;
    const onMove = (ev: PointerEvent) => {
      if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 6) return;
      moved = true;
      setGhost({ text: cell.text || '(trống)', x: ev.clientX, y: ev.clientY });
      const slot = readSlot(ev.clientX, ev.clientY);
      setHover(slot && !(slot.table === table && slot.row === anchor.row && slot.col === anchor.col) ? slot : null);
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      const slot = readSlot(ev.clientX, ev.clientY);
      if (moved && slot) {
        setDoc((prev) => swapCellContent(prev, { table, row: anchor.row, col: anchor.col }, slot));
      }
      setGhost(null);
      setHover(null);
      if (!moved && window.matchMedia('(max-width: 960px)').matches) setEditorOpen(true);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function mergeSelected() {
    if (selection?.kind !== 'cells' || !merge.canMerge) return;
    const rect = normalizeRect(selection.r1, selection.c1, selection.r2, selection.c2);
    const result = mergeRect(doc, selection.table, rect);
    setDoc(result.doc);
    setSelection({
      kind: 'cells',
      table: selection.table,
      r1: result.rect.r1,
      c1: result.rect.c1,
      r2: result.rect.r2,
      c2: result.rect.c2,
    });
  }

  function unmergeSelected() {
    if (selection?.kind !== 'cells' || !merge.canUnmerge) return;
    const rect = normalizeRect(selection.r1, selection.c1, selection.r2, selection.c2);
    const result = unmergeSlot(doc, { table: selection.table, row: rect.r1, col: rect.c1 });
    setDoc(result.doc);
    setSelection({
      kind: 'cells',
      table: selection.table,
      r1: result.anchor.row,
      c1: result.anchor.col,
      r2: result.anchor.row,
      c2: result.anchor.col,
    });
  }

  async function save() {
    setBusy(true);
    try {
      const response = await fetch('/api/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc),
      });
      let payload: { error?: string; schedule?: ScheduleDoc } = {};
      try {
        payload = (await response.json()) as { error?: string; schedule?: ScheduleDoc };
      } catch {
        showToast(`Không lưu được (mã ${response.status})`);
        return;
      }
      if (!response.ok || !payload.schedule) {
        showToast(payload.error || `Không lưu được (mã ${response.status})`);
        return;
      }
      setDoc(payload.schedule);
      setSaved(JSON.stringify(payload.schedule));
      showToast('Đã lưu thời khóa biểu');
    } catch {
      showToast('Không kết nối được máy chủ');
    } finally {
      setBusy(false);
    }
  }

  async function discard() {
    if (!confirm('Bỏ mọi thay đổi chưa lưu?')) return;
    const response = await fetch('/api/schedule', { cache: 'no-store' });
    if (!response.ok) {
      showToast('Không tải lại được');
      return;
    }
    const schedule = (await response.json()) as ScheduleDoc;
    setDoc(schedule);
    setSaved(JSON.stringify(schedule));
    setSelection(null);
  }

  function restore() {
    if (!confirm('Khôi phục thời khóa biểu mẫu ban đầu? Bấm Lưu sau đó để xuất bản.')) return;
    setDoc(defaultSchedule());
    setSelection(null);
  }

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setLoginError('');
    setBusy(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        setLoginError('Sai tên đăng nhập hoặc mật khẩu');
        return;
      }
      setAdmin(true);
      setLoginOpen(false);
      setPassword('');
    } catch {
      setLoginError('Không kết nối được máy chủ');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setAdmin(false);
    setSelection(null);
    setEditorOpen(false);
  }

  return (
    <>
    <div className="page">
      <header className="app-bar no-print">
        <div className="bar-actions">
          <button className="btn btn-primary" type="button" disabled={exporting} onClick={() => printSize('A4')}>
            In A4 ngang
          </button>
          <button className="btn btn-primary" type="button" disabled={exporting} onClick={() => printSize('A5')}>
            In A5 ngang
          </button>
          <button className="btn btn-primary" type="button" disabled={exporting} onClick={downloadImage}>
            Tải ảnh
          </button>
          {admin ? (
            <>
            <button
              className={`btn mobile-edit${dirty ? ' btn-save dirty' : ''}`}
              type="button"
              onClick={() => setEditorOpen(true)}
            >
              {dirty ? 'Sửa •' : 'Sửa'}
            </button>
            <div className="edit-actions">
              <button className="btn" type="button" disabled={!merge.canMerge} onClick={mergeSelected}>
                Gộp ô
              </button>
              <button className="btn" type="button" disabled={!merge.canUnmerge} onClick={unmergeSelected}>
                Tách ô
              </button>
              <button className={`btn btn-save${dirty ? ' dirty' : ''}`} type="button" disabled={!dirty || busy} onClick={save}>
                {busy ? 'Đang lưu...' : dirty ? 'Lưu' : 'Đã lưu'}
              </button>
              <button className="btn" type="button" disabled={!dirty} onClick={discard}>
                Bỏ thay đổi
              </button>
              <button className="btn" type="button" onClick={restore}>
                Mẫu gốc
              </button>
              <button className="btn btn-quiet" type="button" onClick={logout}>
                Đăng xuất
              </button>
            </div>
            </>
          ) : (
            <button className="btn" type="button" onClick={() => setLoginOpen(true)}>
              Quản trị
            </button>
          )}
        </div>
      </header>

      <div className={admin ? 'workspace' : 'workspace solo'}>
        <div className="stage">
          <div className="poster-wrap">
            <Poster
              doc={doc}
              admin={admin}
              selection={selection}
              hover={hover}
              canvasRef={canvasRef}
              onCanvasPointerDown={() => admin && setSelection({ kind: 'canvas' })}
              onBlockPointerDown={onBlockPointerDown}
              onSelect={(next) => {
                setSelection(next);
                if (window.matchMedia('(max-width: 960px)').matches) setEditorOpen(true);
              }}
              onCellPointerDown={onCellPointerDown}
            />
          </div>
        </div>
        {admin && !narrow && <Inspector doc={doc} selection={selection} onChange={setDoc} />}
      </div>

      {admin && narrow && editorOpen && (
        <div className="editor-sheet no-print" role="dialog" aria-modal="true" aria-label="Chỉnh sửa thời khóa biểu">
          <div className="editor-sheet-head">
            <h2>Chỉnh sửa</h2>
            <button className="btn btn-quiet" type="button" onClick={() => setEditorOpen(false)}>
              Đóng
            </button>
          </div>
          <div className="editor-sheet-actions">
            <button className="btn" type="button" disabled={!merge.canMerge} onClick={mergeSelected}>
              Gộp ô
            </button>
            <button className="btn" type="button" disabled={!merge.canUnmerge} onClick={unmergeSelected}>
              Tách ô
            </button>
            <button className={`btn btn-save${dirty ? ' dirty' : ''}`} type="button" disabled={!dirty || busy} onClick={save}>
              {busy ? 'Đang lưu...' : dirty ? 'Lưu' : 'Đã lưu'}
            </button>
            <button className="btn" type="button" disabled={!dirty} onClick={discard}>
              Bỏ thay đổi
            </button>
            <button className="btn" type="button" onClick={restore}>
              Mẫu gốc
            </button>
            <button className="btn btn-quiet" type="button" onClick={logout}>
              Đăng xuất
            </button>
          </div>
          <div className="editor-sheet-body">
            <Inspector embedded doc={doc} selection={selection} onChange={setDoc} />
          </div>
        </div>
      )}

      {loginOpen && (
        <div className="modal-backdrop no-print" onMouseDown={() => setLoginOpen(false)}>
          <form
            className="modal"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={login}
          >
            <h2>Đăng nhập quản trị</h2>
            <p>Chỉ tài khoản quản trị mới sửa được thời khóa biểu.</p>
            {loginError && <p className="error">{loginError}</p>}
            <label className="field">
              Tên đăng nhập
              <input value={username} autoFocus onChange={(event) => setUsername(event.target.value)} />
            </label>
            <label className="field">
              Mật khẩu
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <div className="bar-actions">
              <button className="btn btn-primary" type="submit" disabled={busy}>
                Đăng nhập
              </button>
              <button className="btn btn-quiet" type="button" onClick={() => setLoginOpen(false)}>
                Đóng
              </button>
            </div>
          </form>
        </div>
      )}

      {ghost && (
        <div className="ghost no-print" style={{ left: ghost.x, top: ghost.y }}>
          {ghost.text}
        </div>
      )}
      {toast && <div className="toast no-print">{toast}</div>}
    </div>
    <img ref={printSheetRef} className="print-sheet" alt="" />
    </>
  );
}
