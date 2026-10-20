import type { Metadata } from 'next';
import { ChecklistPage } from '@/components/checklist-page';

export const metadata: Metadata = {
  title: 'Danh sách việc',
  description: 'Bảng việc lớp 6A01. Mỗi máy tự nhớ mục đã sửa.',
};

export default function Page() {
  return <ChecklistPage />;
}
