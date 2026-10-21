const apiBase = String(import.meta.env.VITE_CLOUDFLARE_API_URL ?? '').replace(/\/+$/, '');
const sessionKey = 'vistalab.cloudflare.session';

export type ApiSession = { token: string; email: string };

function getToken(): string {
  try { return window.sessionStorage.getItem(sessionKey) ?? ''; } catch { return ''; }
}

export function isCloudflareConfigured(): boolean {
  return Boolean(apiBase);
}

export function clearCloudflareSession(): void {
  try { window.sessionStorage.removeItem(sessionKey); } catch { /* Session storage can be disabled. */ }
}

export async function apiRequest<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  if (!apiBase) throw new Error('Cloudflare API is not configured.');
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('content-type') && !(init.body instanceof Blob)) headers.set('content-type', 'application/json');
  const token = getToken();
  if (token) headers.set('authorization', `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`${apiBase}${path.startsWith('/') ? path : `/${path}`}`, { ...init, headers });
  } catch {
    throw new Error('Could not connect to the Cloudflare API. Please try again.');
  }
  const result = await response.json().catch(() => null) as T | { error?: string } | null;
  if (!response.ok) throw new Error((result && typeof result === 'object' && 'error' in result && result.error) || `Cloudflare API request failed (${response.status}).`);
  return result as T;
}

export async function signInToCloudflare(email: string, password: string): Promise<ApiSession> {
  const session = await apiRequest<ApiSession>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  try { window.sessionStorage.setItem(sessionKey, session.token); }
  catch { throw new Error('Could not save this sign-in session in your browser.'); }
  return session;
}

export async function readCloudflareSession(): Promise<{ email: string } | null> {
  if (!getToken()) return null;
  try { return await apiRequest<{ email: string }>('/api/auth/session'); }
  catch { clearCloudflareSession(); return null; }
}

export async function uploadCloudflareImage(key: string, image: string): Promise<string> {
  const blob = await fetch(image).then((response) => response.blob());
  const result = await apiRequest<{ url: string }>(`/api/media`, {
    method: 'PUT',
    headers: { 'content-type': blob.type || 'image/webp', 'x-media-key': key },
    body: blob
  });
  return new URL(result.url, `${apiBase}/`).toString();
}

export function cloudflareMediaUrl(key: string): string {
  return new URL(`/media/${key.split('/').map(encodeURIComponent).join('/')}`, `${apiBase}/`).toString();
}
