import type { Brand, NewsArticle } from '../data/siteData';
import { supabaseClient } from './supabase';

export type SiteContent<Settings extends Record<string, unknown> = Record<string, unknown>> = {
  brands: Brand[];
  news: NewsArticle[];
  settings: Settings;
};

type SiteContentRow = {
  brands: Brand[];
  news: NewsArticle[];
  settings: Record<string, unknown>;
};

export function mapSiteContentRow(row: SiteContentRow): SiteContent {
  return { brands: row.brands ?? [], news: row.news ?? [], settings: row.settings ?? {} };
}

async function storeImage(image: string | undefined, path: string): Promise<string | undefined> {
  if (!image?.startsWith('data:image/')) return image;
  if (!supabaseClient) throw new Error('Supabase is not configured.');
  const blob = await fetch(image).then((response) => response.blob());
  const { error } = await supabaseClient.storage.from('site-images').upload(path, blob, {
    contentType: 'image/webp',
    upsert: true
  });
  if (error) throw new Error(error.message);
  return supabaseClient.storage.from('site-images').getPublicUrl(path).data.publicUrl;
}

export async function saveSiteContent<Settings extends Record<string, unknown>>(
  brands: Brand[],
  news: NewsArticle[],
  settings: Settings
): Promise<SiteContent<Settings>> {
  if (!supabaseClient) throw new Error('Supabase is not configured.');

  const [savedBrands, savedNews] = await Promise.all([
    Promise.all(brands.map(async (brand) => ({
      ...brand,
      image: await storeImage(brand.image, `brands/${encodeURIComponent(brand.id)}.webp`),
      flagImage: await storeImage(brand.flagImage, `brand-flags/${encodeURIComponent(brand.id)}.webp`)
    }))),
    Promise.all(news.map(async (article) => ({
      ...article,
      image: await storeImage(article.image, `news/${encodeURIComponent(article.id)}.webp`)
    })))
  ]);

  const savedSettings: Record<string, unknown> = { ...settings };
  for (const key of ['heroImage', 'aboutHeroImage', 'distributionHeroImage'] as const) {
    const image = savedSettings[key];
    if (typeof image === 'string') {
      savedSettings[key] = await storeImage(image, `banners/${key}.webp`);
    }
  }

  const content = { brands: savedBrands, news: savedNews, settings: savedSettings as Settings };
  const { error } = await supabaseClient.from('site_content').upsert({ id: 'main', ...content });
  if (error) throw new Error(error.message);
  return content;
}
