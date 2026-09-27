import { promises as fs } from 'fs';
import path from 'path';
import { defaultSchedule } from './default-schedule';
import { parseSchedule } from './schedule';
import type { ScheduleDoc } from './types';

const FILE = path.join(process.cwd(), 'data', 'schedule.json');
const BLOB_PATH = 'schedule.json';

type BlobAccess = 'public' | 'private';

function envValue(name: string): string | undefined {
  const raw = process.env[name]?.trim();
  if (!raw) return undefined;
  const unquoted =
    (raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))
      ? raw.slice(1, -1).trim()
      : raw;
  return unquoted || undefined;
}

function blobToken(): string | undefined {
  return envValue('BLOB_READ_WRITE_TOKEN');
}

function sanitizeBlobEnv() {
  for (const name of ['BLOB_READ_WRITE_TOKEN', 'BLOB_STORE_ID', 'BLOB_ACCESS']) {
    const clean = envValue(name);
    if (clean) process.env[name] = clean;
  }
}

function blobAccess(): BlobAccess {
  return envValue('BLOB_ACCESS') === 'private' ? 'private' : 'public';
}

function blobConfigured(): boolean {
  sanitizeBlobEnv();
  return Boolean(blobToken() || envValue('BLOB_STORE_ID'));
}

async function readBlob(): Promise<string | null> {
  if (!blobConfigured()) return null;
  const { get } = await import('@vercel/blob');
  const access = blobAccess();
  const token = blobToken();
  const attempts: Array<{ token?: string }> = token && envValue('BLOB_STORE_ID') ? [{}, { token }] : [{}];
  for (const attempt of attempts) {
    try {
      const result = await get(BLOB_PATH, {
        access,
        useCache: false,
        ...(attempt.token ? { token: attempt.token } : {}),
      });
      if (result?.statusCode === 200 && result.stream) {
        return new Response(result.stream).text();
      }
    } catch {
      // The automatic Vercel login failed. The read-write token is tried next.
    }
  }
  return null;
}

export async function loadSchedule(): Promise<ScheduleDoc> {
  if (blobConfigured()) {
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

  if (blobConfigured()) {
    const { put } = await import('@vercel/blob');
    const access = blobAccess();
    const token = blobToken();
    const attempts: Array<{ token?: string }> = token && envValue('BLOB_STORE_ID') ? [{}, { token }] : [{}];
    const details: string[] = [];
    for (const attempt of attempts) {
      try {
        await put(BLOB_PATH, json, {
          access,
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: 'application/json',
          cacheControlMaxAge: 60,
          ...(attempt.token ? { token: attempt.token } : {}),
        });
        return 'blob';
      } catch (error) {
        details.push(error instanceof Error ? error.message : 'Không lưu được lên Blob');
      }
    }
    throw new Error([...new Set(details)].join(' — '));
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
