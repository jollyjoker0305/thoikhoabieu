'use client';

import { ChecklistView } from '@/components/checklist-view';
import { SiteNav } from '@/components/site-nav';

export function ChecklistPage() {
  return (
    <div className="page">
      <header className="app-bar no-print">
        <SiteNav current="board" />
      </header>
      <ChecklistView />
    </div>
  );
}
