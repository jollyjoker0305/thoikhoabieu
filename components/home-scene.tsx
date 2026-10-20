'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Poster } from '@/components/poster';
import { SiteNav } from '@/components/site-nav';
import { loadChecklistMemory, starterChecklist, visibleChecklist } from '@/lib/checklist';
import type { ScheduleDoc } from '@/lib/types';

export function HomeScene({ schedule }: { schedule: ScheduleDoc }) {
  const posterRef = useRef<HTMLDivElement>(null);

  return (
    <div className="page scene-page">
      <header className="app-bar">
        <SiteNav current="home" />
      </header>
      <main className="scene">
        <h1>Lớp 6A01</h1>
        <div className="scene-grid">
          <Link href="/thoi-khoa-bieu" className="scene-card">
            <div className="scene-card-foot">
              <h2>Thời khóa biểu</h2>
              <span>Mở</span>
            </div>
            <div className="scene-preview" aria-hidden="true">
              <div className="poster-wrap scene-poster-wrap">
                <Poster
                  doc={schedule}
                  admin={false}
                  selection={null}
                  hover={null}
                  canvasRef={posterRef}
                  onCanvasPointerDown={() => {}}
                  onBlockPointerDown={() => {}}
                  onSelect={() => {}}
                  onCellPointerDown={() => {}}
                />
              </div>
            </div>
          </Link>
          <Link href="/bang" className="scene-card">
            <div className="scene-card-foot">
              <h2>Danh sách việc</h2>
              <span>Mở</span>
            </div>
            <ChecklistPreview />
          </Link>
        </div>
      </main>
    </div>
  );
}

function ChecklistPreview() {
  const [lines, setLines] = useState(() =>
    starterChecklist.slice(0, 5).map((item) => ({ id: item.id, text: item.text, done: false })),
  );

  useEffect(() => {
    const memory = loadChecklistMemory();
    const done = new Set(memory.done);
    setLines(
      visibleChecklist(memory)
        .slice(0, 5)
        .map((item) => ({
          id: item.id,
          text: memory.overrides[item.id] ?? item.text,
          done: done.has(item.id),
        })),
    );
  }, []);

  return (
    <div className="scene-list-preview" aria-hidden="true">
      {lines.length === 0 ? <p>Danh sách trống</p> : null}
      {lines.map((line) => (
        <div className={line.done ? 'scene-line done' : 'scene-line'} key={line.id}>
          <span />
          <p>{line.text}</p>
        </div>
      ))}
    </div>
  );
}
