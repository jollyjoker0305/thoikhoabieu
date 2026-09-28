import { toJpeg } from 'html-to-image';

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mime });
}

export async function capturePoster(poster: HTMLElement): Promise<Blob> {
  const stage = poster.closest('.stage') as HTMLElement | null;
  const scrollLeft = stage?.scrollLeft ?? 0;
  if (stage) stage.scrollLeft = 0;

  const rows = [...poster.querySelectorAll<HTMLElement>('.grid-table tr')];
  const tables = [...poster.querySelectorAll<HTMLElement>('.grid-table')];
  const rowHeights = rows.map((row) => row.style.height);
  const spacings = tables.map((table) => table.style.borderSpacing);

  poster.classList.add('is-capturing');
  rows.forEach((row) => {
    row.style.height = getComputedStyle(row).height;
  });
  tables.forEach((table) => {
    table.style.borderSpacing = getComputedStyle(table).borderSpacing;
  });

  try {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    const dataUrl = await toJpeg(poster, {
      quality: 0.92,
      pixelRatio: 2,
      backgroundColor: '#f4fcfe',
      cacheBust: true,
      filter: (node) => !node.classList?.contains('no-print'),
    });
    return dataUrlToBlob(dataUrl);
  } finally {
    rows.forEach((row, index) => {
      row.style.height = rowHeights[index];
    });
    tables.forEach((table, index) => {
      table.style.borderSpacing = spacings[index];
    });
    poster.classList.remove('is-capturing');
    if (stage) stage.scrollLeft = scrollLeft;
  }
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
