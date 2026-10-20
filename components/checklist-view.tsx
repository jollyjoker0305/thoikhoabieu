'use client';

import { useEffect, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react';
import {
  emptyChecklistMemory,
  loadChecklistMemory,
  saveChecklistMemory,
  starterChecklist,
  starterIds,
  visibleChecklist,
  type ChecklistMemory,
} from '@/lib/checklist';

let cachedMemory: ChecklistMemory | null = null;

export function ChecklistView() {
  const [memory, setMemory] = useState<ChecklistMemory | null>(cachedMemory);
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLUListElement>(null);
  const stopDrag = useRef<(() => void) | null>(null);

  useEffect(() => {
    const loaded = loadChecklistMemory();
    cachedMemory = loaded;
    setMemory(loaded);
  }, []);

  useEffect(() => () => stopDrag.current?.(), []);

  useEffect(() => {
    if (!memory) return;
    cachedMemory = memory;
    saveChecklistMemory(memory);
  }, [memory]);

  if (!memory) return null;

  const visible = visibleChecklist(memory);
  const done = new Set(memory.done);
  const finished = visible.filter((item) => done.has(item.id)).length;

  function update(next: ChecklistMemory) {
    setMemory(next);
  }

  function toggle(id: string) {
    const nextDone = done.has(id) ? memory!.done.filter((item) => item !== id) : [...memory!.done, id];
    update({ ...memory!, done: nextDone });
  }

  function hideStarter(id: string) {
    const overrides = { ...memory!.overrides };
    delete overrides[id];
    update({
      ...memory!,
      hidden: [...memory!.hidden, id],
      done: memory!.done.filter((item) => item !== id),
      overrides,
      order: memory!.order.filter((item) => item !== id),
    });
  }

  function removeCustom(id: string) {
    update({
      ...memory!,
      custom: memory!.custom.filter((item) => item.id !== id),
      done: memory!.done.filter((item) => item !== id),
      order: memory!.order.filter((item) => item !== id),
    });
  }

  function startReorder(event: ReactPointerEvent<HTMLButtonElement>, id: string) {
    if (event.button !== 0) return;
    const list = listRef.current;
    if (!list) return;
    const rows = [...list.querySelectorAll<HTMLElement>(':scope > li[data-id]')];
    const origin = rows.findIndex((row) => row.dataset.id === id);
    if (origin < 0) return;

    event.preventDefault();
    const handle = event.currentTarget;
    const listTop = list.getBoundingClientRect().top;
    const slots = rows.map((row) => {
      const rect = row.getBoundingClientRect();
      return { top: rect.top - listTop + list.scrollTop, height: rect.height };
    });
    const stride = origin < slots.length - 1 ? slots[origin + 1].top - slots[origin].top : slots[origin].height + 8;
    const session = {
      pointerId: event.pointerId,
      origin,
      over: origin,
      startY: event.clientY,
      pointerY: event.clientY,
      startScroll: list.scrollTop,
    };

    list.classList.add('is-sorting');
    rows[origin].classList.add('is-dragging');
    handle.setPointerCapture(event.pointerId);

    const place = (pointerY: number) => {
      const y = pointerY - list.getBoundingClientRect().top + list.scrollTop;
      let over = origin;
      const originMid = slots[origin].top + slots[origin].height / 2;
      if (y >= originMid) {
        for (let index = origin + 1; index < slots.length; index += 1) {
          if (y > slots[index].top + slots[index].height / 2) over = index;
        }
      } else {
        for (let index = origin - 1; index >= 0; index -= 1) {
          if (y < slots[index].top + slots[index].height / 2) over = index;
        }
      }
      session.over = over;
      rows.forEach((row, index) => {
        let shift = 0;
        if (index === origin) shift = pointerY - session.startY + (list.scrollTop - session.startScroll);
        else if (over > origin && index > origin && index <= over) shift = -stride;
        else if (over < origin && index < origin && index >= over) shift = stride;
        row.style.transform = shift ? `translateY(${shift}px)` : '';
      });
    };

    let frame = 0;
    const tick = () => {
      const rect = list.getBoundingClientRect();
      if (session.pointerY < rect.top + 56) list.scrollTop -= 10;
      else if (session.pointerY > rect.bottom - 56) list.scrollTop += 10;
      place(session.pointerY);
      frame = requestAnimationFrame(tick);
    };

    const finish = (commit: boolean) => {
      cancelAnimationFrame(frame);
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onCancel);
      stopDrag.current = null;
      rows.forEach((row) => {
        row.style.transform = '';
        row.classList.remove('is-dragging');
      });
      list.classList.remove('is-sorting');
      if (!commit || session.over === origin) return;
      const ids = visible.map((item) => item.id);
      const [moved] = ids.splice(origin, 1);
      ids.splice(session.over, 0, moved);
      update({ ...memory!, order: ids });
    };

    const onMove = (pointer: PointerEvent) => {
      if (pointer.pointerId !== session.pointerId) return;
      session.pointerY = pointer.clientY;
      place(pointer.clientY);
    };
    const onUp = (pointer: PointerEvent) => {
      if (pointer.pointerId !== session.pointerId) return;
      finish(true);
    };
    const onCancel = (pointer: PointerEvent) => {
      if (pointer.pointerId !== session.pointerId) return;
      finish(false);
    };

    stopDrag.current = () => finish(false);
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onCancel);
    frame = requestAnimationFrame(tick);
  }

  function rewrite(id: string, text: string) {
    const trimmed = text.trim().slice(0, 200);
    if (!trimmed) return;
    const starter = starterChecklist.find((item) => item.id === id);
    if (starter) {
      const overrides = { ...memory!.overrides };
      if (trimmed === starter.text) delete overrides[id];
      else overrides[id] = trimmed;
      update({ ...memory!, overrides });
      return;
    }
    update({
      ...memory!,
      custom: memory!.custom.map((item) => (item.id === id ? { ...item, text: trimmed } : item)),
    });
  }

  function addCustom(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim().slice(0, 200);
    if (!text) return;
    const id = `own-${crypto.randomUUID()}`;
    update({
      ...memory!,
      custom: [...memory!.custom, { id, text }],
      order: [...visible.map((item) => item.id), id],
    });
    setDraft('');
  }

  return (
    <section className="checklist">
      <header className="checklist-head">
        <h1>Danh sách việc</h1>
        <p>
        Danh sách dùng cho mọi việc. Kéo dấu chấm để đổi thứ tự. Sửa, bỏ, hoặc thêm việc chỉ lưu trên máy này.
        </p>
        <strong>
          {finished}/{visible.length} đã xong
        </strong>
      </header>

      <ul ref={listRef}>
        {visible.map((item) => (
          <ItemRow
            key={item.id}
            id={item.id}
            text={memory.overrides[item.id] ?? item.text}
            checked={done.has(item.id)}
            onToggle={() => toggle(item.id)}
            onRewrite={(text) => rewrite(item.id, text)}
            onRemove={() => (starterIds.has(item.id) ? hideStarter(item.id) : removeCustom(item.id))}
            onDragStart={(event) => startReorder(event, item.id)}
          />
        ))}
      </ul>
      <form className="checklist-add" onSubmit={addCustom}>
        <input
          value={draft}
          maxLength={200}
          placeholder="Thêm việc cần nhớ"
          aria-label="Thêm việc cần nhớ"
          onChange={(event) => setDraft(event.target.value)}
        />
        <button className="btn btn-primary" type="submit" disabled={!draft.trim()}>
          Thêm
        </button>
      </form>

      {visible.length === 0 ? (
        <button className="btn" type="button" onClick={() => update(emptyChecklistMemory())}>
          Hiện lại danh sách gợi ý
        </button>
      ) : null}
    </section>
  );
}

function ItemRow({
  id,
  text,
  checked,
  onToggle,
  onRewrite,
  onRemove,
  onDragStart,
}: {
  id: string;
  text: string;
  checked: boolean;
  onToggle: () => void;
  onRewrite: (text: string) => void;
  onRemove: () => void;
  onDragStart: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(text);

  function start() {
    setValue(text);
    setEditing(true);
  }

  function save(event: FormEvent) {
    event.preventDefault();
    const next = value.trim().slice(0, 200);
    if (!next) return;
    if (next !== text) onRewrite(next);
    setEditing(false);
  }

  if (editing) {
    return (
      <li className="check-item" data-id={id}>
        <form className="check-edit" onSubmit={save}>
          <textarea
            value={value}
            maxLength={200}
            rows={3}
            aria-label="Sửa nội dung"
            autoFocus
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setEditing(false);
            }}
          />
          <div className="check-edit-actions">
            <button className="btn btn-primary" type="submit" disabled={!value.trim()}>
              Xong
            </button>
            <button className="btn btn-quiet" type="button" onClick={() => setEditing(false)}>
              Hủy
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className={checked ? 'check-item done' : 'check-item'} data-id={id}>
      <button className="check-drag" type="button" aria-label="Kéo để đổi thứ tự" onPointerDown={onDragStart}>
        <svg viewBox="0 0 14 22" width="14" height="22" aria-hidden="true" fill="currentColor">
          <circle cx="3" cy="3" r="1.7" />
          <circle cx="11" cy="3" r="1.7" />
          <circle cx="3" cy="11" r="1.7" />
          <circle cx="11" cy="11" r="1.7" />
          <circle cx="3" cy="19" r="1.7" />
          <circle cx="11" cy="19" r="1.7" />
        </svg>
      </button>
      <label>
        <input type="checkbox" checked={checked} onChange={onToggle} />
        <span>{text}</span>
      </label>
      <button className="btn btn-quiet" type="button" onClick={start}>
        Sửa
      </button>
      <button className="btn btn-quiet" type="button" onClick={onRemove}>
        Bỏ
      </button>
    </li>
  );
}
