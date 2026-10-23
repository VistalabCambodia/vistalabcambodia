import type { Brand, NewsArticle } from '../data/siteData';
import { supabaseClient } from './supabase';

export type SiteContent<Settings extends Record<string, unknown> = Record<string, unknown>> = {
  brands: Brand[];
  news: NewsArticle[];
  settings: Settings;
};

type SiteContentRow = {
  brands: Brand[] | null;
  news: NewsArticle[] | null;
  settings: Record<string, unknown> | null;
};

export function mapSiteContentRow(row: SiteContentRow): SiteContent {
  return { brands: row.brands ?? [], news: row.news ?? [], settings: row.settings ?? {} };
}

async function storeImage(image: string | undefined, path: string): Promise<string | undefined> {
  if (!image || !image.startsWith('data:image/')) return image;
  if (!supabaseClient) throw new Error('Supabase is not configured.');
  const blob = await fetch(image).then((response) => response.blob());
  const { error } = await supabaseClient.storage.from('site-images').upload(path, blob, {
    contentType: 'image/webp', upsert: true
  });
  if (error) throw error;
  const { data } = supabaseClient.storage.from('site-images').getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function loadSiteContent<Settings extends Record<string, unknown>>(): Promise<SiteContent<Settings> | null> {
  if (!supabaseClient) throw new Error('Supabase is not configured.');
  const { data, error } = await supabaseClient.from('site_content')
    .select('brands,news,settings').eq('id', 'main').maybeSingle();
  if (error) throw error;
  return data ? mapSiteContentRow(data as SiteContentRow) as SiteContent<Settings> : null;
}

export async function saveSiteContent<Settings extends Record<string, unknown>>(
  brands: Brand[],
  news: NewsArticle[],
  settings: Settings
): Promise<SiteContent<Settings>> {
  if (!supabaseClient) throw new Error('Supabase is not configured.');

  // Commit the editable records before uploading image objects. Storage uploads
  // and the Postgres upsert are separate operations, so uploading first can
  // leave orphaned files if a later upload or the row write fails.
  const { data: existingRow, error: existingError } = await supabaseClient.from('site_content')
    .select('brands,news,settings').eq('id', 'main').maybeSingle();
  if (existingError) throw existingError;
  const existing = existingRow ? mapSiteContentRow(existingRow as SiteContentRow) : null;
  const existingBrands = new Map((existing?.brands ?? []).map((brand) => [brand.id, brand]));
  const existingNews = new Map((existing?.news ?? []).map((article) => [article.id, article]));
  const stagedBrands = brands.map((brand) => {
    const old = existingBrands.get(brand.id);
    return {
      ...brand,
      image: brand.image?.startsWith('data:image/') ? old?.image : brand.image,
      flagImage: brand.flagImage?.startsWith('data:image/') ? old?.flagImage : brand.flagImage
    };
  });
  const stagedNews = news.map((article) => {
    const old = existingNews.get(article.id);
    return { ...article, image: article.image?.startsWith('data:image/') ? old?.image : article.image };
  });
  const stagedSettings: Record<string, unknown> = { ...settings };
  const existingSettings = existing?.settings ?? {};
  for (const key of ['heroImage', 'aboutHeroImage', 'distributionHeroImage'] as const) {
    if (typeof stagedSettings[key] === 'string' && (stagedSettings[key] as string).startsWith('data:image/')) {
      stagedSettings[key] = existingSettings[key];
    }
  }
  if (Array.isArray(stagedSettings.heroSlides)) {
    const oldSlides = Array.isArray(existingSettings.heroSlides) ? existingSettings.heroSlides : [];
    stagedSettings.heroSlides = stagedSettings.heroSlides.map((image, index) =>
      typeof image === 'string' && image.startsWith('data:image/') ? oldSlides[index] : image);
  }
  const stagedContent = { brands: stagedBrands, news: stagedNews, settings: stagedSettings as Settings };
  const { error: stagedSaveError } = await supabaseClient.from('site_content').upsert({ id: 'main', ...stagedContent });
  if (stagedSaveError) throw stagedSaveError;

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
    if (typeof image === 'string') savedSettings[key] = await storeImage(image, `banners/${key}.webp`);
  }
  if (Array.isArray(savedSettings.heroSlides)) {
    savedSettings.heroSlides = await Promise.all(savedSettings.heroSlides.map((image, index) =>
      storeImage(typeof image === 'string' ? image : undefined, `banners/hero-slide-${index + 1}.webp`)));
  }

  const content = { brands: savedBrands, news: savedNews, settings: savedSettings as Settings };
  const { error } = await supabaseClient.from('site_content').upsert({ id: 'main', ...content });
  if (error) throw new Error(`Brand and content records were saved, but the final image links could not be saved: ${error.message}`);
  return content;
}
