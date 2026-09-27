import { promises as fs } from 'fs';
import path from 'path';
import { defaultSchedule } from './default-schedule';
import { parseSchedule } from './schedule';
import type { ScheduleDoc } from './types';

const FILE = path.join(process.cwd(), 'data', 'schedule.json');
const BLOB_PATH = 'schedule.json';

type BlobAccess = 'public' | 'private';

function blobAccess(): BlobAccess {
  return process.env.BLOB_ACCESS === 'private' ? 'private' : 'public';
}

async function readBlob(): Promise<string | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  const { get } = await import('@vercel/blob');
  const result = await get(BLOB_PATH, { access: blobAccess(), useCache: false });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  return new Response(result.stream).text();
}

export async function loadSchedule(): Promise<ScheduleDoc> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const text = await readBlob();
      if (text) {
        const parsed = parseSchedule(JSON.parse(text));
        if (parsed) return parsed;
      }
    } catch {
      // First deploy has no blob yet. Fall through to the file, then the built-in timetable.
    }
  }

  try {
    const text = await fs.readFile(FILE, 'utf8');
    const parsed = parseSchedule(JSON.parse(text));
    if (parsed) return parsed;
  } catch {
    // No local override yet.
  }

  return defaultSchedule();
}

export async function saveSchedule(doc: ScheduleDoc): Promise<'blob' | 'file'> {
  const clean = parseSchedule(doc);
  if (!clean) throw new Error('Dữ liệu không hợp lệ');
  const json = JSON.stringify(clean);

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import('@vercel/blob');
    await put(BLOB_PATH, json, {
      access: blobAccess(),
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
      cacheControlMaxAge: 60,
    });
    return 'blob';
  }

  try {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, json, 'utf8');
    return 'file';
  } catch {
    throw new Error(
      'Không ghi được thời khóa biểu. Trên Vercel, vào Storage và tạo Blob store (miễn phí trên gói Hobby) rồi redeploy.',
    );
  }
}
