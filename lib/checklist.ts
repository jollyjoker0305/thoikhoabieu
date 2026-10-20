export type ChecklistItem = {
  id: string;
  text: string;
};

export const starterChecklist: ChecklistItem[] = [
  { id: 'socks', text: 'Tất chống trượt (loại có chấm cao su để chơi trò chơi)' },
  { id: 'bottle', text: 'Bình nước cá nhân (để lấy nước từ bình lớn ở lán)' },
  { id: 'fan', text: 'Quạt cầm tay / quạt pin (nhà hàng không có điều hòa)' },
  { id: 'hat', text: 'Mũ nón, ô che nắng mưa' },
  { id: 'clothes', text: '1 bộ quần áo dự phòng để thay khi ra mồ hôi' },
  { id: 'shoes', text: 'Đi giày thể thao thoải mái' },
  { id: 'breakfast', text: 'Ăn sáng tự túc: Ưu tiên đồ đóng gói gọn nhẹ mang lên xe ăn' },
  { id: 'cash', text: 'Khoảng 50k - 100k nếu muốn chơi Trượt phao (50k/lượt) hoặc mua nước mát' },
];

export const starterIds = new Set(starterChecklist.map((item) => item.id));

const starterText = new Map(starterChecklist.map((item) => [item.id, item.text]));

export type CustomItem = {
  id: string;
  text: string;
};

export type ChecklistMemory = {
  hidden: string[];
  custom: CustomItem[];
  done: string[];
  overrides: Record<string, string>;
  order: string[];
};

export const emptyChecklistMemory = (): ChecklistMemory => ({
  hidden: [],
  custom: [],
  done: [],
  overrides: {},
  order: [],
});

export function visibleChecklist(memory: ChecklistMemory): ChecklistItem[] {
  const hidden = new Set(memory.hidden);
  const starters = starterChecklist.filter((item) => !hidden.has(item.id));
  const byId = new Map<string, ChecklistItem>();
  for (const item of starters) byId.set(item.id, item);
  for (const item of memory.custom) byId.set(item.id, item);

  const seen = new Set<string>();
  const ordered: ChecklistItem[] = [];
  for (const id of memory.order) {
    const item = byId.get(id);
    if (!item || seen.has(id)) continue;
    seen.add(id);
    ordered.push(item);
  }
  for (const item of [...starters, ...memory.custom]) {
    if (seen.has(item.id)) continue;
    ordered.push(item);
  }
  return ordered;
}

const STORAGE_KEY = 'tkb-checklist-v1';

export function loadChecklistMemory(): ChecklistMemory {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyChecklistMemory();
    const parsed = JSON.parse(raw) as Partial<ChecklistMemory>;
    const hidden = Array.isArray(parsed.hidden)
      ? parsed.hidden.filter((id): id is string => typeof id === 'string' && starterIds.has(id))
      : [];
    const custom = Array.isArray(parsed.custom)
      ? parsed.custom.flatMap((item) => {
          if (!item || typeof item.id !== 'string' || typeof item.text !== 'string') return [];
          const text = item.text.trim().slice(0, 200);
          if (!text || !item.id.startsWith('own-')) return [];
          return [{ id: item.id, text }];
        })
      : [];
    const known = new Set([...starterIds, ...custom.map((item) => item.id)]);
    const done = Array.isArray(parsed.done)
      ? parsed.done.filter((id): id is string => typeof id === 'string' && known.has(id) && !hidden.includes(id))
      : [];
    const overrides: Record<string, string> = {};
    if (parsed.overrides && typeof parsed.overrides === 'object' && !Array.isArray(parsed.overrides)) {
      for (const [id, text] of Object.entries(parsed.overrides)) {
        if (!starterIds.has(id) || hidden.includes(id) || typeof text !== 'string') continue;
        const trimmed = text.trim().slice(0, 200);
        if (!trimmed || trimmed === starterText.get(id)) continue;
        overrides[id] = trimmed;
      }
    }
    const seen = new Set<string>();
    const order = Array.isArray(parsed.order)
      ? parsed.order.flatMap((id) => {
          if (typeof id !== 'string' || !known.has(id) || hidden.includes(id) || seen.has(id)) return [];
          seen.add(id);
          return [id];
        })
      : [];
    return { hidden, custom, done, overrides, order };
  } catch {
    return emptyChecklistMemory();
  }
}

export function saveChecklistMemory(memory: ChecklistMemory) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
}
