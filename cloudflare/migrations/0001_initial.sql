-- Initial Cloudflare D1 schema for data currently stored in Supabase.
-- Run with: npx wrangler d1 execute vistalab --local --file=cloudflare/migrations/0001_initial.sql

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY NOT NULL,
  name_en TEXT NOT NULL,
  name_kh TEXT NOT NULL DEFAULT '',
  brand TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  origin TEXT NOT NULL DEFAULT '',
  sizes TEXT NOT NULL DEFAULT '',
  specs TEXT NOT NULL DEFAULT '',
  specs_kh TEXT,
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
  image_bg TEXT NOT NULL DEFAULT 'bg-slate-100',
  image_badge TEXT NOT NULL DEFAULT 'Product',
  image_url TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS site_content (
  id TEXT PRIMARY KEY NOT NULL CHECK (id = 'main'),
  brands TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(brands)),
  news TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(news)),
  settings TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(settings)),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS website_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'product_view')),
  page_path TEXT NOT NULL CHECK (length(page_path) BETWEEN 1 AND 80),
  product_id TEXT CHECK (product_id IS NULL OR length(product_id) <= 120),
  product_name TEXT CHECK (product_name IS NULL OR length(product_name) <= 160),
  visitor_id TEXT NOT NULL CHECK (length(visitor_id) BETWEEN 1 AND 80),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (event_type <> 'product_view' OR product_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS website_events_created_at_idx
  ON website_events (created_at DESC);
CREATE INDEX IF NOT EXISTS website_events_product_idx
  ON website_events (product_id, created_at DESC)
  WHERE event_type = 'product_view';

CREATE TABLE IF NOT EXISTS admin_users (
  email TEXT PRIMARY KEY NOT NULL COLLATE NOCASE,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS inquiries (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  business TEXT NOT NULL DEFAULT 'N/A',
  phone TEXT NOT NULL,
  telegram TEXT NOT NULL DEFAULT '',
  province TEXT NOT NULL DEFAULT 'Phnom Penh',
  type TEXT NOT NULL DEFAULT 'General Contact',
  product TEXT NOT NULL DEFAULT '',
  brand TEXT NOT NULL DEFAULT '',
  details TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'New',
  date TEXT NOT NULL DEFAULT (date('now')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
