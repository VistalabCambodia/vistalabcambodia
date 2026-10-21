import type { Product } from '../data/siteData';
import { supabaseClient } from './supabase';

type ProductRow = {
  id: string;
  name_en: string;
  name_kh: string;
  brand: string;
  category: string;
  origin: string;
  sizes: string;
  specs: string;
  specs_kh: string | null;
  featured: boolean;
  image_bg: string;
  image_badge: string;
  image_url: string | null;
};

export function mapProductRow(row: ProductRow): Product {
  return {
    id: row.id,
    name_en: row.name_en,
    name_kh: row.name_kh,
    brand: row.brand,
    category: row.category,
    origin: row.origin,
    sizes: row.sizes,
    specs: row.specs,
    specs_kh: row.specs_kh ?? undefined,
    featured: Boolean(row.featured),
    imageBg: row.image_bg,
    imageBadge: row.image_badge,
    image: row.image_url ?? undefined
  };
}

async function storeProductImage(product: Product): Promise<string | null> {
  let imageUrl = product.image || null;
  if (!imageUrl?.startsWith('data:image/')) return imageUrl;
  if (!supabaseClient) throw new Error('Supabase is not configured.');
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const path = `products/${encodeURIComponent(product.id)}.webp`;
  const { error } = await supabaseClient.storage.from('product-images').upload(path, blob, {
    contentType: 'image/webp', upsert: true
  });
  if (error) throw error;
  const { data } = supabaseClient.storage.from('product-images').getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function loadProductsFromSupabase(): Promise<Product[]> {
  if (!supabaseClient) throw new Error('Supabase is not configured.');
  const { data, error } = await supabaseClient.from('products').select('*').order('id');
  if (error) throw error;
  return (data ?? []).map((row) => mapProductRow(row as ProductRow));
}

export async function saveProductToSupabase(product: Product): Promise<Product> {
  if (!supabaseClient) throw new Error('Supabase is not configured.');
  const imageUrl = await storeProductImage(product);
  const row = {
    id: product.id,
    name_en: product.name_en,
    name_kh: product.name_kh,
    brand: product.brand,
    category: product.category,
    origin: product.origin,
    sizes: product.sizes,
    specs: product.specs,
    specs_kh: product.specs_kh ?? null,
    featured: product.featured,
    image_bg: product.imageBg,
    image_badge: product.imageBadge,
    image_url: imageUrl
  };
  const { error } = await supabaseClient.from('products').upsert(row);
  if (error) throw error;
  return { ...product, image: imageUrl ?? undefined };
}

export async function deleteProductFromSupabase(productId: string): Promise<void> {
  if (!supabaseClient) throw new Error('Supabase is not configured.');
  const { error } = await supabaseClient.from('products').delete().eq('id', productId);
  if (error) throw error;
}
