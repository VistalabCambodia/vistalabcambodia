import { supabaseClient } from './supabase';

type BackupResult = { filename: string; files: number; bytes: number; warnings: string[] };

async function readAllRows(table: string): Promise<Record<string, unknown>[]> {
  if (!supabaseClient) throw new Error('Supabase is not configured.');
  const rows: Record<string, unknown>[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabaseClient.from(table).select('*').range(offset, offset + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...((data ?? []) as Record<string, unknown>[]));
    if (!data || data.length < pageSize) return rows;
  }
}

async function listBucketFiles(bucket: string): Promise<{ name: string; bytes: number }[]> {
  if (!supabaseClient) throw new Error('Supabase is not configured.');
  const files: { name: string; bytes: number }[] = [];
  const folders = [''];
  while (folders.length) {
    const folder = folders.pop()!;
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await supabaseClient.storage.from(bucket).list(folder, { limit: 100, offset });
      if (error) throw new Error(`${bucket}: ${error.message}`);
      const items = data ?? [];
      for (const item of items) {
        const name = folder ? `${folder}/${item.name}` : item.name;
        if (item.id) files.push({ name, bytes: Number(item.metadata?.size ?? 0) });
        else folders.push(name);
      }
      if (items.length < 100) break;
    }
  }
  return files;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let start = 0; start < bytes.length; start += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(start, start + chunkSize));
  }
  return btoa(binary);
}

export async function downloadSiteBackup(localData: Record<string, unknown>): Promise<BackupResult> {
  if (!supabaseClient) throw new Error('Supabase is not configured.');
  const warnings: string[] = [];
  const tables: Record<string, Record<string, unknown>[]> = {};
  for (const table of ['products', 'site_content', 'website_events']) {
    try {
      tables[table] = await readAllRows(table);
    } catch (error) {
      if (table === 'website_events') warnings.push(error instanceof Error ? error.message : 'Traffic history could not be backed up.');
      else throw error;
    }
  }

  const images: Record<string, { contentType: string; base64: string }> = {};
  let imageBytes = 0;
  for (const bucket of ['site-images', 'product-images']) {
    const files = await listBucketFiles(bucket);
    for (const file of files) {
      const { data, error } = await supabaseClient.storage.from(bucket).download(file.name);
      if (error || !data) throw new Error(`Could not back up ${bucket}/${file.name}: ${error?.message ?? 'Download failed.'}`);
      const bytes = new Uint8Array(await data.arrayBuffer());
      images[`${bucket}/${file.name}`] = { contentType: data.type || 'application/octet-stream', base64: toBase64(bytes) };
      imageBytes += bytes.byteLength;
    }
  }

  const backup = {
    format: 'vistalab-site-backup-v1',
    createdAt: new Date().toISOString(),
    note: 'Images are included as Base64 data. Keep this backup file private.',
    tables,
    localData,
    images
  };
  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
  const filename = `vistalab-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return { filename, files: Object.keys(images).length, bytes: imageBytes, warnings };
}
