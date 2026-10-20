'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  emptyChecklistMemory,
  loadChecklistMemory,
  saveChecklistMemory,
  starterChecklist,
  type ChecklistMemory,
} from '@/lib/checklist';

let cachedMemory: ChecklistMemory | null = null;

export function ChecklistView() {
  const [memory, setMemory] = useState<ChecklistMemory | null>(cachedMemory);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    const loaded = loadChecklistMemory();
    cachedMemory = loaded;
    setMemory(loaded);
  }, []);

  useEffect(() => {
    if (!memory) return;
    cachedMemory = memory;
    saveChecklistMemory(memory);
  }, [memory]);

  if (!memory) return null;

  const hidden = new Set(memory.hidden);
  const visibleStarter = starterChecklist.filter((item) => !hidden.has(item.id));
  const visible = [...visibleStarter, ...memory.custom];
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
    });
  }

  function removeCustom(id: string) {
    update({
      ...memory!,
      custom: memory!.custom.filter((item) => item.id !== id),
      done: memory!.done.filter((item) => item !== id),
    });
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
    update({
      ...memory!,
      custom: [...memory!.custom, { id: `own-${crypto.randomUUID()}`, text }],
    });
    setDraft('');
  }

  return (
    <section className="checklist">
      <header className="checklist-head">
        <h1>Tham quan</h1>
        <p>
          Danh sách gợi ý. Sửa chữ, bỏ dòng, hoặc thêm việc trên máy này. Máy khác không thấy thay đổi đó.
        </p>
        <strong>
          {finished}/{visible.length} đã xong
        </strong>
      </header>

      <ul>
        {visibleStarter.map((item) => (
          <ItemRow
            key={item.id}
            text={memory.overrides[item.id] ?? item.text}
            checked={done.has(item.id)}
            onToggle={() => toggle(item.id)}
            onRewrite={(text) => rewrite(item.id, text)}
            onRemove={() => hideStarter(item.id)}
          />
        ))}
        {memory.custom.map((item) => (
          <ItemRow
            key={item.id}
            text={item.text}
            checked={done.has(item.id)}
            onToggle={() => toggle(item.id)}
            onRewrite={(text) => rewrite(item.id, text)}
            onRemove={() => removeCustom(item.id)}
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
  text,
  checked,
  onToggle,
  onRewrite,
  onRemove,
}: {
  text: string;
  checked: boolean;
  onToggle: () => void;
  onRewrite: (text: string) => void;
  onRemove: () => void;
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
      <li className="check-item">
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
    <li className={checked ? 'check-item done' : 'check-item'}>
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
