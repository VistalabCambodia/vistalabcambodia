import { supabaseClient } from './supabase';

type BackupResult = { filename: string; files: number; bytes: number; warnings: string[] };
type StoredImage = { bucket: string; path: string; contentType: string; base64: string };

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let start = 0; start < bytes.length; start += chunkSize) binary += String.fromCharCode(...bytes.subarray(start, start + chunkSize));
  return btoa(binary);
}

async function listBucketFiles(bucket: string): Promise<{ path: string; contentType: string }[]> {
  if (!supabaseClient) return [];
  const files: { path: string; contentType: string }[] = [];
  const folders = [''];
  while (folders.length) {
    const folder = folders.pop()!;
    let offset = 0;
    while (true) {
      const { data, error } = await supabaseClient.storage.from(bucket).list(folder, { limit: 100, offset });
      if (error) throw error;
      const items = data ?? [];
      for (const item of items) {
        const path = folder ? `${folder}/${item.name}` : item.name;
        if (item.id) files.push({ path, contentType: item.metadata?.mimetype ?? 'application/octet-stream' });
        else folders.push(path);
      }
      if (items.length < 100) break;
      offset += items.length;
    }
  }
  return files;
}

export async function downloadSiteBackup(localData: Record<string, unknown>): Promise<BackupResult> {
  if (!supabaseClient) throw new Error('Supabase is not configured.');
  const warnings: string[] = [];
  const tables: Record<string, Record<string, unknown>[]> = {};
  for (const table of ['products', 'site_content', 'website_events', 'inquiries', 'price_catalogs']) {
    const { data, error } = await supabaseClient.from(table).select('*');
    if (error) warnings.push(`Could not export ${table}: ${error.message}`);
    else tables[table] = (data ?? []) as Record<string, unknown>[];
  }

  const images: StoredImage[] = [];
  let imageBytes = 0;
  for (const bucket of ['product-images', 'site-images']) {
    let files: { path: string; contentType: string }[];
    try { files = await listBucketFiles(bucket); }
    catch (error) {
      warnings.push(`Could not list ${bucket}: ${error instanceof Error ? error.message : 'Unknown storage error'}`);
      continue;
    }
    for (const file of files) {
      const { data, error } = await supabaseClient.storage.from(bucket).download(file.path);
      if (error || !data) {
        warnings.push(`Could not back up ${bucket}/${file.path}: ${error?.message ?? 'Download failed'}`);
        continue;
      }
      const bytes = new Uint8Array(await data.arrayBuffer());
      images.push({ bucket, path: file.path, contentType: data.type || file.contentType, base64: toBase64(bytes) });
      imageBytes += bytes.byteLength;
    }
  }

  const backup = {
    format: 'vistalab-site-backup-supabase-v1',
    createdAt: new Date().toISOString(),
    note: 'Database exports and images are included. Keep this backup file private.',
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
  return { filename, files: images.length, bytes: imageBytes, warnings };
}
