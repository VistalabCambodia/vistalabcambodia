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
    featured: row.featured,
    imageBg: row.image_bg,
    imageBadge: row.image_badge,
    image: row.image_url ?? undefined
  };
}

export async function saveProductToSupabase(product: Product): Promise<Product> {
  if (!supabaseClient) throw new Error('Supabase is not configured.');

  let imageUrl = product.image || null;
  if (imageUrl?.startsWith('data:image/')) {
    const imageBlob = await fetch(imageUrl).then((response) => response.blob());
    const imagePath = `products/${encodeURIComponent(product.id)}.webp`;
    const { error: uploadError } = await supabaseClient.storage
      .from('product-images')
      .upload(imagePath, imageBlob, { contentType: 'image/webp', upsert: true });
    if (uploadError) throw new Error(uploadError.message);
    imageUrl = supabaseClient.storage.from('product-images').getPublicUrl(imagePath).data.publicUrl;
  }

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

  const { data, error } = await supabaseClient.from('products').upsert(row).select('*').single();
  if (error) throw new Error(error.message);
  return mapProductRow(data as ProductRow);
}
