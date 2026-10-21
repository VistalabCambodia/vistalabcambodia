/// <reference path="../worker-configuration.d.ts" />

interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  ALLOWED_ORIGINS: string;
  SESSION_SECRET: string;
}

type Session = { email: string; exp: number };

const encoder = new TextEncoder();
const json = (value: unknown, status = 200, headers: HeadersInit = {}) => new Response(JSON.stringify(value), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }
});

function corsHeaders(request: Request, env: Env): Headers {
  const headers = new Headers({ 'vary': 'Origin', 'access-control-allow-methods': 'GET,POST,PUT,PATCH,OPTIONS', 'access-control-allow-headers': 'authorization,content-type,x-media-key' });
  const origin = request.headers.get('origin');
  const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((item) => item.trim()).filter(Boolean);
  if (origin && allowed.includes(origin)) headers.set('access-control-allow-origin', origin);
  return headers;
}

function decodeBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

function encodeBase64Url(value: Uint8Array): string {
  let binary = '';
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return encodeBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(payload))));
}

async function getSession(request: Request, env: Env): Promise<Session | null> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !env.SESSION_SECRET) return null;
  if (await sign(payload, env.SESSION_SECRET) !== signature) return null;
  try {
    const session = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload))) as Session;
    return session.exp > Date.now() ? session : null;
  } catch { return null; }
}

async function requireAdmin(request: Request, env: Env): Promise<Session | Response> {
  const session = await getSession(request, env);
  return session ?? json({ error: 'Admin sign-in required.' }, 401);
}

async function verifyPassword(password: string, saltHex: string, expectedHex: string): Promise<boolean> {
  const salt = Uint8Array.from(saltHex.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16));
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const actual = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 210_000 }, key, 256));
  const expected = Uint8Array.from(expectedHex.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16));
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index];
  return difference === 0;
}

async function readJson(request: Request): Promise<Record<string, any>> {
  const value: unknown = await request.json();
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a JSON object.');
  return value as Record<string, any>;
}

async function uploadImage(request: Request, env: Env): Promise<Response> {
  const user = await requireAdmin(request, env);
  if (user instanceof Response) return user;
  const key = request.headers.get('x-media-key') ?? '';
  if (!key || key.length > 500 || key.startsWith('/') || key.split('/').some((part) => !part || part === '.' || part === '..')) return json({ error: 'Invalid media key.' }, 400);
  const contentType = request.headers.get('content-type') ?? '';
  if (!['image/webp', 'image/png', 'image/jpeg', 'image/avif'].includes(contentType.split(';')[0])) return json({ error: 'Unsupported image type.' }, 415);
  if (Number(request.headers.get('content-length') ?? 0) > 5 * 1024 * 1024) return json({ error: 'Image exceeds the 5 MB limit.' }, 413);
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > 5 * 1024 * 1024) return json({ error: 'Image exceeds the 5 MB limit.' }, 413);
  await env.MEDIA.put(key, bytes, { httpMetadata: { contentType, cacheControl: 'public, max-age=31536000, immutable' } });
  return json({ url: `${new URL(request.url).origin}/media/${key}?v=${Date.now()}` }, 201);
}

async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const method = request.method.toUpperCase();

  if (path === '/api/auth/login' && method === 'POST') {
    const body = await readJson(request);
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const admin = await env.DB.prepare('SELECT email, password_salt, password_hash FROM admin_users WHERE email = ? COLLATE NOCASE').bind(email).first<{ email: string; password_salt: string; password_hash: string }>();
    if (!admin || !(await verifyPassword(password, admin.password_salt, admin.password_hash))) return json({ error: 'Email or password is incorrect.' }, 401);
    const payload = encodeBase64Url(encoder.encode(JSON.stringify({ email: admin.email, exp: Date.now() + 12 * 60 * 60 * 1000 })));
    return json({ token: `${payload}.${await sign(payload, env.SESSION_SECRET)}`, email: admin.email });
  }

  if (path === '/api/auth/session' && method === 'GET') {
    const user = await getSession(request, env);
    return user ? json({ email: user.email }) : json({ error: 'Session expired.' }, 401);
  }

  if (path === '/api/products' && method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM products ORDER BY name_en').all();
    return json(results);
  }
  if (path.startsWith('/api/products/') && method === 'PUT') {
    const user = await requireAdmin(request, env);
    if (user instanceof Response) return user;
    const product = await readJson(request);
    const id = decodeURIComponent(path.slice('/api/products/'.length));
    if (!id || id.length > 120 || product.id !== id) return json({ error: 'Invalid product ID.' }, 400);
    await env.DB.prepare(`INSERT INTO products (id,name_en,name_kh,brand,category,origin,sizes,specs,specs_kh,featured,image_bg,image_badge,image_url,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      ON CONFLICT(id) DO UPDATE SET name_en=excluded.name_en,name_kh=excluded.name_kh,brand=excluded.brand,category=excluded.category,origin=excluded.origin,sizes=excluded.sizes,specs=excluded.specs,specs_kh=excluded.specs_kh,featured=excluded.featured,image_bg=excluded.image_bg,image_badge=excluded.image_badge,image_url=excluded.image_url,updated_at=excluded.updated_at`)
      .bind(id, product.name_en ?? '', product.name_kh ?? '', product.brand ?? '', product.category ?? '', product.origin ?? '', product.sizes ?? '', product.specs ?? '', product.specs_kh ?? null, product.featured ? 1 : 0, product.image_bg ?? product.imageBg ?? 'bg-slate-100', product.image_badge ?? product.imageBadge ?? 'Product', product.image_url ?? product.image ?? null).run();
    return json({ ok: true });
  }
  if (path.startsWith('/api/products/') && method === 'DELETE') {
    const user = await requireAdmin(request, env);
    if (user instanceof Response) return user;
    const id = decodeURIComponent(path.slice('/api/products/'.length));
    if (!id || id.length > 120) return json({ error: 'Invalid product ID.' }, 400);
    await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
    return json({ ok: true });
  }

  if (path === '/api/site-content' && method === 'GET') {
    const content = await env.DB.prepare('SELECT brands,news,settings FROM site_content WHERE id = ?').bind('main').first<{ brands: string; news: string; settings: string }>();
    return json(content ? { brands: JSON.parse(content.brands), news: JSON.parse(content.news), settings: JSON.parse(content.settings) } : null);
  }
  if (path === '/api/site-content' && method === 'PUT') {
    const user = await requireAdmin(request, env);
    if (user instanceof Response) return user;
    const body = await readJson(request);
    const brands = JSON.stringify(Array.isArray(body.brands) ? body.brands : []);
    const news = JSON.stringify(Array.isArray(body.news) ? body.news : []);
    const settings = JSON.stringify(body.settings && typeof body.settings === 'object' ? body.settings : {});
    await env.DB.prepare(`INSERT INTO site_content (id,brands,news,settings,updated_at) VALUES ('main',?,?,?,strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      ON CONFLICT(id) DO UPDATE SET brands=excluded.brands,news=excluded.news,settings=excluded.settings,updated_at=excluded.updated_at`).bind(brands, news, settings).run();
    return json({ brands: JSON.parse(brands), news: JSON.parse(news), settings: JSON.parse(settings) });
  }

  if (path === '/api/events' && method === 'POST') {
    const body = await readJson(request);
    if (!['page_view', 'product_view'].includes(body.event_type) || typeof body.visitor_id !== 'string' || body.visitor_id.length < 1 || body.visitor_id.length > 80) return json({ error: 'Invalid event.' }, 400);
    const page = String(body.page_path ?? '').slice(0, 80);
    const productId = body.product_id ? String(body.product_id).slice(0, 120) : null;
    if (!page || (body.event_type === 'product_view' && !productId)) return json({ error: 'Invalid event details.' }, 400);
    await env.DB.prepare('INSERT INTO website_events (event_type,page_path,product_id,product_name,visitor_id) VALUES (?,?,?,?,?)').bind(body.event_type, page, productId, body.product_name ? String(body.product_name).slice(0, 160) : null, body.visitor_id).run();
    return json({ ok: true }, 201);
  }
  if (path === '/api/events' && method === 'GET') {
    const user = await requireAdmin(request, env);
    if (user instanceof Response) return user;
    const { results } = await env.DB.prepare('SELECT id,event_type,page_path,product_id,product_name,visitor_id,created_at FROM website_events ORDER BY created_at DESC LIMIT 1000').all();
    return json(results);
  }

  if (path === '/api/inquiries' && method === 'POST') {
    const body = await readJson(request);
    const id = crypto.randomUUID();
    const values = [String(body.name ?? '').slice(0, 120), String(body.phone ?? '').slice(0, 80)];
    if (!values[0].trim() || !values[1].trim()) return json({ error: 'Name and phone are required.' }, 400);
    await env.DB.prepare('INSERT INTO inquiries (id,name,business,phone,telegram,province,type,product,brand,details,status,date) VALUES (?,?,?,?,?,?,?,?,?,? ,\'New\',date(\'now\'))').bind(id, values[0], String(body.business ?? 'N/A').slice(0, 160), values[1], String(body.telegram ?? '').slice(0, 120), String(body.province ?? 'Phnom Penh').slice(0, 100), String(body.type ?? 'General Contact').slice(0, 80), String(body.product ?? '').slice(0, 160), String(body.brand ?? '').slice(0, 120), String(body.details ?? '').slice(0, 2000)).run();
    return json({ id }, 201);
  }
  if (path === '/api/inquiries' && method === 'GET') {
    const user = await requireAdmin(request, env);
    if (user instanceof Response) return user;
    const { results } = await env.DB.prepare('SELECT * FROM inquiries ORDER BY created_at DESC LIMIT 1000').all();
    return json(results);
  }
  if (path.startsWith('/api/inquiries/') && method === 'PATCH') {
    const user = await requireAdmin(request, env);
    if (user instanceof Response) return user;
    const id = decodeURIComponent(path.slice('/api/inquiries/'.length));
    const body = await readJson(request);
    if (!['New', 'Contacted', 'Closed'].includes(body.status)) return json({ error: 'Invalid inquiry status.' }, 400);
    const result = await env.DB.prepare('UPDATE inquiries SET status = ? WHERE id = ?').bind(body.status, id).run();
    return result.meta.changes ? json({ ok: true }) : json({ error: 'Inquiry not found.' }, 404);
  }

  if (path === '/api/media' && method === 'PUT') return uploadImage(request, env);
  if (path.startsWith('/media/') && method === 'GET') {
    const key = decodeURIComponent(path.slice('/media/'.length));
    const object = await env.MEDIA.get(key);
    if (!object) return new Response('Not found', { status: 404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('cache-control', 'public, max-age=31536000, immutable');
    return new Response(object.body, { headers });
  }

  if (path === '/api/health' && method === 'GET') {
    const user = await requireAdmin(request, env);
    if (user instanceof Response) return user;
    const [products, content, events, inquiries] = await Promise.all([
      env.DB.prepare('SELECT COUNT(*) AS count FROM products').first(),
      env.DB.prepare('SELECT COUNT(*) AS count FROM site_content').first(),
      env.DB.prepare('SELECT COUNT(*) AS count FROM website_events').first(),
      env.DB.prepare('SELECT COUNT(*) AS count FROM inquiries').first()
    ]);
    let cursor: string | undefined;
    let files = 0;
    let bytes = 0;
    let latest: { name: string; createdAt: string } | null = null;
    const recent: { bucket: string; name: string; createdAt: string; bytes: number }[] = [];
    do {
      const page = await env.MEDIA.list({ cursor, limit: 1000 });
      for (const object of page.objects) {
        files += 1;
        bytes += object.size;
        const createdAt = object.uploaded.toISOString();
        recent.push({ bucket: 'vistalab-media', name: object.key, createdAt, bytes: object.size });
        if (!latest || Date.parse(createdAt) > Date.parse(latest.createdAt)) latest = { name: object.key, createdAt };
      }
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
    recent.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    recent.length = Math.min(recent.length, 8);
    return json({
      products: { count: products?.count ?? 0 },
      siteContent: { count: content?.count ?? 0 },
      events: { count: events?.count ?? 0 },
      inquiries: { count: inquiries?.count ?? 0 },
      buckets: [{ bucket: 'vistalab-media', files, bytes, latest, recent }],
      recentUploads: recent,
      checkedAt: new Date().toISOString()
    });
  }

  if (path === '/api/backup' && method === 'GET') {
    const user = await requireAdmin(request, env);
    if (user instanceof Response) return user;
    const [products, siteContent, events, inquiries] = await Promise.all([
      env.DB.prepare('SELECT * FROM products ORDER BY name_en').all(),
      env.DB.prepare('SELECT * FROM site_content WHERE id = ?').bind('main').first<{ id: string; brands: string; news: string; settings: string; updated_at: string }>(),
      env.DB.prepare('SELECT * FROM website_events ORDER BY created_at').all(),
      env.DB.prepare('SELECT * FROM inquiries ORDER BY created_at').all()
    ]);
    return json({
      tables: {
        products: products.results,
        site_content: siteContent ? [{ id: siteContent.id, brands: JSON.parse(siteContent.brands), news: JSON.parse(siteContent.news), settings: JSON.parse(siteContent.settings), updated_at: siteContent.updated_at }] : [],
        website_events: events.results,
        inquiries: inquiries.results
      }
    });
  }

  if (path === '/api/media-list' && method === 'GET') {
    const user = await requireAdmin(request, env);
    if (user instanceof Response) return user;
    const objects: { key: string; size: number; contentType: string }[] = [];
    let cursor: string | undefined;
    do {
      const page = await env.MEDIA.list({ cursor, limit: 1000 });
      for (const object of page.objects) objects.push({ key: object.key, size: object.size, contentType: object.httpMetadata?.contentType ?? 'application/octet-stream' });
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
    return json(objects);
  }

  return json({ error: 'Not found.' }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const headers = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    try {
      const response = await handle(request, env);
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : 'Internal server error.' }, 500, headers);
    }
  }
};
