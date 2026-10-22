import React, { useState, useEffect, useRef, type FormEvent } from 'react';
import { 
  Building2, Globe, Truck, Package, ShieldCheck, Phone, Mail, Send, Home, Info, Tags, Store, Newspaper, Handshake,
  MapPin, Search, Menu, X, ChevronRight, ChevronDown, CheckCircle, 
  Users, Layers, ExternalLink, Plus, Edit, Trash2, Filter, Eye, 
  ArrowRight, Sparkles, MessageCircle, BarChart3, FileText, Settings,
  Upload, Tag, Award, Briefcase, RefreshCw, AlertCircle, Check, Database, HardDrive, Image as ImageIcon, Download
} from 'lucide-react';
import {
  cambodianProvinces,
  distributionHubs,
  initialBrands,
  initialInquiries,
  initialNews,
  initialProducts,
  productCategories,
  type Brand,
  type Inquiry,
  type NewsArticle,
  type Product
} from './data/siteData';
import { Modal } from './components/Modal';
import { CatalogStudioAdmin } from './components/CatalogStudioAdmin';
import { StaffCatalogPage } from './components/StaffCatalogPage';
import { isAdminUser, isCatalogStaffUser, supabaseClient } from './utils/supabase';

import { ImageUpload } from './components/ImageUpload';
import { BrandMark } from './components/BrandMark';
import { CountryFlag } from './components/CountryFlag';
import { loadStoredArray } from './utils/storage';
import { translations, brandDescriptionsKh, productSpecsKh, productBadgesKh } from './data/translations';
import { fetchWebsiteEvents, trackWebsiteEvent, type WebsiteEvent } from './utils/analytics';
import { loadProductsFromSupabase, saveProductToSupabase } from './utils/productRepository';
import { loadSiteContent, saveSiteContent, type SiteContent } from './utils/siteContentRepository';
import { downloadSiteBackup } from './utils/backup';

type RecentStoredImage = { bucket: string; name: string; createdAt: string; bytes: number };
type BucketHealth = { bucket: string; files: number; bytes: number; latest: { name: string; createdAt: string } | null; recent: RecentStoredImage[]; error?: string };
type DataHealth = { products: { count: number; error?: string }; siteContent: { count: number; error?: string }; inquiries: { count: number; error?: string }; events: { count: number; error?: string }; buckets: BucketHealth[]; recentUploads: RecentStoredImage[]; checkedAt: string };

const adminSectionIcons = {
  overview: Globe,
  contact: Phone,
  home: ImageIcon,
  about: Info,
  brands: Tags,
  news: Newspaper,
  inquiries: MessageCircle,
  analytics: BarChart3,
  storage: HardDrive,
  products: Package,
  catalogs: FileText
};

async function inspectImageBucket(bucket: string): Promise<BucketHealth> {
  if (!supabaseClient) return { bucket, files: 0, bytes: 0, latest: null, recent: [], error: 'Supabase is not configured.' };
  let files = 0;
  let bytes = 0;
  let latest: BucketHealth['latest'] = null;
  const recent: RecentStoredImage[] = [];
  const pendingFolders = [''];
  while (pendingFolders.length) {
    const folder = pendingFolders.pop()!;
    let offset = 0;
    while (true) {
      const { data, error } = await supabaseClient.storage.from(bucket).list(folder, { limit: 100, offset });
      if (error) return { bucket, files, bytes, latest, recent, error: error.message };
      const items = data ?? [];
      for (const item of items) {
        if (!item.id) {
          pendingFolders.push(folder ? `${folder}/${item.name}` : item.name);
          continue;
        }
        files += 1;
        const fileBytes = Number(item.metadata?.size ?? 0);
        bytes += fileBytes;
        if (!item.created_at) continue;
        const name = folder ? `${folder}/${item.name}` : item.name;
        recent.push({ bucket, name, createdAt: item.created_at, bytes: fileBytes });
        recent.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
        recent.length = Math.min(recent.length, 8);
        if (!latest || Date.parse(item.created_at) > Date.parse(latest.createdAt)) latest = { name, createdAt: item.created_at };
      }
      if (items.length < 100) break;
      offset += items.length;
    }
  }
  return { bucket, files, bytes, latest, recent };
}

function formatStorageBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getSupabaseErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return fallback;
}

function getSupabaseProjectHost(): string {
  try {
    return new URL(import.meta.env.VITE_SUPABASE_URL).host;
  } catch {
    return 'not configured';
  }
}

const supabaseProjectHost = getSupabaseProjectHost();

function getDefaultBrandWebsite(name: string): string {
  const normalized = name.trim().toLowerCase().replace(/[’‘]/gu, "'");
  return normalized === "mychef's" || normalized === 'mychefs' ? 'https://www.mychefs.com.my/' : '';
}

function getSafeBrandWebsite(website?: string): string | null {
  if (!website?.trim()) return null;
  try {
    const url = new URL(website.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function normalizeKnownBrandDescription(brand: Brand): Brand {
  const normalizedName = brand.name.toLowerCase().replace(/[^a-z]/gu, '');
  const description = `${brand.description} ${brand.description_kh ?? ''}`;
  const hasGeneratedJunk = /ai mode conversation|translate to khmer|let me know so i can get you the right details|where to buy while the products/iu.test(description);
  if (normalizedName !== 'mychefs' || !hasGeneratedJunk) return brand;
  return {
    ...brand,
    description: 'Malaysian snack brand: MyChef’s aims to “Make Life Tasty.”\nPotato crisps: classic and bold flavors.\nBakery treats: cakes and pastries in several varieties.\nSnack bites and crackers: tasty options for sharing and everyday enjoyment.',
    description_kh: 'ម៉ាកអាហារសម្រន់ម៉ាឡេស៊ី៖ MyChef’s មានបំណងធ្វើឱ្យជីវិតកាន់តែឆ្ងាញ់។\nដំឡូងបន្ទះ៖ មានរសជាតិបែបបុរាណ និងរសជាតិចម្រុះ។\nនំដុត៖ មាននំខេក និងនំជាច្រើនប្រភេទ។\nអាហារសម្រន់ និងនំកែកឃឺ៖ សម្រាប់ញ៉ាំរាល់ថ្ងៃ និងចែករំលែក។'
  };
}

function ProductDescription({ text, className }: { text: string; className: string }) {
  if (/<\/?(?:p|div|strong|b|em|i|u|br|h[1-6])\b[^>]*>/iu.test(text)) {
    return <div className={`${className} space-y-1 [&_p]:m-0 [&_div]:m-0 [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold`} dangerouslySetInnerHTML={{ __html: sanitizeDescriptionHtml(text) }} />;
  }
  const items = text.split(/[\n•]+/u).map((item) => item.trim().replace(/^[-*]\s*/u, '')).filter(Boolean);
  if (items.length > 1) {
    return <div className={`${className} space-y-1`}>{items.map((item, index) => <p key={`${index}-${item}`}>{item}</p>)}</div>;
  }
  return <p className={`${className} whitespace-pre-line`}>{items[0] ?? text}</p>;
}

function ProductDescriptionPreview({ text, className }: { text: string; className: string }) {
  const plainText = /<\/?(?:p|div|strong|b|em|i|u|br|h[1-6])\b[^>]*>/iu.test(text)
    ? Array.from(new DOMParser().parseFromString(sanitizeDescriptionHtml(text), 'text/html').body.childNodes)
        .map((node) => node.textContent ?? '').join(' ')
    : text.split(/[\n•]+/u).map((line) => line.trim().replace(/^[-*]\s*/u, '')).join(' ');
  const preview = plainText.replace(/\s+/gu, ' ').trim();
  if (!preview) return null;
  return <p className={`${className} line-clamp-2`}>{preview}</p>;
}

function normalizeProductDescriptionInput(text: string): string {
  if (/<\/?[a-z][^>]*>/iu.test(text)) return text;
  return text.replace(/\s*•\s*/gu, '\n').replace(/^\s*[-*]\s*/gmu, '');
}

const allowedDescriptionTags = new Set(['P', 'DIV', 'STRONG', 'B', 'EM', 'I', 'U', 'BR', 'H2', 'H3']);

function sanitizeDescriptionHtml(html: string): string {
  const document = new DOMParser().parseFromString(html, 'text/html');
  const serialize = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const element = node as HTMLElement;
    const children = Array.from(element.childNodes).map(serialize).join('');
    if (!allowedDescriptionTags.has(element.tagName)) return children;
    const tag = element.tagName.toLowerCase();
    if (tag === 'br') return '<br />';
    return `<${tag}>${children}</${tag}>`;
  };
  return Array.from(document.body.childNodes).map(serialize).join('');
}

function descriptionToEditorHtml(value: string): string {
  if (/<\/?(?:p|div|strong|b|em|i|u|br|h[1-6])\b[^>]*>/iu.test(value)) return sanitizeDescriptionHtml(value);
  const lines = value.split(/[\n•]+/u).map((line) => line.trim().replace(/^[-*]\s*/u, '')).filter(Boolean);
  return lines.map((line) => `<p>${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`).join('') || '<p><br /></p>';
}

function ProductDescriptionEditor({ value, onChange, label, placeholder }: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && document.activeElement !== editor) editor.innerHTML = descriptionToEditorHtml(value);
  }, [value]);

  const applyFormat = (command: 'bold' | 'italic' | 'underline' | 'formatBlock', format?: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    document.execCommand(command, false, format);
    onChange(sanitizeDescriptionHtml(editor.innerHTML));
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-white sm:col-span-2">
      <div className="flex items-center gap-1 border-b border-slate-200 bg-slate-50 p-1.5" role="toolbar" aria-label={`${label} formatting`}>
        <button type="button" aria-label="Bold" title="Bold" onMouseDown={(event) => event.preventDefault()} onClick={() => applyFormat('bold')} className="h-8 w-8 rounded-md font-black text-slate-700 hover:bg-white">B</button>
        <button type="button" aria-label="Italic" title="Italic" onMouseDown={(event) => event.preventDefault()} onClick={() => applyFormat('italic')} className="h-8 w-8 rounded-md font-serif italic text-slate-700 hover:bg-white">I</button>
        <button type="button" aria-label="Underline" title="Underline" onMouseDown={(event) => event.preventDefault()} onClick={() => applyFormat('underline')} className="h-8 w-8 rounded-md font-semibold text-slate-700 underline hover:bg-white">U</button>
        <span className="mx-1 h-5 border-l border-slate-300" aria-hidden="true" />
        <button type="button" aria-label="Heading" title="Heading" onMouseDown={(event) => event.preventDefault()} onClick={() => applyFormat('formatBlock', 'h3')} className="h-8 rounded-md px-2 text-xs font-bold text-slate-700 hover:bg-white">H</button>
        <button type="button" aria-label="Paragraph" title="Paragraph" onMouseDown={(event) => event.preventDefault()} onClick={() => applyFormat('formatBlock', 'p')} className="h-8 rounded-md px-2 text-xs text-slate-700 hover:bg-white">¶</button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label={label}
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={(event) => onChange(sanitizeDescriptionHtml(event.currentTarget.innerHTML))}
        className="min-h-24 whitespace-pre-wrap p-3 text-xs leading-relaxed outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 [&_h3]:my-1 [&_h3]:text-sm [&_h3]:font-bold [&_p]:my-1"
      />
    </div>
  );
}

const windows1252SpecialCharacters = [
  '\u20ac', '\u0081', '\u201a', '\u0192', '\u201e', '\u2026', '\u2020', '\u2021',
  '\u02c6', '\u2030', '\u0160', '\u2039', '\u0152', '\u008d', '\u017d', '\u008f',
  '\u0090', '\u2018', '\u2019', '\u201c', '\u201d', '\u2022', '\u2013', '\u2014',
  '\u02dc', '\u2122', '\u0161', '\u203a', '\u0153', '\u009d', '\u017e', '\u0178'
];

const windows1252ByteByCharacter = new Map(
  windows1252SpecialCharacters.map((character, index) => [character, 0x80 + index])
);

function repairKhmerMojibake(value: string): string {
  if (!/(?:Ã|Â|áº|áž|áŸ|â€)/u.test(value)) return value;

  const bytes: number[] = [];
  for (const character of value) {
    const codePoint = character.codePointAt(0)!;
    if (codePoint <= 0x7f || (codePoint >= 0xa0 && codePoint <= 0xff)) {
      bytes.push(codePoint);
      continue;
    }
    const byte = windows1252ByteByCharacter.get(character);
    if (byte === undefined) return value;
    bytes.push(byte);
  }

  try {
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
    const khmerCount = (text: string) => (text.match(/[\u1780-\u17ff]/g) ?? []).length;
    // English text can be mojibake too (for example, “â€“” for an en dash),
    // so requiring more Khmer characters leaves those settings visibly broken.
    return decoded !== value && khmerCount(decoded) >= khmerCount(value) ? decoded : value;
  } catch {
    return value;
  }
}

export default function App() {
  const standaloneCatalog = new URLSearchParams(window.location.search).get('tool') === 'catalog-studio';
  const staffCatalogView = new URLSearchParams(window.location.search).get('catalog') === 'staff';
  const [lang, setLang] = useState<'EN' | 'KH'>('EN');
  const [posterSlideIndex, setPosterSlideIndex] = useState(0);
  const [languageLoading, setLanguageLoading] = useState(false);
  const [currentView, setCurrentView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('admin') === '1' || params.get('tool') === 'catalog-studio' || params.get('catalog') === 'staff' ? 'admin' : 'home';
  }); // home, about, brands, products, distribution, partner, seller, news, contact, admin
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [adminAuthReady, setAdminAuthReady] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState('');
  const [adminLoginBusy, setAdminLoginBusy] = useState(false);
  const [activeAdminSection, setActiveAdminSection] = useState(() => standaloneCatalog ? 'catalogs' : 'overview');
  const [websiteEvents, setWebsiteEvents] = useState<WebsiteEvent[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');
  const [dataHealth, setDataHealth] = useState<DataHealth | null>(null);
  const [dataHealthLoading, setDataHealthLoading] = useState(false);
  const [dataHealthError, setDataHealthError] = useState('');
  const [backupLoading, setBackupLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeBrandFilter, setActiveBrandFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHubId, setSelectedHubId] = useState(distributionHubs[0].id);
  const languageLoadingTimer = useRef<number | null>(null);
  const changeLanguage = (nextLang: 'EN' | 'KH') => {
    if (nextLang === lang || languageLoading) return;
    if (languageLoadingTimer.current !== null) window.clearTimeout(languageLoadingTimer.current);
    setLanguageLoading(true);
    setLang(nextLang);
    languageLoadingTimer.current = window.setTimeout(() => {
      setLanguageLoading(false);
      languageLoadingTimer.current = null;
    }, 520);
  };

  useEffect(() => () => {
    if (languageLoadingTimer.current !== null) window.clearTimeout(languageLoadingTimer.current);
  }, []);
  const selectedHub = distributionHubs.find((hub) => hub.id === selectedHubId) ?? distributionHubs[0];
  const analyticsWeekEvents = websiteEvents.filter((event) => Date.now() - Date.parse(event.created_at) <= 7 * 24 * 60 * 60 * 1000);
  const popularProducts = Object.values(websiteEvents
    .filter((event) => event.event_type === 'product_view')
    .reduce<Record<string, { name: string; views: number }>>((counts, event) => {
      const id = event.product_id ?? event.product_name ?? 'unknown';
      const product = counts[id] ?? { name: event.product_name ?? id, views: 0 };
      product.views += 1;
      counts[id] = product;
      return counts;
    }, {}))
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  useEffect(() => {
    if (!supabaseClient) { setAdminAuthReady(true); return; }
    let cancelled = false;
    const checkSession = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      const user = session?.user;
      const allowed = user ? (staffCatalogView
        ? await isCatalogStaffUser(user.id) || await isAdminUser(user.id)
        : await isAdminUser(user.id)) : false;
      if (cancelled) return;
      if (user && !allowed) await supabaseClient.auth.signOut();
      setAdminAuthenticated(allowed);
      setAdminEmail(allowed ? user?.email ?? '' : '');
      setAdminAuthReady(true);
    };

    void checkSession();
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setAdminAuthenticated(false);
        setAdminEmail('');
        return;
      }
      queueMicrotask(async () => {
        const allowed = staffCatalogView
          ? await isCatalogStaffUser(session.user.id) || await isAdminUser(session.user.id)
          : await isAdminUser(session.user.id);
        if (!allowed) await supabaseClient?.auth.signOut();
        if (!cancelled) {
          setAdminAuthenticated(allowed);
          setAdminEmail(allowed ? session.user.email ?? '' : '');
        }
      });
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [staffCatalogView]);

  const handleAdminLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAdminLoginBusy(true);
    setAdminLoginError('');
    try {
      if (!supabaseClient) throw new Error('Supabase is not configured.');
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
      if (error) throw error;
      const allowed = data.user && (staffCatalogView
        ? await isCatalogStaffUser(data.user.id) || await isAdminUser(data.user.id)
        : await isAdminUser(data.user.id));
      if (!allowed) {
        await supabaseClient.auth.signOut();
        throw new Error(staffCatalogView ? 'This account is not approved to view staff catalogs.' : 'This account is not approved as a site admin.');
      }
      setAdminEmail(data.user.email ?? adminEmail);
      setAdminAuthenticated(true);
      setAdminPassword('');
    } catch (error) {
      setAdminLoginError(error instanceof Error ? error.message : 'Email or password is incorrect.');
    } finally {
      setAdminLoginBusy(false);
    }
  };

  const handleAdminLogout = async () => {
    await supabaseClient?.auth.signOut();
    setAdminAuthenticated(false);
    setAdminEmail('');
    setAdminPassword('');
    setCurrentView('home');
    window.history.replaceState(null, '', window.location.pathname);
  };
  
  // Data States
  const [brands, setBrands] = useState<Brand[]>(() => loadStoredArray('vistalab.brands', initialBrands).map(normalizeKnownBrandDescription));
  const [products, setProducts] = useState<Product[]>(() => loadStoredArray('vistalab.products', initialProducts));
  const [productsDatabaseReady, setProductsDatabaseReady] = useState(!supabaseClient);
  const [productsDatabaseError, setProductsDatabaseError] = useState('');
  const [productsRetry, setProductsRetry] = useState(0);
  const [productsLoaded, setProductsLoaded] = useState(!supabaseClient);
  const [productsSyncing, setProductsSyncing] = useState(false);
  const productBaseline = useRef(new Map<string, string>());
  const productsInFlight = useRef(new Set<string>());
  const [news, setNews] = useState<NewsArticle[]>(() => loadStoredArray('vistalab.news', initialNews));
  const [inquiries, setInquiries] = useState<Inquiry[]>(() => loadStoredArray('vistalab.inquiries', initialInquiries));
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandSaving, setBrandSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingNews, setEditingNews] = useState<NewsArticle | null>(null);
  const [newProductImage, setNewProductImage] = useState('');
  const [newProductSaving, setNewProductSaving] = useState(false);
  const [newProductSpecs, setNewProductSpecs] = useState('');
  const [newProductSpecsKh, setNewProductSpecsKh] = useState('');
  const [newProductBrand, setNewProductBrand] = useState(() => initialBrands[0]?.name ?? '');

  useEffect(() => {
    if (!supabaseClient) return;
    let cancelled = false;
    setProductsLoaded(false);
    setProductsDatabaseReady(false);
    setProductsDatabaseError('');
    void (async () => {
      let data;
      try { data = await loadProductsFromSupabase(); }
      catch (error) {
        if (cancelled) return;
        setProductsDatabaseError(getSupabaseErrorMessage(error, 'Could not load products from Supabase.'));
        setProductsLoaded(true);
        return;
      }
      if (cancelled) return;
      const remoteProducts = data ?? [];
      if (remoteProducts.length) {
        productBaseline.current = new Map(remoteProducts.map((product) => [product.id, JSON.stringify(product)]));
        setProducts(remoteProducts);
      } else {
        // The first admin who visits after setup imports this browser's existing catalog.
        productBaseline.current = new Map();
      }
      setProductsDatabaseReady(true);
      setProductsLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [productsRetry]);

  useEffect(() => {
    if (!supabaseClient || !productsLoaded || !productsDatabaseReady || !adminAuthenticated || staffCatalogView) return;
    const changed = products.filter((product) =>
      productBaseline.current.get(product.id) !== JSON.stringify(product) && !productsInFlight.current.has(product.id)
    );
    if (!changed.length) return;

    setProductsSyncing(true);
    void Promise.all(changed.map(async (product) => {
      productsInFlight.current.add(product.id);
      try {
        const saved = await saveProductToSupabase(product);
        productBaseline.current.set(saved.id, JSON.stringify(saved));
        setProductsDatabaseError('');
        if (saved.image !== product.image) {
          setProducts((current) => current.map((item) => item.id === saved.id ? saved : item));
        }
      } catch (error) {
        setProductsDatabaseError(getSupabaseErrorMessage(error, 'Could not save products to Supabase.'));
      } finally {
        productsInFlight.current.delete(product.id);
      }
    })).finally(() => setProductsSyncing(productsInFlight.current.size > 0));
  }, [products, productsLoaded, productsDatabaseReady, adminAuthenticated]);
  
  // Modals & Drawers
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productImageZoomOpen, setProductImageZoomOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [inquiryPrefill, setInquiryPrefill] = useState({ product: '', brand: '', type: 'Product Inquiry' });
  
  // Toast notifications
  const [toastMessage, setToastMessage] = useState('');

  // Contact & Settings state
  const [settings, setSettings] = useState(() => {
    const defaults = {
      phone1: "+855 10 957 858", phone2: "+855 12 957 858", phone3: "+855 93 957 858",
      email: "vistalab.cambodia@gmail.com", telegram: "@VISTALAB_Cambodia",
      facebook: "https://www.facebook.com/vistalab/", address_en: "Phnom Penh, Kingdom of Cambodia",
      heroImage: '',
      heroSlides: [] as string[],
      heroTitle_en: 'Connecting International Brands with the Cambodian Market',
      heroTitle_kh: 'នាំយកម៉ាកផលិតផលអន្តរជាតិមកកាន់ទីផ្សារកម្ពុជា',
      heroSubtitle_en: 'Importer & Distributor of FMCG Products in Cambodia',
      heroSubtitle_kh: 'ក្រុមហ៊ុននាំចូល និងចែកចាយផលិតផលប្រើប្រាស់ប្រចាំថ្ងៃ (FMCG) នៅកម្ពុជា',
      heroDescription_en: 'VistaLab Cambodia imports, distributes, and develops consumer products for the Cambodian market, connecting international suppliers and brands with retailers, sellers, and consumers.',
      heroDescription_kh: 'ក្រុមហ៊ុន VistaLab Cambodia នាំចូល ចែកចាយ និងអភិវឌ្ឍន៍ផលិតផលសម្រាប់ទីផ្សារកម្ពុជា។',
      heroTrustedBrands: '12+',
      address_kh: "រាជធានីភ្នំពេញ ព្រះរាជាណាចក្រកម្ពុជា",
      business_hours: "Monday – Saturday (8:00 AM – 5:00 PM)",
      business_hours_kh: "ចន្ទ–សៅរ៍ (៨:០០ ព្រឹក–៥:០០ ល្ងាច)",
      distributionHeroImage: '',
      distributionHeroAnimated: true,
      aboutHeroImage: '',
      aboutHeroAnimated: true,
      aboutTitle_en: 'Your Trusted FMCG Import & Distribution Partner',
      aboutTitle_kh: 'ដៃគូដែលអ្នកអាចទុកចិត្តបាន សម្រាប់ការនាំចូល និងចែកចាយផលិតផល FMCG',
      aboutDescription_en: 'VistaLab Cambodia Co., Ltd. was established to bridge high-quality international fast-moving consumer goods (FMCG) with the growing market demand in Cambodia.',
      aboutDescription_kh: 'ក្រុមហ៊ុន VistaLab Cambodia Co., Ltd. ត្រូវបានបង្កើតឡើងដើម្បីនាំយកផលិតផលប្រើប្រាស់ប្រចាំថ្ងៃដែលមានគុណភាពខ្ពស់ពីអន្តរជាតិ មកបំពេញតម្រូវការទីផ្សារដែលកំពុងរីកចម្រើននៅកម្ពុជា។'    };
    try {
      const stored = window.localStorage.getItem('vistalab.settings');
      if (!stored) return defaults;
      const parsed = JSON.parse(stored);
      const saved = Object.fromEntries(
        Object.entries(parsed).map(([key, value]) => [
          key,
          typeof value === 'string' ? repairKhmerMojibake(value) : value
        ])
      );
      return {
        ...defaults,
        ...saved,
        address_kh: typeof saved.address_kh === 'string' && !saved.address_kh.includes('?') ? saved.address_kh : defaults.address_kh
      };
    } catch { return defaults; }
  });

  const posterSlides = Array.isArray(settings.heroSlides) ? settings.heroSlides.filter((image: unknown): image is string => typeof image === 'string' && image.length > 0) : [];
  useEffect(() => setPosterSlideIndex(0), [posterSlides.length]);
  useEffect(() => {
    if (posterSlides.length < 2 || currentView !== 'home') return;
    const timer = window.setInterval(() => setPosterSlideIndex((index) => (index + 1) % posterSlides.length), 3800);
    return () => window.clearInterval(timer);
  }, [posterSlides.length, currentView]);

  const [siteContentLoaded, setSiteContentLoaded] = useState(!supabaseClient);
  const [siteContentReady, setSiteContentReady] = useState(!supabaseClient);
  const [siteContentError, setSiteContentError] = useState('');
  const [siteContentRetry, setSiteContentRetry] = useState(0);
  const [siteContentSyncing, setSiteContentSyncing] = useState(false);
  const siteContentBaseline = useRef<string | null>(null);
  const siteContentSaveQueue = useRef<Promise<void>>(Promise.resolve());
  const siteContentSnapshot = useRef({ brands, news, settings });
  siteContentSnapshot.current = { brands, news, settings };

  useEffect(() => {
    if (!supabaseClient) return;
    let cancelled = false;
    setSiteContentLoaded(false);
    setSiteContentReady(false);
    setSiteContentError('');
    void (async () => {
      let data;
      try { data = await loadSiteContent<Record<string, unknown>>(); }
      catch (error) {
        if (cancelled) return;
        setSiteContentError(error instanceof Error ? error.message : 'Could not load site content from Supabase.');
        setSiteContentLoaded(true);
        return;
      }
      if (cancelled) return;
      if (data) {
        siteContentBaseline.current = JSON.stringify(data);
        setBrands(data.brands.map(normalizeKnownBrandDescription));
        setNews(data.news);
        setSettings((current) => ({ ...current, ...data.settings }));
      } else {
        // The first admin visit imports the current browser's existing editable content.
        siteContentBaseline.current = null;
      }
      setSiteContentReady(true);
      setSiteContentLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [siteContentRetry]);

  useEffect(() => {
    if (!supabaseClient || !siteContentLoaded || !siteContentReady || !adminAuthenticated || staffCatalogView) return;
    const timer = window.setTimeout(() => {
      siteContentSaveQueue.current = siteContentSaveQueue.current.then(async () => {
        const current = siteContentSnapshot.current;
        if (siteContentBaseline.current === JSON.stringify(current)) return;
        setSiteContentSyncing(true);
        try {
          const saved = await saveSiteContent(current.brands, current.news, current.settings);
          siteContentBaseline.current = JSON.stringify(saved);
          setBrands(saved.brands);
          setNews(saved.news);
          setSettings(saved.settings);
          setSiteContentError('');
        } catch (error) {
          setSiteContentError(error instanceof Error ? error.message : 'Could not save website content to Supabase.');
        } finally {
          setSiteContentSyncing(false);
        }
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [brands, news, settings, siteContentLoaded, siteContentReady, adminAuthenticated]);

  const t = translations[lang];
  const tx = (english: string, khmer: string) => lang === 'KH' ? khmer : english;

  const handleDownloadBackup = async () => {
    if (!adminAuthenticated || backupLoading) return;
    setBackupLoading(true);
    try {
      const result = await downloadSiteBackup({
        products,
        brands,
        news,
        settings,
        inquiries,
        createdInBrowser: new Date().toISOString()
      });
      const warning = result.warnings.length ? ` ${result.warnings.join(' ')}` : '';
      setToastMessage(`${tx('Backup downloaded:', 'បានទាញយកឯកសារបម្រុងទុក៖')} ${result.filename} · ${result.files} ${tx('images', 'រូបភាព')} (${formatStorageBytes(result.bytes)}).${warning}`);
    } catch (error) {
      setToastMessage(`${tx('Backup failed:', 'ការបម្រុងទុកបរាជ័យ៖')} ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setBackupLoading(false);
    }
  };
  const analyticsPageName = (page: string) => ({
    home: tx('Home', 'ទំព័រដើម'),
    about: tx('About', 'អំពីយើង'),
    brands: tx('Brands', 'ម៉ាកផលិតផល'),
    products: tx('Products', 'ផលិតផល'),
    distribution: tx('Distribution', 'ការចែកចាយ'),
    partner: tx('Partner', 'ដៃគូ'),
    seller: tx('Seller', 'អ្នកលក់'),
    news: tx('News', 'ព័ត៌មាន'),
    contact: tx('Contact', 'ទំនាក់ទំនង')
  }[page] ?? page);
  const categoryLabels: Record<typeof productCategories[number], string> = {
    All: t.allCategories,
    'Personal Care': t.catPersonal,
    'Baby Care': t.catBaby,
    'Beauty & Body Care': t.catBeauty,
    'Household Care': t.catHousehold,
    'Food & Confectionery': t.catFood
  };
  const localizedCategory = (category: string) => categoryLabels[category as typeof productCategories[number]] ?? category;
  const localizedProductName = (product: Product) => lang === 'KH'
    ? product.name_kh && product.name_kh !== product.name_en ? product.name_kh : 'មិនទាន់មានឈ្មោះផលិតផលជាភាសាខ្មែរ។'
    : product.name_en;
  const localizedProductSpecs = (product: Product) => lang === 'KH'
    ? product.specs_kh || productSpecsKh[product.id] || 'មិនទាន់មានការពិពណ៌នាអំពីផលិតផលជាភាសាខ្មែរ។'
    : product.specs;
  const localizedProductBadge = (product: Product) => lang === 'KH'
    ? productBadgesKh[product.id] || 'ផលិតផល'
    : product.imageBadge;
  const localizedBrandDescription = (brand: Brand) => lang === 'KH'
    ? brand.description_kh || brandDescriptionsKh[brand.id] || 'មិនទាន់មានការពិពណ៌នាអំពីម៉ាកជាភាសាខ្មែរ។'
    : brand.description;
  const localizedArticleTitle = (article: NewsArticle) => lang === 'KH'
    ? article.title_kh || 'មិនទាន់មានចំណងជើងជាភាសាខ្មែរ។'
    : article.title_en;
  const localizedArticleExcerpt = (article: NewsArticle) => lang === 'KH'
    ? article.excerpt_kh || 'មិនទាន់មានសេចក្តីសង្ខេបជាភាសាខ្មែរ។'
    : article.excerpt_en;
  const localizedInquiryType = (value: string) => lang === 'KH'
    ? ({ Seller: 'អ្នកលក់', Partner: 'ដៃគូអាជីវកម្ម', 'Product Inquiry': 'សំណួរអំពីផលិតផល', 'General Contact': 'ទំនាក់ទំនងទូទៅ' }[value] ?? value)
    : value;
  const localizedInquiryStatus = (value: string) => lang === 'KH'
    ? ({ New: 'ថ្មី', 'In Progress': 'កំពុងដំណើរការ', Contacted: 'បានទាក់ទង' }[value] ?? value)
    : value;
  const localizedProvince = (value: string) => lang === 'KH'
    ? ({ 'Phnom Penh': 'ភ្នំពេញ', Sihanoukville: 'ព្រះសីហនុ', 'Other Province': 'ខេត្តផ្សេងទៀត' }[value] ?? cambodianProvinces.find((province) => province.name === value)?.nameKh ?? value)
    : value;

  // Helper for Toast Trigger
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
  };

  // Open Inquiry with Prefill
  const openInquiry = (productName = '', brandName = '', type = 'Product Inquiry') => {
    setInquiryPrefill({ product: productName, brand: brandName, type });
    setInquiryModalOpen(true);
    if (selectedProduct) setSelectedProduct(null);
  };

  // Handle Form Submission
  const handleInquirySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newInq = {
      id: `inq-${Date.now()}`,
      type: String(formData.get('type') || inquiryPrefill.type || 'General'),
      name: String(formData.get('name') || 'Anonymous'),
      business: String(formData.get('business') || 'N/A'),
      phone: String(formData.get('phone') || 'N/A'),
      telegram: String(formData.get('telegram') || 'N/A'),
      province: String(formData.get('province') || 'Phnom Penh'),
      status: 'New',
      date: new Date().toISOString().split('T')[0],
      details: String(formData.get('message') || `Inquiry regarding ${inquiryPrefill.product || 'products'}`)
    };
    
    try {
      if (supabaseClient) {
        const { error } = await supabaseClient.from('inquiries').insert({
          ...newInq, product: inquiryPrefill.product, brand: inquiryPrefill.brand
        });
        if (error) throw error;
      } else {
        throw new Error('Supabase is not configured. This inquiry was not submitted.');
      }
      setInquiries((currentInquiries) => [newInq, ...currentInquiries]);
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'Could not submit inquiry. Please try again.');
      return;
    }
    setInquiryModalOpen(false);
    triggerToast(lang === 'EN' ? "Inquiry submitted successfully! Our team will contact you soon." : "ការសាកសួរត្រូវបានផ្ញើរួចរាល់! ក្រុមការងារនឹងទាក់ទងទៅលោកអ្នក។");
  };

  useEffect(() => {
    if (!supabaseClient || !adminAuthenticated || staffCatalogView) return;
    let cancelled = false;
    void supabaseClient.from('inquiries').select('*').order('created_at', { ascending: false }).then(({ data, error }) => {
      if (cancelled) return;
      if (error) setToastMessage(error.message);
      else if (data) setInquiries(data as Inquiry[]);
    });
    return () => { cancelled = true; };
  }, [adminAuthenticated, staffCatalogView]);

  // Scroll to top on navigation switch
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setMobileMenuOpen(false);
  }, [currentView]);

  useEffect(() => {
    if (currentView === 'admin') return;
    void trackWebsiteEvent({ event_type: 'page_view', page_path: currentView });
  }, [currentView]);

  useEffect(() => {
    if (currentView === 'admin' || !selectedProduct) return;
    void trackWebsiteEvent({
      event_type: 'product_view',
      page_path: currentView,
      product_id: selectedProduct.id,
      product_name: selectedProduct.name_en
    });
  }, [currentView, selectedProduct?.id]);

  const refreshWebsiteAnalytics = async () => {
    setAnalyticsLoading(true);
    const result = await fetchWebsiteEvents();
    setWebsiteEvents(result.events);
    setAnalyticsError(result.error ?? '');
    setAnalyticsLoading(false);
  };

  const refreshDataHealth = async () => {
    if (!supabaseClient) {
      setDataHealthError('Supabase is not configured.');
      return;
    }
    setDataHealthLoading(true);
    setDataHealthError('');
    try {
      const [products, siteContent, inquiries, events, productImages, siteImages] = await Promise.all([
        supabaseClient.from('products').select('*', { count: 'exact', head: true }),
        supabaseClient.from('site_content').select('*', { count: 'exact', head: true }),
        supabaseClient.from('inquiries').select('*', { count: 'exact', head: true }),
        supabaseClient.from('website_events').select('*', { count: 'exact', head: true }),
        inspectImageBucket('product-images'),
        inspectImageBucket('site-images')
      ]);
      const toCheck = (result: { count: number | null; error: { message: string } | null }) => ({ count: result.count ?? 0, ...(result.error ? { error: result.error.message } : {}) });
      const buckets = [productImages, siteImages];
      setDataHealth({
        products: toCheck(products), siteContent: toCheck(siteContent), inquiries: toCheck(inquiries), events: toCheck(events), buckets,
        recentUploads: buckets.flatMap((bucket) => bucket.recent).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 8),
        checkedAt: new Date().toISOString()
      });
    } catch (error) {
      setDataHealthError(error instanceof Error ? error.message : 'Could not check Supabase storage.');
    } finally {
      setDataHealthLoading(false);
    }
  };

  useEffect(() => {
    if (currentView === 'admin' && adminAuthenticated && activeAdminSection === 'analytics') {
      void refreshWebsiteAnalytics();
    }
  }, [currentView, adminAuthenticated, activeAdminSection]);

  useEffect(() => {
    if (currentView === 'admin' && adminAuthenticated && activeAdminSection === 'storage') {
      void refreshDataHealth();
    }
  }, [currentView, adminAuthenticated, activeAdminSection]);

  useEffect(() => {
    try { window.localStorage.setItem('vistalab.brands', JSON.stringify(brands)); } catch { /* Browser storage may be unavailable or full. */ }
  }, [brands]);

  useEffect(() => {
    if (supabaseClient) return;
    try { window.localStorage.setItem('vistalab.products', JSON.stringify(products)); } catch { /* Storage may be unavailable or full. */ }
  }, [products]);

  useEffect(() => {
    try { window.localStorage.setItem('vistalab.news', JSON.stringify(news)); } catch { /* Storage may be unavailable or full. */ }
  }, [news]);

  useEffect(() => {
    try { window.localStorage.setItem('vistalab.inquiries', JSON.stringify(inquiries)); } catch { /* Storage may be unavailable or full. */ }
  }, [inquiries]);

  useEffect(() => {
    try { window.localStorage.setItem('vistalab.settings', JSON.stringify(settings)); } catch { /* Storage may be unavailable or full. */ }
  }, [settings]);

  useEffect(() => {
    if (!toastMessage) return;
    const timeoutId = window.setTimeout(() => setToastMessage(''), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  if (currentView === 'admin' && !adminAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-green-800"><Settings className="h-6 w-6" aria-hidden="true" /></div>
            <div><p className="text-xs font-bold uppercase tracking-wider text-green-700">VistaLab Cambodia</p><h1 className="text-2xl font-black text-slate-900">{staffCatalogView ? 'Staff catalog sign in' : 'Admin sign in'}</h1></div>
          </div>
          {!adminAuthReady ? (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Checking admin session…</p>
          ) : !supabaseClient ? (
            <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
              <p className="font-bold">Admin sign-in is not configured yet.</p>
              <p>Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to your local environment or GitHub Actions variables, then restart the dev server or rebuild the site.</p>
            </div>
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <label className="block text-sm font-semibold text-slate-700">Email
                <input type="email" autoComplete="username" required value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">Password
                <span className="relative mt-1 block">
                  <input type={showAdminPassword ? 'text' : 'password'} autoComplete="current-password" required value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 pr-16 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100" />
                  <button type="button" onClick={() => setShowAdminPassword((visible) => !visible)} aria-label={showAdminPassword ? 'Hide password' : 'Show password'} aria-pressed={showAdminPassword} className="absolute inset-y-0 right-2 my-auto rounded-md px-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-green-800 focus:outline-none focus:ring-2 focus:ring-green-600">{showAdminPassword ? 'Hide' : 'Show'}</button>
                </span>
              </label>
              {adminLoginError && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{adminLoginError}</p>}
              <button type="submit" disabled={adminLoginBusy} className="w-full rounded-xl bg-[#267A3B] px-4 py-3 font-bold text-white transition hover:bg-[#206d34] disabled:cursor-wait disabled:opacity-60">{adminLoginBusy ? 'Signing in…' : 'Sign in'}</button>
            </form>
          )}
          <a href={`${window.location.pathname}?${staffCatalogView ? 'admin=1' : 'catalog=staff'}`} className="mt-3 block w-full rounded-xl px-4 py-2.5 text-center text-sm font-semibold text-green-800 hover:bg-green-50">
            {staffCatalogView ? 'Admin sign in' : 'Staff catalog sign in'}
          </a>
          <button onClick={() => { setCurrentView('home'); window.history.replaceState(null, '', window.location.pathname); }} className="mt-5 w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Back to website</button>
        </section>
      </main>
    );
  }

  if (currentView === 'admin' && staffCatalogView && adminAuthenticated) {
    return <StaffCatalogPage onSignOut={handleAdminLogout} />;
  }

  if (currentView === 'admin' && standaloneCatalog && adminAuthenticated) {
    return (
      <main className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-slate-50">
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 shadow-sm sm:px-6">
          <div className="flex items-center gap-3">
            <p className="hidden text-xs font-bold uppercase tracking-wider text-green-700 sm:block">VistaLab Cambodia · Admin</p>
            <h1 className="text-lg font-black text-slate-900">Catalog Studio</h1>
          </div>
          <a href={`${window.location.pathname}?admin=1`} className="shrink-0 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Back to Admin</a>
        </header>
        <CatalogStudioAdmin fullScreen />
      </main>
    );
  }

  return (
    <div
      lang={lang === 'KH' ? 'km' : 'en'}
      aria-busy={languageLoading}
      className="min-h-screen w-full min-w-0 bg-slate-50 text-slate-800 font-sans flex flex-col selection:bg-green-900 selection:text-white"
      style={lang === 'KH' ? { fontFamily: "'Kantumruy Pro', 'Noto Sans Khmer', sans-serif", fontSynthesis: 'none' } : undefined}
    >
      {languageLoading && (
        <div className="language-loading-overlay" role="status" aria-live="polite">
          <span className="language-loading-spinner" aria-hidden="true" />
          <span className="language-loading-label">{lang === 'KH' ? 'កំពុងប្តូរភាសា…' : 'Switching language…'}</span>
        </div>
      )}
      {}
      {toastMessage && (
        <div className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-auto sm:right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 border border-slate-700">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all duration-200">
        {/* Top utility bar */}
        <div className="site-topbar-friendly bg-green-50 text-slate-700 text-xs py-1.5 px-4 sm:px-8 border-b border-green-100">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1.5">
                <Phone className="w-3.5 h-3.5 text-green-400" />
                <span className="hidden sm:inline">{settings.phone1}</span>
                <span className="sm:hidden">{settings.phone1}</span>
              </span>
              <span className="hidden md:flex items-center space-x-1.5">
                <Mail className="w-3.5 h-3.5 text-green-400" />
                <span>{settings.email}</span>
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="hidden sm:inline-block text-green-300 font-medium">
                {lang === 'EN' ? "Connecting Brands to Cambodia" : "ភ្ជាប់ទំនាក់ទំនងម៉ាកផលិតផលមកកាន់កម្ពុជា"}
              </span>
              {/* Language Switcher */}
              <div className="flex items-center bg-green-50 rounded-lg p-0.5 border border-green-200">
                <button
                  onClick={() => changeLanguage('KH')}
                  disabled={languageLoading}
                  aria-pressed={lang === 'KH'}
                  className={`px-2 py-0.5 text-xs rounded font-bold transition-colors disabled:cursor-wait ${lang === 'KH' ? 'bg-green-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                >
                  KH
                </button>
                <button
                  onClick={() => changeLanguage('EN')}
                  disabled={languageLoading}
                  aria-pressed={lang === 'EN'}
                  className={`px-2 py-0.5 text-xs rounded font-bold transition-colors disabled:cursor-wait ${lang === 'EN' ? 'bg-green-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                >
                  EN
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Navbar */}
        <div className="w-full min-w-0 max-w-7xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between">
          {/* Logo */}
          <div 
            onClick={() => setCurrentView('home')} 
            className="group flex min-w-0 flex-1 items-center gap-2 sm:gap-3"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-green-100 bg-white shadow-sm transition-transform group-hover:scale-105 sm:h-11 sm:w-11">
              <BrandMark className="h-7 w-7 sm:h-9 sm:w-9" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-1 whitespace-nowrap text-sm font-black tracking-[0.04em] text-[#153C73] sm:gap-2 sm:text-xl">
                <span className="truncate">VISTALAB</span>
                <img src="./cambodia-flag.svg" alt={tx('Cambodia flag', 'ទង់ជាតិកម្ពុជា')} className="inline-block h-3.5 w-5 shrink-0 rounded-[3px] align-middle object-cover shadow-sm ring-1 ring-black/10 sm:h-[18px] sm:w-[27px] max-[340px]:hidden" />
              </div>
              <div className="hidden text-[9px] font-semibold tracking-[0.09em] text-slate-500 min-[480px]:block sm:text-[10px] sm:tracking-[0.12em]">
                {tx('FMCG IMPORTER & DISTRIBUTOR', 'អ្នកនាំចូល និងចែកចាយផលិតផល FMCG')}
              </div>
            </div>
          </div>

          {/* Desktop Links */}
          <nav className="hidden lg:flex items-center space-x-1 xl:space-x-2 text-sm font-semibold text-slate-700">
            {[
              { id: 'home', label: t.navHome, icon: Home },
              { id: 'about', label: tx('About & Distribution', 'អំពីយើង និងបណ្តាញចែកចាយ'), icon: Info },
              { id: 'brands', label: t.navBrands, icon: Tags },
              { id: 'products', label: t.navProducts, icon: Package },
              { id: 'partner', label: t.navPartner, icon: Handshake },
              { id: 'seller', label: t.navSeller, icon: Store },
              { id: 'news', label: t.navNews, icon: Newspaper },
              { id: 'contact', label: t.navContact, icon: Phone }
            ].map((link) => (
              <button
                key={link.id}
                onClick={() => { if (link.id === 'products') setActiveBrandFilter(null); setCurrentView(link.id); }}
                className={`px-3 py-2 rounded-lg transition-all ${currentView === link.id ? 'bg-[#267A3B] text-white font-bold' : 'hover:bg-slate-100 text-slate-600'}`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Action CTAs */}
          <div className="hidden lg:flex items-center space-x-3">
            <button
              onClick={() => openInquiry('', '', 'General')}
              className="bg-[#267A3B] hover:bg-[#246F38] text-white px-4 py-2 rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center space-x-1.5 border border-green-500/20"
            >
              <span>{t.contactUs}</span>
              <ChevronRight className="w-4 h-4 text-green-400" />
            </button>
          </div>

          {/* Mobile menu trigger */}
          <div className="ml-2 flex shrink-0 items-center space-x-1 lg:hidden sm:space-x-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg focus:outline-none"
              aria-label={mobileMenuOpen ? tx('Close navigation menu', 'បិទម៉ឺនុយ') : tx('Open navigation menu', 'បើកម៉ឺនុយ')}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div
            id="mobile-navigation"
            className="lg:hidden bg-white border-b border-slate-200 px-3 sm:px-4 pt-2 pb-4 sm:pb-6 space-y-2 shadow-xl animate-fadeIn max-h-[calc(100vh-7rem)] overflow-y-auto overscroll-contain"
          >
            <div className="grid grid-cols-2 gap-2 pb-3 border-b border-slate-100">
              {[
                { id: 'home', label: t.navHome, icon: Home },
                { id: 'about', label: tx('About & Distribution', 'អំពីយើង និងបណ្តាញចែកចាយ'), icon: Info },
                { id: 'brands', label: t.navBrands, icon: Tags },
                { id: 'products', label: t.navProducts, icon: Package },
                { id: 'partner', label: t.navPartner, icon: Handshake },
                { id: 'seller', label: t.navSeller, icon: Store },
                { id: 'news', label: t.navNews, icon: Newspaper },
                { id: 'contact', label: t.navContact, icon: Phone }
              ].map((link) => (
                <button
                  key={link.id}
                  onClick={() => { if (link.id === 'products') setActiveBrandFilter(null); setCurrentView(link.id); }}
                  className={`flex min-h-11 min-w-0 items-center gap-2 text-left px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${currentView === link.id ? 'bg-[#267A3B] text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  <link.icon className={`h-4 w-4 shrink-0 ${currentView === link.id ? 'text-white' : 'text-slate-400'}`} aria-hidden="true" />
                  <span className="min-w-0 leading-snug">{link.label}</span>
                </button>
              ))}
            </div>
            <div className="pt-2 flex flex-col space-y-2">
              <button
                onClick={() => openInquiry('', '', 'General')}
                className="w-full bg-[#267A3B] text-white py-3 rounded-xl font-bold text-center text-sm shadow-md"
              >
                {t.contactUs}
              </button>
              <div className="grid grid-cols-3 items-center gap-1 pt-2 text-[11px] font-semibold text-slate-600">
                <a href={`tel:${settings.phone1}`} className="flex min-h-10 items-center justify-center gap-1 text-green-900">
                  <Phone className="w-4 h-4 text-green-500" />
                  <span>{tx('Call Us', 'ហៅទូរសព្ទមកយើង')}</span>
                </a>
                <a href={`https://t.me/${settings.telegram.replace('@','')}`} target="_blank" rel="noreferrer" className="flex min-h-10 items-center justify-center gap-1 text-green-700">
                  <MessageCircle className="w-4 h-4" />
                  <span>Telegram</span>
                </a>
                <a href={settings.facebook} target="_blank" rel="noreferrer" aria-label="Visit VistaLab on Facebook" className="flex min-h-10 items-center justify-center gap-1 text-green-700">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0"><path d="M14.2 21v-8h2.7l.4-3.1h-3.1V8c0-.9.3-1.5 1.6-1.5h1.7V3.7c-.3 0-1.4-.2-2.7-.2-2.7 0-4.5 1.6-4.5 4.6v1.8h-3v3.1h3v8h3.9Z" fill="#267A3B" /></svg>
                  <span>Facebook</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </header>

      {}
      <main key={currentView} className="page-transition min-w-0 flex-grow">
        {/* VIEW: HOMEPAGE */}
        {currentView === 'home' && (
          <div className="space-y-6 pb-16 sm:space-y-16 lg:space-y-24">
            {/* HERO POSTER */}
            <section className="site-hero-friendly overflow-hidden px-4 py-4 sm:px-8 sm:py-8">
              <div style={{ width: 'min(100%, calc(100vw - 2rem))', minWidth: 0 }} className="relative mx-auto min-h-0 w-full min-w-0 max-w-7xl overflow-hidden rounded-[2rem] bg-green-50 shadow-xl sm:min-h-[460px]">
                <img
                  src={settings.heroImage || `${import.meta.env.BASE_URL}images/hero-warehouse-banner.jpg`}
                  alt="VistaLab Cambodia distribution warehouse"
                  className="poster-image absolute inset-x-0 top-0 h-[220px] w-full object-cover sm:inset-y-0 sm:left-auto sm:right-0 sm:h-full sm:w-[62%]"
                />
                <div aria-hidden="true" className="absolute inset-x-0 top-[125px] h-[110px] bg-gradient-to-b from-transparent to-green-50 sm:inset-y-0 sm:left-1/3 sm:right-0 sm:top-0 sm:h-auto sm:bg-gradient-to-r sm:from-green-50 sm:via-green-50/80 sm:to-transparent" />
                <div style={{ width: '100%', minWidth: 0 }} className="poster-copy relative z-10 flex min-h-0 w-full min-w-0 max-w-2xl flex-col justify-end px-4 pb-6 pt-[232px] sm:min-h-[460px] sm:justify-center sm:px-10 sm:py-12 lg:px-14">
                  <div className="mb-3 inline-flex w-fit max-w-full items-center gap-2 whitespace-normal rounded-full border border-green-200 bg-white/90 px-3 py-1.5 text-xs font-bold text-green-800 shadow-sm sm:text-sm">
                    <Sparkles className="h-4 w-4 text-green-600" />
                    {lang === 'KH' ? settings.heroSubtitle_kh : settings.heroSubtitle_en}
                  </div>
                  <h1 style={{ width: '100%', overflowWrap: 'anywhere' }} className="max-w-full break-words text-3xl font-black leading-tight tracking-tight text-slate-950 sm:max-w-xl sm:text-5xl lg:text-6xl">{lang === 'KH' ? settings.heroTitle_kh : settings.heroTitle_en}</h1>
                  <p style={{ width: '100%', overflowWrap: 'anywhere' }} className="mt-3 max-w-full break-words text-sm leading-relaxed text-slate-700 sm:max-w-lg sm:text-base">{lang === 'KH' ? settings.heroDescription_kh : settings.heroDescription_en}</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button onClick={() => setCurrentView('brands')} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 px-5 py-3 font-bold text-white shadow-md transition hover:bg-green-800 sm:w-auto">
                      {t.exploreBrands}<ArrowRight className="h-5 w-5" />
                    </button>
                    <button onClick={() => setCurrentView('partner')} className="w-full rounded-xl border border-green-200 bg-white px-5 py-3 font-bold text-slate-800 transition hover:bg-green-50 sm:w-auto">{t.partnerWithUs}</button>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-700 sm:text-sm">
                    <span>✓ {tx('12+ Active Brands', 'ម៉ាកផលិតផលជាង ១២')}</span>
                    <span>✓ {tx('Quality Imports', 'ផលិតផលនាំចូលមានគុណភាព')}</span>
                    <span>✓ {tx('Nationwide Distribution', 'ចែកចាយទូទាំងប្រទេស')}</span>
                  </div>
                </div>
                <div className="poster-trust-badge absolute right-3 top-[154px] max-w-[calc(100%-1.5rem)] rounded-2xl border border-white/70 bg-white/90 px-3 py-2 text-center shadow-lg sm:right-8 sm:top-8 sm:px-4 sm:py-3">
                  <div className="text-2xl font-black leading-none text-green-800">{settings.heroTrustedBrands}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">{tx('Trusted Brands', 'ម៉ាកដែលទុកចិត្ត')}</div>
                </div>
              </div>
            </section>
            {posterSlides.length > 0 && <section aria-label={tx('Featured posters', 'ផ្ទាំងរូបភាពពិសេស')} className="mx-auto w-full max-w-7xl px-4 sm:px-8">
              <div className="relative aspect-[16/8] min-h-40 overflow-hidden rounded-3xl bg-slate-100 shadow-lg sm:aspect-[16/7] sm:min-h-[300px]">
                {posterSlides.map((image, index) => <img key={`${index}-${image.slice(0, 40)}`} src={image} alt={tx(`Featured poster ${index + 1}`, `ផ្ទាំងរូបភាព ${index + 1}`)} aria-hidden={index !== posterSlideIndex} className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-in-out ${index === posterSlideIndex ? 'opacity-100' : 'opacity-0'}`} />)}
                {posterSlides.length > 1 && <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2" aria-label={tx('Choose a poster', 'ជ្រើសរើសផ្ទាំងរូបភាព')}>
                  {posterSlides.map((_, index) => <button key={index} type="button" onClick={() => setPosterSlideIndex(index)} aria-label={tx(`Show poster ${index + 1}`, `បង្ហាញផ្ទាំងរូបភាព ${index + 1}`)} aria-current={index === posterSlideIndex} className={`h-2.5 rounded-full shadow transition-all ${index === posterSlideIndex ? 'w-8 bg-white' : 'w-2.5 bg-white/65 hover:bg-white'}`} />)}
                </div>}
              </div>
            </section>}
            {/* TRUST / COMPANY INTRO CARDS */}
            <section className="max-w-7xl mx-auto px-4 sm:px-8 space-y-8 sm:space-y-12">
              <div className="text-center max-w-3xl mx-auto space-y-3">
                <h2 className="text-2xl sm:text-4xl font-extrabold text-[#202124]">{t.trustTitle}</h2>
                <p className="text-slate-600 text-sm sm:text-base">{t.trustDesc}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {[
                  { icon: ShieldCheck, title: t.importTitle, desc: t.importDesc, color: "text-green-600 bg-green-50" },
                  { icon: Truck, title: t.distribTitle, desc: t.distribDesc, color: "text-green-600 bg-green-50" },
                  { icon: Award, title: t.brandDevTitle, desc: t.brandDevDesc, color: "text-green-600 bg-green-50" },
                  { icon: Users, title: t.partnershipTitle, desc: t.partnershipDesc, color: "text-green-700 bg-green-50" }
                ].map((item, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-4">
                    <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center`}>
                      <item.icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* PRODUCT CATEGORIES FILTER */}
            <section className="bg-slate-100 py-10 sm:py-16 px-4 sm:px-8 border-y border-slate-200">
              <div className="max-w-7xl mx-auto space-y-5 sm:space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-[#202124]">{t.catTitle}</h2>
                    <p className="text-slate-600 text-sm mt-1">{t.catSub}</p>
                  </div>
                  <button 
                    onClick={() => { setActiveBrandFilter(null); setCurrentView('products'); }}
                    className="text-green-900 hover:text-green-600 font-bold text-sm flex items-center space-x-1"
                  >
                    <span>{t.viewAllProducts}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pb-2">
                  {productCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeCategory === cat ? 'bg-[#267A3B] text-white shadow-md' : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'}`}
                    >
                      {categoryLabels[cat]}
                    </button>
                  ))}
                </div>

                {/* Filtered Product Grid preview */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                  {products
                    .filter(p => activeCategory === 'All' || p.category === activeCategory)
                    .slice(0, 4)
                    .map((prod) => (
                      <div key={prod.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col justify-between group">
                        <button type="button" onClick={() => setSelectedProduct(prod)} aria-label={`View ${prod.name_en} image`} className={`relative flex h-40 w-full flex-col items-center justify-center bg-white p-3 text-center sm:h-48 ${prod.imageBg}`}>
                          {prod.image && <img src={prod.image} alt={prod.name_en} className="absolute inset-0 h-full w-full bg-white object-contain p-2 sm:p-3" />}
                          <span className="absolute top-3 left-3 bg-white/80 backdrop-blur-sm text-slate-800 text-xs font-extrabold px-2.5 py-1 rounded-md border border-slate-200">
                            {prod.brand}
                          </span>
                          <span title={prod.origin} className="absolute right-3 top-3 flex h-9 min-w-14 items-center justify-center rounded-lg border border-slate-200 bg-white/95 px-1.5 shadow-sm">
                            <CountryFlag country={prod.origin} image={brands.find((brand) => brand.name === prod.brand)?.flagImage} />
                          </span>
                          {!prod.image && <span className="text-2xl font-black text-slate-700/60 uppercase tracking-widest">
                            {localizedProductBadge(prod)}
                          </span>}
                          {!prod.image && <span className="text-xs font-semibold text-slate-500 mt-2">{tx('Imported from', 'នាំចូលពី')} {prod.origin === 'Malaysia' && lang === 'KH' ? 'ម៉ាឡេស៊ី' : prod.origin}</span>}
                        </button>
                        <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                          <div>
                            <span className="text-[11px] font-bold text-green-600 uppercase tracking-wide">{localizedCategory(prod.category)}</span>
                            <h4 className="text-base font-bold text-slate-900 group-hover:text-green-900 transition-colors line-clamp-2 mt-1">
                              {localizedProductName(prod)}
                            </h4>
                            <ProductDescriptionPreview text={localizedProductSpecs(prod)} className="mt-2 text-xs text-slate-500" />
                          </div>
                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                            <button
                              onClick={() => setSelectedProduct(prod)}
                              className="text-xs font-bold text-slate-700 hover:text-green-900"
                            >
                              {t.viewDetails}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </section>

            {/* FEATURED BRANDS GRID */}
            <section className="max-w-7xl mx-auto px-4 sm:px-8 space-y-10">
              <div className="text-center max-w-2xl mx-auto space-y-2">
                <h2 className="text-2xl sm:text-4xl font-extrabold text-[#202124]">{t.brandsTitle}</h2>
                <p className="text-slate-600 text-sm">{t.brandsSub}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {brands.slice(0, 12).map((b) => (
                  <div
                    key={b.id}
                    onClick={() => { setSelectedBrand(b); }}
                    className="min-h-44 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-green-400 cursor-pointer transition-all text-center flex flex-col items-center justify-center space-y-3 group"
                  >
                    <div className="flex h-24 w-full items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50 to-green-50 text-[#202124] font-black text-2xl group-hover:border-green-200 sm:h-28">
                      {b.image ? <img src={b.image} alt={`${b.name} logo`} className="h-full w-full p-2 object-contain" /> : <span className="max-w-full truncate px-2">{b.logoText || b.name}</span>}
                    </div>
                    <span className="font-extrabold text-slate-900 text-sm leading-tight group-hover:text-green-900">{b.name}</span>
                    <span className="text-[10px] text-slate-500 font-medium leading-tight">{localizedCategory(b.category)}</span>
                  </div>
                ))}
              </div>

              <div className="text-center">
                <button
                  onClick={() => setCurrentView('brands')}
                  className="bg-white hover:bg-slate-100 text-[#202124] font-extrabold px-6 py-3 rounded-xl border border-slate-300 shadow-sm text-sm"
                >
                  {t.viewAllBrands}
                </button>
              </div>
            </section>

            {/* INTERACTIVE CAMBODIA DISTRIBUTION NETWORK MAP */}
            <section className="site-map-friendly bg-white text-slate-800 py-10 sm:py-16 px-4 sm:px-8 relative overflow-hidden">
              <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-12 items-center">
                <div className="lg:col-span-5 space-y-4 sm:space-y-6">
                  <span className="text-xs font-bold text-green-700 uppercase tracking-widest">{tx('LOGISTICS & NETWORK', 'ភស្តុភារ និងបណ្តាញចែកចាយ')}</span>
                  <h2 className="text-2xl sm:text-4xl font-black">{t.distribNetworkTitle}</h2>
                  <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                    {t.distribNetworkSub}
                  </p>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-3 rounded-2xl border border-green-100 bg-white p-4 shadow-sm">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700"><Building2 className="h-5 w-5" aria-hidden="true" /></span>
                      <span><span className="block text-sm font-bold text-slate-900">{tx('Central Warehousing', 'ឃ្លាំងកណ្តាល')}</span><span className="mt-0.5 block text-xs text-slate-500">{tx('Phnom Penh, Cambodia', 'រាជធានីភ្នំពេញ')}</span></span>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl border border-green-100 bg-white p-4 shadow-sm">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700"><MapPin className="h-5 w-5" aria-hidden="true" /></span>
                      <span><span className="block text-sm font-bold text-slate-900">{tx('Provincial Hubs', 'មជ្ឈមណ្ឌលតាមខេត្ត')}</span><span className="mt-0.5 block text-xs text-slate-500">{tx('24 provinces + Phnom Penh', '២៤ ខេត្ត និងរាជធានីភ្នំពេញ')}</span></span>
                    </div>
                  </div>
                  <button
                    onClick={() => setCurrentView('about')}
                    className="mt-4 bg-green-700 hover:bg-green-800 text-white font-extrabold px-6 py-3 rounded-xl text-sm shadow-md transition-all flex items-center space-x-2"
                  >
                    <span>{tx('Explore Supply Chain Channel', 'ស្វែងយល់អំពីបណ្តាញផ្គត់ផ្គង់')}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Google Maps hub locations */}
                <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-green-200 shadow-lg shadow-slate-200/70 relative min-h-[380px] flex flex-col justify-between">
                  <div className="flex justify-between items-center text-xs text-slate-600 border-b border-green-100 pb-3">
                    <span className="font-bold text-green-800">{tx('Google Maps - Cambodia Hub Locations', 'ទីតាំងមជ្ឈមណ្ឌលចែកចាយនៅកម្ពុជា')}</span>
                    <span>{tx('Select a hub below', 'ជ្រើសរើសមជ្ឈមណ្ឌលខាងក្រោម')}</span>
                  </div>

                  <div className="relative w-full h-64 sm:h-80 rounded-2xl overflow-hidden border border-green-200 my-4 bg-slate-100">
                    <iframe
                      title={`Google Map showing ${selectedHub.locationQuery}`}
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedHub.locationQuery)}&z=8&output=embed`}
                      className="h-full w-full border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      allowFullScreen
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-700">
                    {distributionHubs.map((hub) => (
                      <button
                        key={hub.id}
                        type="button"
                        onClick={() => setSelectedHubId(hub.id)}
                        aria-pressed={selectedHub.id === hub.id}
                        className={`flex min-w-0 items-center gap-1.5 rounded-lg border p-2 text-left transition-colors ${selectedHub.id === hub.id ? 'site-map-hub-selected border-green-700 bg-green-700 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-green-50 hover:border-green-200'}`}
                      >
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{lang === 'KH' ? ({ h1: 'ការិយាល័យកណ្តាលភ្នំពេញ', h2: 'មជ្ឈមណ្ឌលតំបន់សៀមរាប', h3: 'មជ្ឈមណ្ឌលភាគខាងលិចបាត់ដំបង', h4: 'មជ្ឈមណ្ឌលកំពត និងព្រះសីហនុ', h5: 'មជ្ឈមណ្ឌលត្បូងឃ្មុំ និងកំពង់ចាម' }[hub.id] ?? hub.name) : hub.name}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                    <span>{lang === 'KH' ? ({ 'Main Warehouse & Hub': 'ឃ្លាំងកណ្តាល និងមជ្ឈមណ្ឌល', 'Distribution Hub': 'មជ្ឈមណ្ឌលចែកចាយ', 'Southern Hub': 'មជ្ឈមណ្ឌលភាគខាងត្បូង', 'Eastern Hub': 'មជ្ឈមណ្ឌលភាគខាងកើត' }[selectedHub.type] ?? selectedHub.type) : selectedHub.type} | {lang === 'KH' ? selectedHub.count.replace(' Outlets', ' ហាង') : selectedHub.count} | {tx('City-level location', 'ទីតាំងក្នុងក្រុង')}</span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedHub.locationQuery)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-green-700 underline underline-offset-2 hover:text-green-900"
                    >
                      {tx('Open in Google Maps', 'បើកក្នុង Google Maps')}
                    </a>
                  </div>
                  <details className="mt-4 border-t border-green-100 pt-3 text-sm text-slate-700">
                    <summary className="cursor-pointer font-semibold text-green-800">{tx('View all 24 provinces + Phnom Penh', 'មើលខេត្តទាំង ២៤ និងរាជធានីភ្នំពេញ')}</summary>
                    <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                      {cambodianProvinces.map((province) => <li key={province.name} className="min-w-0 truncate">{lang === 'KH' ? province.nameKh : province.name}</li>)}
                    </ul>
                  </details>
                </div>
              </div>
            </section>

            {/* WHY PARTNER WITH VISTALAB */}
            <section className="max-w-7xl mx-auto px-4 sm:px-8 space-y-12">
              <div className="text-center max-w-2xl mx-auto space-y-2">
                <h2 className="text-2xl sm:text-4xl font-extrabold text-[#202124]">{t.whyTitle}</h2>
              <p className="text-slate-600 text-sm">{tx('Empowering brands through operational excellence and dedicated retail partnerships.', 'ជួយអភិវឌ្ឍម៉ាកផលិតផលតាមរយៈប្រតិបត្តិការប្រកបដោយប្រសិទ្ធភាព និងភាពជាដៃគូជាមួយអ្នកលក់រាយ។')}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {[
                  { title: t.why1Title, desc: t.why1Desc, icon: Building2 },
                  { title: t.why2Title, desc: t.why2Desc, icon: ShieldCheck },
                  { title: t.why3Title, desc: t.why3Desc, icon: Layers },
                  { title: t.why4Title, desc: t.why4Desc, icon: Sparkles },
                  { title: t.why5Title, desc: t.why5Desc, icon: MessageCircle },
                  { title: t.why6Title, desc: t.why6Desc, icon: BarChart3 }
                ].map((item, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-green-100 text-green-800 flex items-center justify-center">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* PARTNER CTA & SOCIAL HUB */}
            <section className="max-w-7xl mx-auto px-4 sm:px-8">
              <div className="site-green-panel bg-green-50 rounded-3xl p-5 sm:p-8 sm:p-12 text-slate-800 shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8 items-center border border-green-200">
                <div className="lg:col-span-8 space-y-4">
                  <h2 className="text-2xl sm:text-4xl font-black">{t.ctaTitle}</h2>
                  <p className="text-slate-300 text-sm sm:text-base">{t.ctaDesc}</p>
                </div>
                <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3 justify-end">
                  <button
                    onClick={() => setCurrentView('partner')}
                    className="bg-green-500 hover:bg-green-600 text-slate-950 font-extrabold px-6 py-3.5 rounded-xl shadow-md transition-all text-center text-sm"
                  >
                    {t.partnerWithUs}
                  </button>
                  <button
                    onClick={() => setCurrentView('seller')}
                    className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold px-6 py-3.5 rounded-xl transition-all text-center text-sm"
                  >
                    {t.becomeSeller}
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {}
        {currentView === 'about' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-7 sm:py-12 space-y-10 sm:space-y-16">
            {/* Header */}
            <section className="grid min-h-[440px] overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/60 md:grid-cols-2">
              <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-12">
                <span className="text-xs font-extrabold uppercase tracking-widest text-green-600">{tx('ABOUT VISTALAB CAMBODIA', 'អំពី VistaLab Cambodia')}</span>
                <h1 className="mt-3 text-3xl font-black leading-tight text-[#202124] sm:text-4xl lg:text-5xl">{lang === 'KH' ? settings.aboutTitle_kh : settings.aboutTitle_en}</h1>
                <p className="mt-4 max-w-xl text-base leading-7 text-slate-700">{lang === 'KH' ? settings.aboutDescription_kh : settings.aboutDescription_en}</p>
                <div className="mt-6 grid max-w-md grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><span className="block text-2xl font-black text-[#202124]">12+</span><span className="mt-1 block text-xs font-semibold text-slate-600">{tx('Consumer brands', 'ម៉ាកផលិតផល')}</span></div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><span className="block text-2xl font-black text-[#202124]">2016</span><span className="mt-1 block text-xs font-semibold text-slate-600">{tx('Serving Cambodia', 'បម្រើទីផ្សារកម្ពុជា')}</span></div>
                </div>
              </div>
              <div className="relative min-h-[320px] overflow-hidden bg-slate-100 sm:min-h-[400px] md:min-h-full">
                <img src={settings.aboutHeroImage || `${import.meta.env.BASE_URL}images/hero-warehouse-banner.jpg`} alt="VistaLab warehouse and distribution operations" className={`absolute inset-0 h-full w-full object-cover ${settings.aboutHeroAnimated ? 'hero-background-image' : ''}`} />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#267A3B]/30 via-transparent to-white/10" />
                <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3 rounded-2xl border border-white/40 bg-[#267A3B]/85 p-4 text-white shadow-lg backdrop-blur-sm sm:inset-x-6 sm:bottom-6"><div><span className="text-[10px] font-bold uppercase tracking-widest text-green-300">{tx('Our operations', 'ប្រតិបត្តិការរបស់យើង')}</span><p className="mt-1 text-sm font-extrabold sm:text-base">{tx('Import. Store. Deliver.', 'នាំចូល រក្សាទុក និងចែកចាយ')}</p></div><Truck className="h-7 w-7 shrink-0 text-green-400" aria-hidden="true" /></div>
              </div>
            </section>
            {/* Corporate Timeline */}
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/50 space-y-5 sm:p-8 sm:space-y-8 lg:p-10">
              <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-end">
  <div><span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-green-600">{tx('COMPANY MILESTONES', 'ដំណាក់កាលសំខាន់ៗ')}</span><h2 className="mt-1 text-2xl font-black text-[#202124]">{tx('Our Journey & Development', 'ដំណើររីកចម្រើនរបស់យើង')}</h2></div>
  <p className="max-w-md text-sm leading-relaxed text-slate-600">{tx('Growing our portfolio and distribution network to serve more Cambodian families.', 'ពង្រីកម៉ាកផលិតផល និងបណ្តាញចែកចាយ ដើម្បីបម្រើគ្រួសារកម្ពុជាកាន់តែច្រើន។')}</p>
</div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6 relative">
                {[
                  { year: "2016-2017", title: tx("Establishment & Initial Imports", "ការបង្កើតក្រុមហ៊ុន និងការនាំចូលដំបូង"), desc: tx("Initiated company operations, establishing key imported product channels from Malaysia.", "ចាប់ផ្តើមប្រតិបត្តិការក្រុមហ៊ុន និងបង្កើតបណ្តាញនាំចូលផលិតផលសំខាន់ៗពីប្រទេសម៉ាឡេស៊ី។") },
                  { year: "2019-2021", title: tx("Brand Portfolio Expansion", "ការពង្រីកម៉ាកផលិតផល"), desc: tx("Secured key portfolio brands including L'affair, Elizzer, Be Love, and BIKA.", "បាននាំចូល និងចែកចាយម៉ាកសំខាន់ៗ រួមមាន L'affair, Elizzer, Be Love និង BIKA។") },
                  { year: "2022-2024", title: tx("Provincial Distribution Growth", "ការពង្រីកការចែកចាយតាមខេត្ត"), desc: tx("Expanded sales channels outside Phnom Penh into major regional provinces.", "ពង្រីកបណ្តាញលក់ពីរាជធានីភ្នំពេញទៅកាន់ខេត្តសំខាន់ៗ។") },
                  { year: "2026+", title: tx("Digital Transformation & B2B", "ការផ្លាស់ប្តូរឌីជីថល និងអាជីវកម្ម B2B"), desc: tx("Launching updated digital presence and streamlining commercial partner order workflows.", "កែលម្អវត្តមានឌីជីថល និងសម្រួលដំណើរការបញ្ជាទិញសម្រាប់ដៃគូអាជីវកម្ម។") }
                ].map((step, idx) => (
                  <div key={idx} className="relative rounded-2xl border border-slate-200 border-t-4 border-t-green-400 bg-gradient-to-b from-green-50/60 to-white p-5 shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-md sm:p-6">
                    <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-[#267A3B] text-sm font-black text-white">0{idx + 1}</span>
                    <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-900">{step.year}</span>
                    <h3 className="text-base font-bold text-slate-900 pt-1">{step.title}</h3>
                    <p className="text-sm text-slate-700 leading-relaxed">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Vision & Mission Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
              <div className="site-green-panel bg-green-50 text-slate-800 p-5 sm:p-8 rounded-3xl space-y-4 shadow-md border border-green-200">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 text-green-400 flex items-center justify-center">
                  <Award className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold">{tx('Our Vision', 'ចក្ខុវិស័យរបស់យើង')}</h3>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                  {tx('“To become the most trusted FMCG distribution partner in Cambodia and the preferred local partner for leading international consumer brands.”', '“ក្លាយជាដៃគូចែកចាយផលិតផល FMCG ដែលគួរឱ្យទុកចិត្តបំផុតនៅកម្ពុជា និងជាដៃគូក្នុងស្រុកដែលម៉ាកផលិតផលអន្តរជាតិឈានមុខជ្រើសរើស។”')}
                </p>
              </div>

              <div className="bg-white p-5 sm:p-8 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-green-100 text-green-900 flex items-center justify-center">
                  <Briefcase className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-[#202124]">{tx('Our Mission', 'បេសកកម្មរបស់យើង')}</h3>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  {tx('“To bring genuine, high-quality products to Cambodian families, develop strong local brand equity, and create sustainable economic value for our retail partners and international suppliers.”', '“នាំយកផលិតផលពិត និងមានគុណភាពខ្ពស់ជូនគ្រួសារកម្ពុជា អភិវឌ្ឍម៉ាកផលិតផលក្នុងស្រុកឱ្យរឹងមាំ និងបង្កើតតម្លៃសេដ្ឋកិច្ចប្រកបដោយចីរភាពសម្រាប់ដៃគូលក់រាយ និងអ្នកផ្គត់ផ្គង់អន្តរជាតិ។”')}
                </p>
              </div>
            </div>
          </div>
        )}

        {}
        {currentView === 'brands' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-7 sm:py-12 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
                      <span className="text-xs font-bold text-green-600 uppercase tracking-widest">{tx('BRAND PORTFOLIO', 'ផលប័ត្រម៉ាកផលិតផល')}</span>
              <h1 className="text-3xl sm:text-5xl font-black text-[#202124]">{t.brandsTitle}</h1>
              <p className="text-slate-600 text-base">{t.brandsSub}</p>
            </div>

            {/* Brand Directory Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              {brands.map((b) => (
                <div key={b.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between">
                  <div className="space-y-5 p-5 sm:p-6">
                    <div className="relative flex h-36 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-white p-5 sm:h-40">
                      {b.image ? (
                        <img src={b.image} alt={`${b.name} logo`} className="h-full w-full object-contain" />
                      ) : (
                        <span className="max-w-full truncate text-center text-3xl font-black tracking-tight text-[#202124] sm:text-4xl">{b.logoText || b.name}</span>
                      )}
                      <span title={b.origin} className="absolute right-2 top-2 flex h-9 min-w-14 items-center justify-center rounded-lg border border-slate-200 bg-white/95 px-1.5 shadow-sm">
                        <CountryFlag country={b.origin} image={b.flagImage} />
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xl font-extrabold text-slate-900 group-hover:text-green-900">{b.name}</h3>
                      <p className="text-xs font-bold text-green-900 mt-0.5">{localizedCategory(b.category)}</p>
                    </div>
                    <ProductDescriptionPreview text={localizedBrandDescription(b)} className="text-xs text-slate-600" />
                  </div>

                  <div className="mx-5 mb-5 flex items-center border-t border-slate-100 pt-4 sm:mx-6 sm:mb-6">
                    <button
                      onClick={() => setSelectedBrand(b)}
                      className="text-xs font-bold text-slate-700 hover:text-green-900 flex items-center space-x-1"
                    >
                      <span>{t.viewBrand}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {}
        {currentView === 'products' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-12 space-y-5 sm:space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 border-b border-slate-200 pb-4 sm:pb-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-[#202124]">{activeBrandFilter ? `${activeBrandFilter} ${tx('Products', 'ផលិតផល')}` : t.catTitle}</h1>
                <p className="text-slate-600 text-xs sm:text-sm mt-1">{activeBrandFilter ? tx(`Products from ${activeBrandFilter}`, `ផលិតផលពី ${activeBrandFilter}`) : t.featuredProdSub}</p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full min-w-0 md:w-80">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={tx('Search products or brands...', 'ស្វែងរកផលិតផល ឬម៉ាកផលិតផល...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-900"
                />
              </div>
            </div>

            {/* Filter Pills */}
            {activeBrandFilter && <button type="button" onClick={() => setActiveBrandFilter(null)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">{tx('← All products', '← ផលិតផលទាំងអស់')}</button>}
            {!activeBrandFilter && <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
              {productCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 px-3 py-1.5 sm:px-3.5 rounded-xl text-[11px] sm:text-xs font-bold ${activeCategory === cat ? 'bg-[#267A3B] text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'}`}
                >
                  {categoryLabels[cat]}
                </button>
              ))}
            </div>}

            {/* Product Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 lg:gap-6">
              {products
                .filter(p => (!activeBrandFilter || p.brand === activeBrandFilter))
                .filter(p => (activeCategory === 'All' || p.category === activeCategory))
                .filter((p) => {
                  const query = searchQuery.trim().toLowerCase();
                  return !query
                    || p.name_en.toLowerCase().includes(query)
                    || p.name_kh.toLowerCase().includes(query)
                    || p.brand.toLowerCase().includes(query)
                    || (p.code ?? '').toLowerCase().includes(query);
                })
                .reduce<Product[]>((ordered, product, _index, filtered) => {
                  const brandKey = product.brand.trim().toLocaleLowerCase();
                  if (ordered.some((item) => item.brand.trim().toLocaleLowerCase() === brandKey)) return ordered;
                  ordered.push(...filtered.filter((item) => item.brand.trim().toLocaleLowerCase() === brandKey));
                  return ordered;
                }, [])
                .map((prod) => (
                  <div key={prod.id} className="min-w-0 bg-white rounded-xl sm:rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
                    <button type="button" onClick={() => setSelectedProduct(prod)} aria-label={`View ${prod.name_en} image`} className={`relative flex h-36 w-full flex-col items-center justify-center bg-white p-2 text-center sm:h-48 lg:h-56 ${prod.imageBg}`}>
                      {prod.image && <img src={prod.image} alt={prod.name_en} className="absolute inset-0 h-full w-full bg-white object-contain p-2 sm:p-3" />}
                      <span className="absolute top-2 left-2 max-w-[calc(100%-4.5rem)] truncate bg-white/90 text-slate-900 text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded">
                        {prod.brand}
                      </span>
                      <span title={prod.origin} className="absolute right-2 top-2 flex h-7 sm:h-9 min-w-11 sm:min-w-14 items-center justify-center rounded-md sm:rounded-lg border border-slate-200 bg-white/95 px-1 shadow-sm">
                        <CountryFlag country={prod.origin} image={brands.find((brand) => brand.name === prod.brand)?.flagImage} />
                      </span>
                      {!prod.image && <span className="text-2xl font-black text-slate-600/50 uppercase">{localizedProductBadge(prod)}</span>}
                    </button>
                    <div className="min-w-0 p-3 sm:p-5 flex-grow flex flex-col justify-between gap-3 sm:gap-4">
                      <div>
                        <span className="text-[8px] sm:text-[10px] font-extrabold text-green-600 uppercase line-clamp-1">{localizedCategory(prod.category)}</span>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 mt-1 line-clamp-2 break-words">
                          {localizedProductName(prod)}
                        </h3>
                        {prod.code && <p className="mt-1 text-[9px] font-semibold tracking-wide text-slate-500 sm:text-[10px]">{tx('Code', 'កូដ')}: {prod.code}</p>}
                        <ProductDescriptionPreview text={localizedProductSpecs(prod)} className="mt-1.5 break-words text-[10px] text-slate-500 sm:mt-2 sm:text-xs" />
                      </div>
                      <div className="pt-2 sm:pt-3 border-t border-slate-100 flex items-center">
                        <button
                          onClick={() => setSelectedProduct(prod)}
                          className="text-[10px] sm:text-xs font-bold text-slate-700 hover:text-green-900"
                        >
                          {t.viewDetails}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {}
        {currentView === 'about' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-7 sm:py-12 space-y-10 sm:space-y-16">
            <section className="grid min-h-[440px] overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/60 md:grid-cols-2">
              <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-12">
                <span className="text-xs font-extrabold uppercase tracking-widest text-green-600">{tx('LOGISTICS & CHANNELS', 'ភស្តុភារ និងបណ្តាញចែកចាយ')}</span>
                <h1 className="mt-3 text-3xl font-black leading-tight text-[#202124] sm:text-4xl lg:text-5xl">{t.distribNetworkTitle}</h1>
                <p className="mt-4 max-w-xl text-base leading-7 text-slate-700">{tx('Comprehensive import and supply chain distribution across traditional trade, modern trade, and wholesale channels in Cambodia.', 'ប្រព័ន្ធនាំចូល និងចែកចាយផលិតផលតាមបណ្តាញលក់រាយ លក់ដុំ និងពាណិជ្ជកម្មទំនើបនៅទូទាំងប្រទេសកម្ពុជា។')}</p>
                <div className="mt-6 grid max-w-md grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><span className="block text-2xl font-black text-[#202124]">5</span><span className="mt-1 block text-xs font-semibold text-slate-600">{tx('Regional hubs', 'មជ្ឈមណ្ឌលតាមតំបន់')}</span></div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><span className="block text-2xl font-black text-[#202124]">1</span><span className="mt-1 block text-xs font-semibold text-slate-600">{tx('Connected network', 'ការចែកចាយក្នុងស្រុក')}</span></div>
                </div>
              </div>
              <div className="relative min-h-[320px] overflow-hidden bg-slate-100 sm:min-h-[400px] md:min-h-full">
                <img src={settings.distributionHeroImage || `${import.meta.env.BASE_URL}images/hero-warehouse-banner.jpg`} alt="VistaLab warehouse and distribution operations in Cambodia" className={`absolute inset-0 h-full w-full object-cover ${settings.distributionHeroAnimated ? 'hero-background-image' : ''}`} />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#267A3B]/30 via-transparent to-white/10" />
                <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3 rounded-2xl border border-white/40 bg-[#267A3B]/85 p-4 text-white shadow-lg backdrop-blur-sm sm:inset-x-6 sm:bottom-6"><div><span className="text-[10px] font-bold uppercase tracking-widest text-green-300">{tx('Nationwide reach', 'បណ្តាញទូទាំងប្រទេស')}</span><p className="mt-1 text-sm font-extrabold sm:text-base">{tx('From warehouse to retailer', 'ពីឃ្លាំងទៅកាន់អ្នកលក់រាយ')}</p></div><MapPin className="h-7 w-7 shrink-0 text-green-400" aria-hidden="true" /></div>
              </div>
            </section>
            {/* Supply Chain Flow Visualization */}
            <div className="bg-white p-5 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4 sm:space-y-6">
              <h2 className="text-xl font-bold text-slate-900">{tx('End-to-End FMCG Supply Chain Flow', 'ដំណើរការខ្សែសង្វាក់ផ្គត់ផ្គង់ផលិតផល FMCG')}</h2>
              <div className="relative grid grid-cols-2 gap-3 text-center md:grid-cols-3 lg:grid-cols-6">
                {[
                  { icon: Globe, step: tx("1. SUPPLIER", "១. អ្នកផ្គត់ផ្គង់"), detail: tx("Malaysia / Global Brands", "ម៉ាឡេស៊ី និងម៉ាកអន្តរជាតិ") },
                  { icon: ShieldCheck, step: tx("2. IMPORT", "២. ការនាំចូល"), detail: tx("Customs & Compliance", "គយ និងការអនុលោមតាមបទប្បញ្ញត្តិ") },
                  { icon: Building2, step: tx("3. WAREHOUSE", "៣. ឃ្លាំង"), detail: tx("Phnom Penh Central Hub", "មជ្ឈមណ្ឌលកណ្តាលនៅភ្នំពេញ") },
                  { icon: Users, step: tx("4. SALES TEAM", "៤. ក្រុមលក់"), detail: tx("Field & Telegram Communication", "ក្រុមការងារលក់ និងទំនាក់ទំនងតាម Telegram") },
                  { icon: Layers, step: tx("5. CHANNELS", "៥. បណ្តាញលក់"), detail: tx("Supermarkets & Wholesalers", "ផ្សារទំនើប និងអ្នកលក់ដុំ") },
                  { icon: Home, step: tx("6. CONSUMER", "៦. អ្នកប្រើប្រាស់"), detail: tx("Cambodian Households", "គ្រួសារនៅកម្ពុជា") }
                ].map((s, idx) => (
                  <div key={idx} className="group rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 shadow-sm transition-all hover:-translate-y-1 hover:border-green-300 hover:shadow-md flex flex-col items-center justify-center space-y-2">
                    <s.icon className="h-6 w-6 text-green-700 transition-transform duration-200 group-hover:scale-110" strokeWidth={1.8} aria-hidden="true" />
                    <span className="text-xs font-black text-[#202124]">{s.step}</span>
                    <span className="text-sm font-semibold leading-snug text-slate-800">{s.detail}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Distribution Channels Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {[
                { title: tx("Traditional & General Trade", "ពាណិជ្ជកម្មទូទៅ"), desc: tx("Direct distribution into local neighborhood grocery stores, mom-and-pop shops, and wet market vendors across Phnom Penh and provinces.", "ចែកចាយដោយផ្ទាល់ទៅកាន់ហាងលក់ទំនិញក្នុងសហគមន៍ តូបលក់រាយ និងអ្នកលក់នៅផ្សារទូទាំងភ្នំពេញ និងតាមខេត្ត។") },
                { title: tx("Modern Trade & Supermarkets", "ទីផ្សារទំនើប និងផ្សារទំនើប"), desc: tx("Supplying key modern retail outlets, mini-marts, and chain convenience stores with structured merchandising support.", "ផ្គត់ផ្គង់ទៅកាន់ហាងលក់រាយទំនើប មីនីម៉ាត និងហាងលក់ទំនិញជាបណ្តាញ ព្រមទាំងផ្តល់ការគាំទ្រផ្នែករៀបចំទំនិញ។") },
                { title: tx("Wholesale & Regional Agents", "លក់ដុំ និងភ្នាក់ងារតាមតំបន់"), desc: tx("Partnering with major provincial wholesalers in Siem Reap, Battambang, and Kampot to ensure deep market coverage.", "សហការជាមួយអ្នកលក់ដុំសំខាន់ៗនៅសៀមរាប បាត់ដំបង និងកំពត ដើម្បីពង្រីកការចែកចាយឱ្យបានទូលំទូលាយ។") }
              ].map((c, idx) => (
                <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <h3 className="text-lg font-bold text-slate-900">{c.title}</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {}
        {currentView === 'partner' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-8 py-7 sm:py-12 space-y-5 sm:space-y-8">
            <div className="text-center space-y-3">
              <span className="text-xs font-bold text-green-600 uppercase tracking-widest">{tx('FOR INTERNATIONAL SUPPLIERS', 'សម្រាប់អ្នកផ្គត់ផ្គង់អន្តរជាតិ')}</span>
              <h1 className="text-3xl sm:text-4xl font-black text-[#202124]">{tx('Partner With VistaLab Cambodia', 'សហការជាមួយ VistaLab Cambodia')}</h1>
              <p className="text-slate-600 text-sm">{tx('Expand your FMCG brands into the growing Cambodian consumer market with an established local partner.', 'ពង្រីកម៉ាកផលិតផល FMCG របស់អ្នកទៅកាន់ទីផ្សារកម្ពុជាដែលកំពុងរីកចម្រើន ដោយសហការជាមួយដៃគូក្នុងស្រុកដែលមានបទពិសោធន៍។')}</p>
            </div>

            <form onSubmit={handleInquirySubmit} className="bg-white p-5 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4 sm:space-y-6">
              <input type="hidden" name="type" value="Partner" />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{tx('Company / Brand Name *', 'ឈ្មោះក្រុមហ៊ុន / ម៉ាកផលិតផល *')}</label>
                  <input required name="business" type="text" placeholder={tx('e.g. Asia FMCG Corp', 'ឧ. ក្រុមហ៊ុន Asia FMCG')} className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-900" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{tx('Contact Person Name *', 'ឈ្មោះអ្នកទំនាក់ទំនង *')}</label>
                  <input required name="name" type="text" placeholder={tx('Full name', 'ឈ្មោះពេញ')} className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-900" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{tx('Country of Origin *', 'ប្រទេសដើម *')}</label>
                  <input required name="province" type="text" placeholder={tx('e.g. Malaysia, Thailand, Singapore', 'ឧ. ម៉ាឡេស៊ី ថៃ សិង្ហបុរី')} className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-900" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{tx('Phone Number / WhatsApp *', 'លេខទូរសព្ទ / WhatsApp *')}</label>
                  <input required name="phone" type="text" placeholder="+60 12 345 6789" aria-label={tx('Phone number', 'លេខទូរសព្ទ')} className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-900" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{tx('Telegram Handle / Email', 'គណនី Telegram / អ៊ីមែល')}</label>
                <input name="telegram" type="text" placeholder={tx('@handle or email', '@ឈ្មោះអ្នកប្រើ ឬអ៊ីមែល')} className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-900" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{tx('Partnership Proposal / Product Message', 'សំណើសហការ / ព័ត៌មានអំពីផលិតផល')}</label>
                <textarea required name="message" rows={4} placeholder={tx('Describe your product portfolio and potential distribution goals in Cambodia...', 'សូមពិពណ៌នាអំពីផលិតផល និងគោលដៅចែកចាយរបស់អ្នកនៅកម្ពុជា...')} className="w-full border border-slate-300 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-green-900" />
              </div>

              <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-2xl flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center space-x-2">
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span>{tx('Attach Brand Deck / Catalog (Optional Simulation)', 'ភ្ជាប់បទបង្ហាញម៉ាក / កាតាឡុក (មុខងារសាកល្បង)')}</span>
                </span>
                <span className="font-bold text-green-900 cursor-pointer">{tx('Browse File', 'ជ្រើសរើសឯកសារ')}</span>
              </div>

              <button
                type="submit"
                className="w-full bg-[#267A3B] hover:bg-[#246F38] text-white py-3.5 rounded-xl font-bold text-sm shadow-md transition-all"
              >
                {tx('Submit Partnership Inquiry', 'ផ្ញើសំណើសហការ')}
              </button>
            </form>
          </div>
        )}

        {}
        {currentView === 'seller' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-8 py-7 sm:py-12 space-y-5 sm:space-y-8">
            <div className="text-center space-y-3">
              <span className="text-xs font-bold text-green-600 uppercase tracking-widest">{tx('FOR LOCAL STORES & WHOLESALERS', 'សម្រាប់ហាងក្នុងស្រុក និងអ្នកលក់ដុំ')}</span>
              <h1 className="text-3xl sm:text-4xl font-black text-[#202124]">{t.becomeSeller}</h1>
              <p className="text-slate-600 text-sm">{tx('Register your retail shop or wholesale business to order imported consumer goods directly from VistaLab Cambodia.', 'ចុះឈ្មោះហាងលក់រាយ ឬអាជីវកម្មលក់ដុំរបស់អ្នក ដើម្បីបញ្ជាទិញផលិតផលនាំចូលដោយផ្ទាល់ពី VistaLab Cambodia។')}</p>
            </div>

            <form onSubmit={handleInquirySubmit} className="bg-white p-5 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4 sm:space-y-6">
              <input type="hidden" name="type" value="Seller" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{tx('Store / Business Name *', 'ឈ្មោះហាង / អាជីវកម្ម *')}</label>
                  <input required name="business" type="text" placeholder={tx('e.g. Sokha Mart', 'ឧ. ហាងសុខា')} className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-900" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{tx('Contact Name *', 'ឈ្មោះអ្នកទំនាក់ទំនង *')}</label>
                  <input required name="name" type="text" placeholder={tx('Your name', 'ឈ្មោះរបស់អ្នក')} className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-900" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{tx('Phone Number *', 'លេខទូរសព្ទ *')}</label>
                  <input required name="phone" type="text" placeholder="+855 12 345 678" aria-label={tx('Phone number', 'លេខទូរសព្ទ')} className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-900" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{tx('Telegram Username', 'ឈ្មោះអ្នកប្រើ Telegram')}</label>
                  <input name="telegram" type="text" placeholder={tx('@username', '@ឈ្មោះអ្នកប្រើ')} className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-900" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{tx('Province / City *', 'ខេត្ត / ក្រុង *')}</label>
                <select required name="province" defaultValue="Phnom Penh" className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-900 bg-white">
                  {cambodianProvinces.map((province) => <option key={province.name} value={province.name}>{lang === 'KH' ? province.nameKh : province.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{tx('Products Interested In *', 'ផលិតផលដែលចាប់អារម្មណ៍ *')}</label>
                <textarea required name="message" rows={3} placeholder={tx("e.g. L'affair shower cream, Be Love baby wipes, BIKA snacks...", 'ឧ. ក្រែមងូតទឹក L’affair កន្សែងសើម Be Love ឬនំ BIKA...')} className="w-full border border-slate-300 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-green-900" />
              </div>

              <button
                type="submit"
                className="w-full bg-green-500 hover:bg-green-600 text-slate-950 py-3.5 rounded-xl font-extrabold text-sm shadow-md transition-all"
              >
                {tx('Apply to Become an Official Seller', 'ដាក់ពាក្យចុះឈ្មោះជាអ្នកលក់ផ្លូវការ')}
              </button>
            </form>
          </div>
        )}

        {}
        {currentView === 'news' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-7 sm:py-12 space-y-5 sm:space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-bold text-green-600 uppercase tracking-widest">{tx('MEDIA & UPDATES', 'ព័ត៌មាន និងបច្ចុប្បន្នភាព')}</span>
              <h1 className="text-3xl font-black text-[#202124]">{t.navNews}</h1>
              <p className="text-slate-600 text-sm">{tx('Stay informed with company announcements, brand launches, and FMCG developments.', 'ទទួលបានព័ត៌មានអំពីសេចក្តីប្រកាសរបស់ក្រុមហ៊ុន ការដាក់បង្ហាញម៉ាកថ្មី និងការវិវត្តក្នុងវិស័យ FMCG។')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {news.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between">
                  <div className={`relative h-32 sm:h-40 ${item.imageBg} text-white p-6 flex flex-col justify-between overflow-hidden`}>
                    {item.image && <img src={item.image} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                    {item.image && <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/20" />}
                    <span className="relative z-10 text-[10px] font-bold uppercase bg-green-500 text-slate-950 px-2 py-0.5 rounded w-max">
                      {tx(item.category, item.category === 'Company' ? 'ក្រុមហ៊ុន' : item.category === 'Products' ? 'ផលិតផល' : item.category === 'Events' ? 'ព្រឹត្តិការណ៍' : item.category)}
                    </span>
                    <span className="relative z-10 text-xs opacity-90">{item.date}</span>
                  </div>
                  <div className="p-6 space-y-3 flex-grow flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 line-clamp-2">
                        {localizedArticleTitle(item)}
                      </h3>
                      <p className="text-xs text-slate-600 mt-2 line-clamp-3">
                        {localizedArticleExcerpt(item)}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedArticle(item)}
                      className="text-xs font-bold text-green-900 hover:text-green-600 flex items-center space-x-1 pt-2"
                    >
                      <span>{tx('Read Full Article', 'អានអត្ថបទពេញ')}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {}
        {currentView === 'contact' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-7 sm:py-12 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h1 className="text-3xl sm:text-4xl font-black text-[#202124]">{t.navContact}</h1>
              <p className="text-slate-600 text-sm">{tx('Get in touch with our sales, logistics, or commercial partnership teams.', 'ទាក់ទងក្រុមការងារផ្នែកលក់ ភស្តុភារ ឬកិច្ចសហការអាជីវកម្មរបស់យើង។')}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8">
              {/* Contact Information Panel */}
              <div className="site-contact-friendly lg:col-span-5 bg-green-50 text-slate-800 p-5 sm:p-8 rounded-3xl space-y-4 sm:space-y-6 shadow-xl border border-green-100">
                <h3 className="text-xl font-bold text-green-400">{tx('Official Contact Details', 'ព័ត៌មានទំនាក់ទំនងផ្លូវការ')}</h3>
                
                <div className="space-y-4 text-sm">
                  <div className="flex items-start space-x-3">
                    <Phone className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white">{tx('Phone Hotlines:', 'លេខទូរសព្ទទំនាក់ទំនង៖')}</p>
                      <p className="text-slate-300">{settings.phone1}</p>
                      <p className="text-slate-300">{settings.phone2}</p>
                      <p className="text-slate-300">{settings.phone3}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Mail className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white">{tx('Email Inquiry:', 'អ៊ីមែល៖')}</p>
                      <p className="text-slate-300">{settings.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <MessageCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white">{tx('Telegram Channel:', 'គណនី Telegram៖')}</p>
                      <p className="text-slate-300">{settings.telegram}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <span aria-hidden="true" className="w-5 h-5 flex-shrink-0 text-center text-lg font-black leading-5 text-green-400">f</span>
                    <div>
                      <p className="font-bold text-white">Facebook៖</p>
                      <a href={settings.facebook} target="_blank" rel="noreferrer" className="text-slate-300 underline underline-offset-2 hover:text-white">
                        facebook.com/vistalab
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <MapPin className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white">{tx('Location HQ:', 'ទីតាំងការិយាល័យកណ្តាល៖')}</p>
                      <p className="text-slate-300">{lang === 'KH' ? settings.address_kh : settings.address_en}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 text-xs text-slate-400">
                  {tx('Business Hours:', 'ម៉ោងធ្វើការ៖')} {lang === 'KH' ? settings.business_hours_kh : settings.business_hours}
                </div>
              </div>

              {/* Direct Message Form */}
              <div className="lg:col-span-7 bg-white p-5 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
                <form onSubmit={handleInquirySubmit} className="space-y-4">
                  <input type="hidden" name="type" value="General Contact" />
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">{tx('Your Name *', 'ឈ្មោះរបស់អ្នក *')}</label>
                    <input required name="name" type="text" className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-900" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{tx('Phone Number *', 'លេខទូរសព្ទ *')}</label>
                      <input required name="phone" type="text" className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-900" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{tx('Telegram Handle', 'ឈ្មោះអ្នកប្រើ Telegram')}</label>
                      <input name="telegram" type="text" className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-900" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">{tx('Message / Inquiry *', 'សារ / សំណួរ *')}</label>
                    <textarea required name="message" rows={4} className="w-full border border-slate-300 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-green-900" />
                  </div>
                  <button type="submit" className="w-full bg-[#267A3B] hover:bg-[#246F38] text-white py-3 rounded-xl font-bold text-sm shadow">
                    {tx('Send Direct Message', 'ផ្ញើសារ')}
                  </button>
                </form>
              </div>
            </div>

            <section aria-labelledby="contact-location-title" className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div>
                  <h2 id="contact-location-title" className="text-xl font-extrabold text-slate-900">{tx('Find our Phnom Penh office', 'ស្វែងរកការិយាល័យរបស់យើងនៅភ្នំពេញ')}</h2>
                  <p className="mt-1 text-sm text-slate-600">{lang === 'KH' ? settings.address_kh : settings.address_en}</p>
                </div>
                <a href="https://maps.app.goo.gl/EZhK6Qpwd4o3U5oT8" target="_blank" rel="noreferrer" className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-green-800">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  {tx('Open in Google Maps', 'បើកក្នុង Google Maps')}
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
              <div className="h-64 border-t border-slate-200 bg-slate-100 sm:h-96">
                <iframe
                  title={tx('Map to VistaLab Cambodia in Phnom Penh', 'ផែនទីទៅកាន់ VistaLab Cambodia នៅភ្នំពេញ')}
                  src="https://maps.google.com/maps?q=11.5768898%2C104.8669478&z=16&output=embed"
                  className="h-full w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
            </section>
          </div>
        )}

        {}
        {currentView === 'admin' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 space-y-5 sm:space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#267A3B] text-white p-6 rounded-3xl shadow-lg">
              <div>
                <span className="text-xs text-white font-extrabold uppercase tracking-widest">{tx('Internal Control Panel', 'ផ្ទាំងគ្រប់គ្រងផ្ទៃក្នុង')}</span>
                <h1 className="flex items-center gap-3 text-2xl font-black"><Settings className="h-5 w-5 shrink-0 text-green-500" aria-hidden="true" />{tx('VistaLab Website Content Manager (CMS)', 'ប្រព័ន្ធគ្រប់គ្រងមាតិកាគេហទំព័រ VistaLab')}</h1>
              </div>
              <div className="flex items-center space-x-2">
                <button onClick={() => void handleAdminLogout()} className="rounded-xl border border-white/30 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10">Sign out</button>
                <button
                  onClick={() => triggerToast(Boolean(supabaseClient) ? tx('Website content syncs to Supabase automatically.', 'មាតិកាគេហទំព័រធ្វើសមកាលកម្មទៅ Supabase ដោយស្វ័យប្រវត្តិ។') : tx('Website content is saved in this browser.', 'មាតិកាគេហទំព័រត្រូវបានរក្សាទុកក្នុងកម្មវិធីរុករកនេះ។'))}
                  className="bg-green-500 text-slate-950 hover:bg-green-600 px-4 py-2 rounded-xl text-xs font-extrabold shadow"
                >
                  {tx('Save Settings', 'រក្សាទុកការកំណត់')}
                </button>
              </div>
            </div>

            {supabaseClient && <div className={`rounded-2xl border p-4 text-sm ${siteContentError ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-green-200 bg-green-50 text-green-950'}`}>
              {siteContentError ? <>
                <p className="font-bold">{tx('Shared site images need setup or a connection check.', 'ត្រូវរៀបចំរូបភាពគេហទំព័ររួម ឬពិនិត្យការតភ្ជាប់។')}</p>
                <p className="mt-1">{tx('Run supabase/site_content_storage_setup.sql in the Supabase SQL Editor, then retry. Details:', 'សូមដំណើរការ supabase/site_content_storage_setup.sql ក្នុង Supabase SQL Editor រួចសាកល្បងម្ដងទៀត។ ព័ត៌មានលម្អិត៖')} {siteContentError}</p>
                <button type="button" onClick={() => setSiteContentRetry((attempt) => attempt + 1)} className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm">{tx('Retry connection', 'ព្យាយាមតភ្ជាប់ម្ដងទៀត')}</button>
              </> : <p>{!siteContentLoaded ? tx('Loading shared website content…', 'កំពុងផ្ទុកមាតិកាគេហទំព័ររួម…') : siteContentSyncing ? tx('Saving website text and images to Supabase…', 'កំពុងរក្សាទុកអត្ថបទ និងរូបភាពគេហទំព័រទៅ Supabase…') : tx('Website images and editable content are connected to Supabase.', 'រូបភាព និងមាតិកាដែលអាចកែប្រែបានបានភ្ជាប់ទៅ Supabase។')}</p>}
            </div>}

            <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
              <nav aria-label="Admin pages" className="h-fit rounded-3xl border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-5">
                <p className="px-3 pb-2 pt-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">{tx('Website pages', 'ទំព័រគេហទំព័រ')}</p>
                {[
                  { id: 'overview', label: tx('Overview', 'ទិដ្ឋភាពទូទៅ'), detail: tx('Site summary', 'សេចក្តីសង្ខេប') },
                  { id: 'contact', label: tx('Contact', 'ទំនាក់ទំនង'), detail: tx('Phones and address', 'ទូរស័ព្ទ និងអាសយដ្ឋាន') },
                  { id: 'home', label: tx('Homepage poster', 'ផ្ទាំងទំព័រដើម'), detail: tx('Hero image and text', 'រូបភាព និងអត្ថបទ') },
                  { id: 'about', label: tx('About & distribution', 'អំពីយើង និងការចែកចាយ'), detail: tx('Page banners and text', 'បដា និងអត្ថបទ') },
                  { id: 'brands', label: tx('Brands', 'ម៉ាកផលិតផល'), detail: `${brands.length} ${tx('brands', 'ម៉ាក')}` },
                  { id: 'news', label: tx('News', 'ព័ត៌មាន'), detail: `${news.length} ${tx('articles', 'អត្ថបទ')}` },
                  { id: 'inquiries', label: tx('Inquiries', 'សំណួរ'), detail: `${inquiries.filter((item) => item.status === 'New').length} ${tx('new', 'ថ្មី')}` },
                  { id: 'analytics', label: tx('Traffic analytics', 'ស្ថិតិអ្នកចូលមើល'), detail: tx('Visits and product views', 'ការចូលមើល និងផលិតផល') },
                  { id: 'storage', label: tx('Data & storage', 'ទិន្នន័យ និងឃ្លាំងផ្ទុក'), detail: tx('Health and uploaded images', 'សុខភាពទិន្នន័យ និងរូបភាព') },
                  { id: 'products', label: tx('Products', 'ផលិតផល'), detail: `${products.length} ${tx('products', 'ផលិតផល')}` },
                  { id: 'catalogs', label: 'Catalog Studio', detail: tx('Catalog pages and price lists', 'ទំព័រកាតាឡុក និងបញ្ជីតម្លៃ') },
                ].map((item) => (
                  <button key={item.id} type="button" onClick={() => {
                    if (item.id === 'catalogs') {
                      const url = new URL(window.location.href);
                      url.search = '?admin=1&tool=catalog-studio';
                      window.open(url.toString(), '_blank', 'noopener,noreferrer');
                    } else setActiveAdminSection(item.id);
                  }} aria-current={activeAdminSection === item.id ? 'page' : undefined}
                    className={`mb-1 flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-3 text-left transition ${activeAdminSection === item.id ? 'bg-green-700 text-white shadow-sm' : 'text-slate-700 hover:bg-green-50'}`}>
                    <span className="flex min-w-0 items-start gap-2.5">{React.createElement(adminSectionIcons[item.id as keyof typeof adminSectionIcons], { className: `mt-0.5 h-4 w-4 shrink-0 ${activeAdminSection === item.id ? 'text-green-100' : 'text-green-700'}`, 'aria-hidden': true })}<span className="min-w-0"><span className="block text-sm font-bold">{item.label}</span><span className={`mt-0.5 block text-[11px] ${activeAdminSection === item.id ? 'text-green-100' : 'text-slate-500'}`}>{item.detail}</span></span></span>
                    <span aria-hidden="true" className="text-lg leading-none">›</span>
                  </button>
                ))}
              </nav>
              <div className="min-w-0 space-y-5 sm:space-y-8">
            {activeAdminSection === 'overview' && <>
            {/* CMS Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase"><Package className="h-4 w-4 shrink-0 text-green-500" aria-hidden="true" /><span>{tx('Total Products', 'ផលិតផលសរុប')}</span></div>
                <p className="text-2xl font-black text-[#202124] mt-1">{products.length}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase"><Tags className="h-4 w-4 shrink-0 text-green-500" aria-hidden="true" /><span>{tx('Brands Listed', 'ម៉ាកផលិតផល')}</span></div>
                <p className="text-2xl font-black text-green-600 mt-1">{brands.length}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase"><MessageCircle className="h-4 w-4 shrink-0 text-green-500" aria-hidden="true" /><span>{tx('Pending Inquiries', 'សំណួរដែលមិនទាន់ឆ្លើយតប')}</span></div>
                <p className="text-2xl font-black text-green-900 mt-1">{inquiries.filter(i=>i.status==='New').length}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase"><Newspaper className="h-4 w-4 shrink-0 text-green-500" aria-hidden="true" /><span>{tx('News Articles', 'អត្ថបទព័ត៌មាន')}</span></div>
                <p className="text-2xl font-black text-green-600 mt-1">{news.length}</p>
              </div>
            </div>

            <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-xs text-green-900">
              {tx('Admin sign-in is verified by Supabase. CMS edits are still saved only in this browser and do not update the live site for other visitors.', 'ការចូលគណនីអ្នកគ្រប់គ្រងត្រូវបានផ្ទៀងផ្ទាត់ដោយ Supabase។ ការកែប្រែមាតិកានៅតែរក្សាទុកតែក្នុងកម្មវិធីរុករកនេះ ហើយមិនធ្វើបច្ចុប្បន្នភាពគេហទំព័រសម្រាប់អ្នកទស្សនាផ្សេងទៀតទេ។')}
            </p>

            </>}
            {activeAdminSection === 'contact' && <>
            <form onSubmit={(event) => { event.preventDefault(); triggerToast(tx('Contact details saved.', 'បានរក្សាទុកព័ត៌មានទំនាក់ទំនង។')); }} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-extrabold text-[#202124]"><Phone className="h-5 w-5 shrink-0 text-green-500" aria-hidden="true" />{tx('Edit Contact Page Information', 'កែសម្រួលព័ត៌មានទំនាក់ទំនង')}</h2>
                <p className="text-xs text-slate-500">{tx('These details are shown on the Contact page, site header, and footer.', 'ព័ត៌មានទាំងនេះបង្ហាញនៅលើទំព័រទំនាក់ទំនង ក្បាលទំព័រ និងបាតទំព័រ។')}</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(['phone1', 'phone2', 'phone3'] as const).map((key, index) => <label key={key} className="text-xs font-bold text-slate-700">{tx(`Phone hotline ${index + 1}`, `លេខទូរសព្ទ ${index + 1}`)}<input value={settings[key]} onChange={(event) => setSettings({ ...settings, [key]: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-normal" /></label>)}
                <label className="text-xs font-bold text-slate-700">{tx('Email', 'អ៊ីមែល')}<input type="email" value={settings.email} onChange={(event) => setSettings({ ...settings, email: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-normal" /></label>
                <label className="text-xs font-bold text-slate-700">{tx('Telegram handle', 'ឈ្មោះអ្នកប្រើ Telegram')}<input value={settings.telegram} onChange={(event) => setSettings({ ...settings, telegram: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-normal" /></label>
                <label className="text-xs font-bold text-slate-700">{tx('Facebook URL', 'តំណ Facebook')}<input type="url" value={settings.facebook} onChange={(event) => setSettings({ ...settings, facebook: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-normal" /></label>
                <label className="text-xs font-bold text-slate-700 sm:col-span-2">{tx('Address (English)', 'អាសយដ្ឋាន (អង់គ្លេស)')}<input value={settings.address_en} onChange={(event) => setSettings({ ...settings, address_en: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-normal" /></label>
                <label className="text-xs font-bold text-slate-700 sm:col-span-2">{tx('Address (Khmer)', 'អាសយដ្ឋាន (ខ្មែរ)')}<input value={settings.address_kh} onChange={(event) => setSettings({ ...settings, address_kh: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-normal" /></label>
                <label className="text-xs font-bold text-slate-700 sm:col-span-2 lg:col-span-3">{tx('Business hours', 'ម៉ោងធ្វើការ')}<input value={settings.business_hours} onChange={(event) => setSettings({ ...settings, business_hours: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-normal" /></label>
                <label className="text-xs font-bold text-slate-700 sm:col-span-2 lg:col-span-3">{tx('Business hours (Khmer)', 'ម៉ោងធ្វើការ (ខ្មែរ)')}<input value={settings.business_hours_kh} onChange={(event) => setSettings({ ...settings, business_hours_kh: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-normal" /></label>
              </div>
              <button type="submit" className="rounded-xl bg-green-500 px-4 py-2.5 text-xs font-extrabold text-slate-950">{tx('Save Contact Information', 'រក្សាទុកព័ត៌មានទំនាក់ទំនង')}</button>
            </form>

            </>}
            {activeAdminSection === 'home' && <>
            <section className="rounded-3xl border border-green-200 bg-white p-5 shadow-sm space-y-4 sm:p-6">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900"><Edit className="h-5 w-5 shrink-0 text-green-700" aria-hidden="true" />{tx('Edit Homepage Poster', 'កែសម្រួលផ្ទាំងរូបភាពទំព័រដើម')}</h2>
                <p className="text-xs text-slate-600">{tx('Change the poster image, headline, subtitle, and description shown on the first screen.', 'កែប្រែរូបភាព ចំណងជើង ចំណងជើងរង និងសេចក្តីពិពណ៌នានៅលើទំព័រដើម។')}</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-700">{tx('Poster headline (English)', 'ចំណងជើងផ្ទាំងរូបភាព (អង់គ្លេស)')}<input value={settings.heroTitle_en} onChange={(event) => setSettings({ ...settings, heroTitle_en: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-sm font-normal" /></label>
                <label className="text-xs font-bold text-slate-700">{tx('Poster headline (Khmer)', 'ចំណងជើងផ្ទាំងរូបភាព (ខ្មែរ)')}<input value={settings.heroTitle_kh} onChange={(event) => setSettings({ ...settings, heroTitle_kh: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-sm font-normal" /></label>
                <label className="text-xs font-bold text-slate-700">{tx('Poster subtitle (English)', 'ចំណងជើងរង (អង់គ្លេស)')}<input value={settings.heroSubtitle_en} onChange={(event) => setSettings({ ...settings, heroSubtitle_en: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-sm font-normal" /></label>
                <label className="text-xs font-bold text-slate-700">{tx('Poster subtitle (Khmer)', 'ចំណងជើងរង (ខ្មែរ)')}<input value={settings.heroSubtitle_kh} onChange={(event) => setSettings({ ...settings, heroSubtitle_kh: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-sm font-normal" /></label>
                <label className="text-xs font-bold text-slate-700">{tx('Poster description (English)', 'សេចក្តីពិពណ៌នាផ្ទាំងរូបភាព (អង់គ្លេស)')}<textarea rows={3} value={settings.heroDescription_en} onChange={(event) => setSettings({ ...settings, heroDescription_en: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-sm font-normal" /></label>
                <label className="text-xs font-bold text-slate-700">{tx('Poster description (Khmer)', 'សេចក្តីពិពណ៌នាផ្ទាំងរូបភាព (ខ្មែរ)')}<textarea rows={3} value={settings.heroDescription_kh} onChange={(event) => setSettings({ ...settings, heroDescription_kh: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-sm font-normal" /></label>
                <label className="text-xs font-bold text-slate-700">{tx('Trusted brands badge', 'ចំនួនម៉ាកដែលទុកចិត្ត')}<input value={settings.heroTrustedBrands} onChange={(event) => setSettings({ ...settings, heroTrustedBrands: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-sm font-normal" /></label>
                <ImageUpload label={tx('Homepage poster image', 'រូបភាពផ្ទាំងទំព័រដើម')} lang={lang} image={settings.heroImage} onChange={(heroImage) => setSettings({ ...settings, heroImage })} highQuality />
              </div>
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><h3 className="text-sm font-extrabold text-slate-800">{tx('Homepage poster slider', 'ស្លាយផ្ទាំងរូបភាពទំព័រដើម')}</h3><p className="text-xs text-slate-500">{tx('Add posters for the rotating banner below the main hero. They rotate every few seconds.', 'បន្ថែមផ្ទាំងរូបភាពសម្រាប់បដាបង្វិលខាងក្រោមផ្នែកដើម។')}</p></div>
                  <button type="button" onClick={() => setSettings({ ...settings, heroSlides: [...(Array.isArray(settings.heroSlides) ? settings.heroSlides : []), ''] })} className="inline-flex items-center gap-1.5 rounded-lg bg-green-700 px-3 py-2 text-xs font-bold text-white hover:bg-green-800"><Plus className="h-4 w-4" />{tx('Add poster slide', 'បន្ថែមស្លាយ')}</button>
                </div>
                {(Array.isArray(settings.heroSlides) ? settings.heroSlides : []).map((image: string, index: number) => <div key={index} className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1"><ImageUpload label={`${tx('Poster slide', 'ស្លាយផ្ទាំងរូបភាព')} ${index + 1}`} lang={lang} image={image} onChange={(nextImage) => setSettings({ ...settings, heroSlides: (settings.heroSlides as string[]).map((slide, slideIndex) => slideIndex === index ? nextImage : slide) })} highQuality /></div>
                  <button type="button" onClick={() => { const nextSlides = (settings.heroSlides as string[]).filter((_, slideIndex) => slideIndex !== index); setSettings({ ...settings, heroSlides: nextSlides }); setPosterSlideIndex((current) => Math.min(current, Math.max(0, nextSlides.length - 1))); }} aria-label={`${tx('Remove poster slide', 'លុបស្លាយ')} ${index + 1}`} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" />{tx('Remove', 'លុប')}</button>
                </div>)}
                {posterSlides.length === 0 && <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">{tx('No slider posters yet. Add one to show the poster slider on the homepage.', 'មិនទាន់មានផ្ទាំងរូបភាពស្លាយទេ។ សូមបន្ថែម ដើម្បីបង្ហាញស្លាយនៅទំព័រដើម។')}</p>}
              </div>
              <p className="text-xs text-slate-500">{tx('Changes save in this browser automatically.', 'ការកែប្រែត្រូវបានរក្សាទុកក្នុងកម្មវិធីរុករកនេះដោយស្វ័យប្រវត្តិ។')}</p>
            </section>
            </>}
            {activeAdminSection === 'about' && <>
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 sm:p-6">
              <div><h2 className="flex items-center gap-2 text-lg font-extrabold text-[#202124]"><Building2 className="h-5 w-5 shrink-0 text-green-500" aria-hidden="true" />{tx('Edit About Page Header', 'កែសម្រួលក្បាលទំព័រអំពីយើង')}</h2><p className="text-xs text-slate-500">{tx('Upload a banner image, choose its motion, and edit the About page heading and description in both languages.', 'បញ្ចូលរូបភាពបដា កំណត់ចលនា និងកែសម្រួលចំណងជើង ព្រមទាំងសេចក្តីពិពណ៌នាជាភាសាអង់គ្លេស និងខ្មែរ។')}</p></div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-700">{tx('Heading (English)', 'ចំណងជើង (អង់គ្លេស)')}<input value={settings.aboutTitle_en} onChange={(event) => setSettings({ ...settings, aboutTitle_en: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-normal" /></label>
                <label className="text-xs font-bold text-slate-700">{tx('Heading (Khmer)', 'ចំណងជើង (ខ្មែរ)')}<input value={settings.aboutTitle_kh} onChange={(event) => setSettings({ ...settings, aboutTitle_kh: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-normal" /></label>
                <label className="text-xs font-bold text-slate-700">{tx('Description (English)', 'សេចក្តីពិពណ៌នា (អង់គ្លេស)')}<textarea rows={3} value={settings.aboutDescription_en} onChange={(event) => setSettings({ ...settings, aboutDescription_en: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-normal" /></label>
                <label className="text-xs font-bold text-slate-700">{tx('Description (Khmer)', 'សេចក្តីពិពណ៌នា (ខ្មែរ)')}<textarea rows={3} value={settings.aboutDescription_kh} onChange={(event) => setSettings({ ...settings, aboutDescription_kh: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-normal" /></label>
                <ImageUpload label={tx('About page banner image', 'រូបភាពបដាទំព័រអំពីយើង')} lang={lang} image={settings.aboutHeroImage} onChange={(aboutHeroImage) => setSettings({ ...settings, aboutHeroImage })} />
                <ImageUpload label={tx('Distribution page banner image', 'រូបភាពបដាទំព័រចែកចាយ')} lang={lang} image={settings.distributionHeroImage} onChange={(distributionHeroImage) => setSettings({ ...settings, distributionHeroImage })} />
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-xs font-bold text-slate-700 sm:col-span-2"><input type="checkbox" checked={settings.distributionHeroAnimated} onChange={(event) => setSettings({ ...settings, distributionHeroAnimated: event.target.checked })} className="h-4 w-4 accent-green-500" />{tx('Animate the Distribution banner', 'បើកចលនាសម្រាប់បដាចែកចាយ')}</label>
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-xs font-bold text-slate-700 sm:col-span-2"><input type="checkbox" checked={settings.aboutHeroAnimated} onChange={(event) => setSettings({ ...settings, aboutHeroAnimated: event.target.checked })} className="h-4 w-4 accent-green-500" />{tx('Animate the banner image', 'បើកចលនាសម្រាប់រូបភាពបដា')}</label>
              </div>
            </section>
            </>}
            {activeAdminSection === 'brands' && <>
            {/* Brand editor */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-extrabold text-[#202124]"><Tags className="h-5 w-5 shrink-0 text-green-500" aria-hidden="true" />{tx('Manage Brands', 'គ្រប់គ្រងម៉ាកផលិតផល')}</h2>
                  <p className="text-xs text-slate-500">{tx('Edit brand text and upload a logo or brand image.', 'កែសម្រួលព័ត៌មានម៉ាក និងបញ្ចូលរូបសញ្ញា ឬរូបភាពម៉ាក។')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingBrand({ id: `b-${Date.now()}`, name: '', category: 'Personal Care', origin: 'Malaysia', description: '', description_kh: '', featured: false, logoText: '', image: '', flagImage: '', website: '' })}
                  className="rounded-xl bg-[#267A3B] px-4 py-2 text-xs font-bold text-white"
                >
                  {tx('+ Add Brand', '+ បន្ថែមម៉ាកផលិតផល')}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {brands.map((brand) => (
                  <div key={brand.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 p-3">
                    <div className="flex h-11 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-white p-1">
                      {brand.image ? <img src={brand.image} alt="" className="max-h-full max-w-full object-contain" /> : <span className="text-xs font-black text-[#267A3B]">{brand.logoText.slice(0, 3)}</span>}
                    </div>
                    <span className="line-clamp-2 min-w-0 flex-1 whitespace-normal text-sm font-bold leading-tight text-slate-800">{brand.name}</span>
                    <button type="button" onClick={() => setEditingBrand({ ...brand, website: brand.website || getDefaultBrandWebsite(brand.name) })} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-200">{tx('Edit', 'កែសម្រួល')}</button>
                  </div>
                ))}
              </div>

              {editingBrand && (
                <form
                  onSubmit={async (event) => {
                    event.preventDefault();
                    if (brandSaving) return;
                    const savedBrand = { ...editingBrand, logoText: editingBrand.logoText || editingBrand.name.toUpperCase() };
                    const previousBrand = brands.find((brand) => brand.id === savedBrand.id);
                    const nextBrands = brands.some((brand) => brand.id === savedBrand.id)
                      ? brands.map((brand) => brand.id === savedBrand.id ? savedBrand : brand)
                      : [savedBrand, ...brands];
                    if (previousBrand && previousBrand.name !== savedBrand.name) {
                      setProducts((current) => current.map((product) => product.brand === previousBrand.name ? { ...product, brand: savedBrand.name } : product));
                    }
                    if (!supabaseClient) {
                      setBrands(nextBrands);
                      setEditingBrand(null);
                      triggerToast('Brand saved in this browser.');
                      return;
                    }
                    setBrandSaving(true);
                    setSiteContentSyncing(true);
                    setSiteContentError('');
                    try {
                      const saved = await saveSiteContent(nextBrands, news, settings);
                      siteContentBaseline.current = JSON.stringify(saved);
                      setBrands(saved.brands);
                      setNews(saved.news);
                      setSettings(saved.settings);
                      setEditingBrand(null);
                      setSiteContentError('');
                      triggerToast('Brand and logo saved to Supabase.');
                    } catch (error) {
                      const message = error instanceof Error ? error.message : 'Could not save this brand to Supabase.';
                      setSiteContentError(message);
                      triggerToast('Brand save failed: ' + message);
                    } finally {
                      setBrandSaving(false);
                      setSiteContentSyncing(false);
                    }
                  }}
                  className="grid grid-cols-1 gap-3 rounded-2xl border border-green-200 bg-green-50/50 p-4 sm:grid-cols-2"
                >
                  <h3 className="text-sm font-extrabold text-[#202124] sm:col-span-2">{tx('Brand details', 'ព័ត៌មានលម្អិតអំពីម៉ាក')}</h3>
                  <input required aria-label="Brand name" placeholder={tx('Brand name', 'ឈ្មោះម៉ាក')} value={editingBrand.name} onChange={(event) => setEditingBrand({ ...editingBrand, name: event.target.value })} className="rounded-xl border border-slate-300 p-2.5 text-xs" />
                  <input aria-label="Logo text" placeholder={tx('Logo text', 'អក្សរលើរូបសញ្ញា')} value={editingBrand.logoText} onChange={(event) => setEditingBrand({ ...editingBrand, logoText: event.target.value })} className="rounded-xl border border-slate-300 p-2.5 text-xs" />
                  <input aria-label="Category" placeholder={tx('Category', 'ប្រភេទ')} value={editingBrand.category} onChange={(event) => setEditingBrand({ ...editingBrand, category: event.target.value })} className="rounded-xl border border-slate-300 p-2.5 text-xs" />
                  <input aria-label="Country of origin" placeholder={tx('Country of origin', 'ប្រទេសដើម')} value={editingBrand.origin} onChange={(event) => setEditingBrand({ ...editingBrand, origin: event.target.value })} className="rounded-xl border border-slate-300 p-2.5 text-xs" />
                  <input type="url" aria-label="Official brand website" placeholder="https://example.com" value={editingBrand.website || ''} onChange={(event) => setEditingBrand({ ...editingBrand, website: event.target.value })} className="rounded-xl border border-slate-300 p-2.5 text-xs" />
                  <textarea aria-label="Brand description" placeholder={tx('Brand description', 'ការពិពណ៌នាអំពីម៉ាក')} rows={3} value={editingBrand.description} onChange={(event) => setEditingBrand({ ...editingBrand, description: event.target.value })} className="rounded-xl border border-slate-300 p-2.5 text-xs sm:col-span-2" />
                  <textarea aria-label="Brand description in Khmer" placeholder={tx('Brand description (Khmer)', 'ការពិពណ៌នាអំពីម៉ាក (ខ្មែរ)')} rows={3} value={editingBrand.description_kh || ''} onChange={(event) => setEditingBrand({ ...editingBrand, description_kh: event.target.value })} className="rounded-xl border border-slate-300 p-2.5 text-xs sm:col-span-2" />
                  <ImageUpload label={tx('Brand picture or logo', 'រូបភាពម៉ាក ឬរូបសញ្ញា')} lang={lang} image={editingBrand.image} onChange={async (image) => {
                    const updatedBrand = { ...editingBrand, image };
                    setEditingBrand(updatedBrand);
                    if (!supabaseClient) return;
                    setBrandSaving(true);
                    setSiteContentSyncing(true);
                    setSiteContentError('');
                    try {
                      const nextBrands = brands.map((brand) => brand.id === updatedBrand.id ? updatedBrand : brand);
                      const saved = await saveSiteContent(nextBrands, news, settings);
                      siteContentBaseline.current = JSON.stringify(saved);
                      setBrands(saved.brands);
                      setNews(saved.news);
                      setSettings(saved.settings);
                      const persistedBrand = saved.brands.find((brand) => brand.id === updatedBrand.id);
                      if (persistedBrand) setEditingBrand(persistedBrand);
                      triggerToast('Logo crop saved to Supabase.');
                    } catch (error) {
                      const message = error instanceof Error ? error.message : 'Could not save the logo crop to Supabase.';
                      setSiteContentError(message);
                      throw new Error(message);
                    } finally {
                      setBrandSaving(false);
                      setSiteContentSyncing(false);
                    }
                  }} crop />
                  <p className="-mt-2 text-xs text-slate-500 sm:col-span-2">Saving the crop uploads the logo to Supabase immediately. Use <strong>Save Brand</strong> for any other edits.</p>
                  <ImageUpload label={tx('Country flag picture (optional)', 'រូបទង់ជាតិ (ស្រេចចិត្ត)')} lang={lang} image={editingBrand.flagImage} onChange={(flagImage) => setEditingBrand({ ...editingBrand, flagImage })} />
                  <div className="flex gap-2 sm:col-span-2">
                    <button type="submit" disabled={brandSaving} className="rounded-xl bg-green-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 disabled:cursor-wait disabled:opacity-60">{brandSaving ? 'Saving image...' : 'Save Brand'}</button>
                    <button type="button" onClick={() => setEditingBrand(null)} className="rounded-xl bg-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700">{tx('Cancel', 'បោះបង់')}</button>
                  </div>
                </form>
              )}
            </div>

            </>}
            {activeAdminSection === 'news' && <>
            {/* News article editor */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-extrabold text-[#202124]"><Newspaper className="h-5 w-5 shrink-0 text-green-500" aria-hidden="true" />{tx('Manage News', 'គ្រប់គ្រងព័ត៌មាន')}</h2>
                  <p className="text-xs text-slate-500">{tx('Add articles or edit the English and Khmer text, date, category, and cover image.', 'បន្ថែម ឬកែសម្រួលអត្ថបទជាភាសាអង់គ្លេស និងខ្មែរ កាលបរិច្ឆេទ ប្រភេទ និងរូបភាពគម្រប។')}</p>
                </div>
                <button type="button" onClick={() => setEditingNews({ id: `n-${Date.now()}`, title_en: '', title_kh: '', date: new Date().toISOString().slice(0, 10), category: 'Company', excerpt_en: '', excerpt_kh: '', imageBg: 'bg-green-800', image: '' })} className="rounded-xl bg-[#267A3B] px-4 py-2 text-xs font-bold text-white">{tx('+ Add Article', '+ បន្ថែមអត្ថបទ')}</button>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {news.map((article) => (
                  <div key={article.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 p-3">
                    {article.image ? <img src={article.image} alt="" className="h-12 w-12 rounded-lg object-cover" /> : <div className={`h-12 w-12 shrink-0 rounded-lg ${article.imageBg}`} />}
                    <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-800">{localizedArticleTitle(article)}</p><p className="text-[10px] text-slate-500">{article.date} · {tx(article.category, article.category === 'Company' ? 'ក្រុមហ៊ុន' : article.category === 'Products' ? 'ផលិតផល' : article.category === 'Events' ? 'ព្រឹត្តិការណ៍' : article.category)}</p></div>
                    <button type="button" onClick={() => setEditingNews({ ...article })} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-200">{tx('Edit', 'កែសម្រួល')}</button>
                  </div>
                ))}
              </div>

              {editingNews && (
                <form onSubmit={(event) => {
                  event.preventDefault();
                  setNews((current) => current.some((article) => article.id === editingNews.id) ? current.map((article) => article.id === editingNews.id ? editingNews : article) : [editingNews, ...current]);
                  setEditingNews(null);
                  triggerToast(tx('News article saved.', 'បានរក្សាទុកអត្ថបទព័ត៌មាន។'));
                }} className="grid grid-cols-1 gap-3 rounded-2xl border border-green-200 bg-green-50/50 p-4 sm:grid-cols-2">
                  <h3 className="text-sm font-extrabold text-[#202124] sm:col-span-2">{tx('Article details', 'ព័ត៌មានលម្អិតអត្ថបទ')}</h3>
                  <input required aria-label="Article title in English" placeholder={tx('Title (English)', 'ចំណងជើង (អង់គ្លេស)')} value={editingNews.title_en} onChange={(event) => setEditingNews({ ...editingNews, title_en: event.target.value })} className="rounded-xl border border-slate-300 p-2.5 text-xs" />
                  <input aria-label="Article title in Khmer" placeholder={tx('Title (Khmer)', 'ចំណងជើង (ខ្មែរ)')} value={editingNews.title_kh} onChange={(event) => setEditingNews({ ...editingNews, title_kh: event.target.value })} className="rounded-xl border border-slate-300 p-2.5 text-xs" />
                  <input required aria-label="Article date" type="date" value={editingNews.date} onChange={(event) => setEditingNews({ ...editingNews, date: event.target.value })} className="rounded-xl border border-slate-300 p-2.5 text-xs" />
                  <input required aria-label="Article category" placeholder={tx('Category', 'ប្រភេទ')} value={editingNews.category} onChange={(event) => setEditingNews({ ...editingNews, category: event.target.value })} className="rounded-xl border border-slate-300 p-2.5 text-xs" />
                  <textarea required aria-label="Article summary in English" placeholder={tx('Summary (English)', 'សេចក្តីសង្ខេប (អង់គ្លេស)')} rows={3} value={editingNews.excerpt_en} onChange={(event) => setEditingNews({ ...editingNews, excerpt_en: event.target.value })} className="rounded-xl border border-slate-300 p-2.5 text-xs" />
                  <textarea aria-label="Article summary in Khmer" placeholder={tx('Summary (Khmer)', 'សេចក្តីសង្ខេប (ខ្មែរ)')} rows={3} value={editingNews.excerpt_kh} onChange={(event) => setEditingNews({ ...editingNews, excerpt_kh: event.target.value })} className="rounded-xl border border-slate-300 p-2.5 text-xs" />
                  <ImageUpload label={tx('Article cover image', 'រូបភាពគម្របអត្ថបទ')} lang={lang} image={editingNews.image} onChange={(image) => setEditingNews({ ...editingNews, image })} />
                  <div className="flex gap-2 sm:col-span-2">
                    <button type="submit" className="rounded-xl bg-green-500 px-4 py-2.5 text-xs font-extrabold text-slate-950">{tx('Publish Article', 'បោះពុម្ពអត្ថបទ')}</button>
                    <button type="button" onClick={() => setEditingNews(null)} className="rounded-xl bg-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700">{tx('Cancel', 'បោះបង់')}</button>
                  </div>
                </form>
              )}
            </div>

            </>}
            {activeAdminSection === 'inquiries' && <>
            {/* Inquiries Inbox Console */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <h2 className="flex items-center gap-2 text-lg font-extrabold text-[#202124]"><MessageCircle className="h-5 w-5 shrink-0 text-green-500" aria-hidden="true" />{tx('Submitted Inquiries & Applications', 'សំណួរ និងពាក្យស្នើសុំដែលបានទទួល')}</h2>
                <span className="text-xs font-bold bg-green-100 text-green-900 px-2.5 py-1 rounded-md">{tx('Live Inbox', 'ប្រអប់សារចូល')}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-black text-slate-500 uppercase border-b border-slate-200">
                      <th className="p-3">{tx('Type', 'ប្រភេទ')}</th>
                      <th className="p-3">{tx('Contact / Business', 'អ្នកទំនាក់ទំនង / អាជីវកម្ម')}</th>
                      <th className="p-3">{tx('Phone & Telegram', 'ទូរសព្ទ និង Telegram')}</th>
                      <th className="p-3">{tx('Province', 'ខេត្ត')}</th>
                      <th className="p-3">{tx('Status', 'ស្ថានភាព')}</th>
                      <th className="p-3">{tx('Action', 'សកម្មភាព')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium">
                    {inquiries.map((inq) => (
                      <tr key={inq.id} className="hover:bg-slate-50">
                        <td className="p-3">
                          <span className="font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-800">{localizedInquiryType(inq.type)}</span>
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-slate-900">{inq.name}</p>
                          <p className="text-slate-500">{inq.business}</p>
                        </td>
                        <td className="p-3">
                          <p>{inq.phone}</p>
                          <p className="text-green-600">{inq.telegram}</p>
                        </td>
                        <td className="p-3">{localizedProvince(inq.province)}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded font-bold ${inq.status === 'New' ? 'bg-green-100 text-green-800' : 'bg-green-100 text-green-800'}`}>
                            {localizedInquiryStatus(inq.status)}
                          </span>
                        </td>
                        <td className="p-3">
                          <button
                            onClick={async () => {
                              try {
                                if (!supabaseClient) throw new Error('Supabase is not configured.');
                                const { error } = await supabaseClient.from('inquiries').update({ status: 'Contacted' }).eq('id', inq.id);
                                if (error) throw error;
                                setInquiries((currentInquiries) => currentInquiries.map(i => i.id === inq.id ? { ...i, status: 'Contacted' } : i));
                                triggerToast(tx('Inquiry status updated to Contacted.', 'បានកែស្ថានភាពសំណួរទៅជា បានទាក់ទង។'));
                              } catch (error) { triggerToast(error instanceof Error ? error.message : 'Could not update inquiry.'); }
                            }}
                            className="text-[11px] font-bold text-green-900 hover:underline"
                          >
                            {tx('Mark Contacted', 'សម្គាល់ថាបានទាក់ទង')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            </>}
            {activeAdminSection === 'analytics' && <section className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-extrabold text-slate-900"><BarChart3 className="h-5 w-5 text-green-700" aria-hidden="true" />{tx('Website traffic', 'ចរាចរណ៍គេហទំព័រ')}</h2>
                  <p className="mt-1 text-sm text-slate-500">{tx('A quick look at page visits and products people open.', 'មើលចំនួនទំព័រដែលបានចូលមើល និងផលិតផលដែលអ្នកប្រើបានបើក។')}</p>
                </div>
                <button type="button" onClick={() => void refreshWebsiteAnalytics()} disabled={analyticsLoading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-green-300 hover:bg-green-50 disabled:opacity-60">
                  <RefreshCw className={`h-4 w-4 ${analyticsLoading ? 'animate-spin' : ''}`} aria-hidden="true" />{analyticsLoading ? tx('Loading…', 'កំពុងផ្ទុក…') : tx('Refresh', 'ផ្ទុកឡើងវិញ')}
                </button>
              </div>

              {analyticsError ? <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
                <p className="font-extrabold">{tx('Analytics setup is needed', 'ត្រូវរៀបចំស្ថិតិជាមុន')}</p>
                <p className="mt-1">{tx('Run supabase/website_analytics_setup.sql in the Supabase SQL Editor, then refresh this page. New visits will appear after setup.', 'ដំណើរការឯកសារ supabase/website_analytics_setup.sql ក្នុង Supabase SQL Editor រួចចុចផ្ទុកឡើងវិញ។ ការចូលមើលថ្មីនឹងបង្ហាញបន្ទាប់ពីរៀបចំរួច។')}</p>
                <p className="mt-2 break-words text-xs text-amber-800">{analyticsError}</p>
              </div> : <>
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { label: tx('Page views · 7 days', 'ការមើលទំព័រ · ៧ ថ្ងៃ'), value: analyticsWeekEvents.filter((event) => event.event_type === 'page_view').length, icon: Eye },
                    { label: tx('Visitors · 7 days', 'អ្នកចូលមើល · ៧ ថ្ងៃ'), value: new Set(analyticsWeekEvents.map((event) => event.visitor_id)).size, icon: Users },
                    { label: tx('Product views · 7 days', 'ការមើលផលិតផល · ៧ ថ្ងៃ'), value: analyticsWeekEvents.filter((event) => event.event_type === 'product_view').length, icon: Package },
                  ].map((card) => <div key={card.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-500"><card.icon className="h-4 w-4 text-green-700" aria-hidden="true" />{card.label}</div>
                    <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">{card.value.toLocaleString()}</p>
                  </div>)}
                </div>

                <div className="grid gap-5 xl:grid-cols-2">
                  <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-base font-extrabold text-slate-900">{tx('Most viewed products', 'ផលិតផលដែលមានអ្នកមើលច្រើន')}</h3>
                    <p className="mt-1 text-xs text-slate-500">{tx('Based on recorded product opens.', 'ផ្អែកលើចំនួនបើកមើលផលិតផលដែលបានកត់ត្រា។')}</p>
                    {popularProducts.length ? <ol className="mt-4 space-y-3">{popularProducts.map((product, index) => <li key={product.name} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-green-100 text-xs font-black text-green-800">{index + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">{product.name}</span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-green-800">{product.views} {tx('views', 'ដង')}</span>
                    </li>)}</ol> : <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">{tx('No product views recorded yet.', 'មិនទាន់មានការមើលផលិតផលទេ។')}</p>}
                  </section>

                  <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-base font-extrabold text-slate-900">{tx('Recent activity', 'សកម្មភាពថ្មីៗ')}</h3>
                    <p className="mt-1 text-xs text-slate-500">{tx('Latest page and product views.', 'ការមើលទំព័រ និងផលិតផលថ្មីៗ។')}</p>
                    <div className="mt-4 space-y-2">
                      {websiteEvents.slice(0, 8).map((event) => <div key={event.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700">{event.event_type === 'product_view' ? <Package className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}</span>
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-800">{event.event_type === 'product_view' ? event.product_name || tx('Product', 'ផលិតផល') : tx(`${analyticsPageName(event.page_path)} page`, `ទំព័រ ${analyticsPageName(event.page_path)}`)}</span><span className="block text-xs text-slate-500">{event.event_type === 'product_view' ? tx('Product viewed', 'បានមើលផលិតផល') : tx('Page visited', 'បានចូលមើលទំព័រ')}</span></span>
                        <time className="shrink-0 text-[11px] text-slate-500" dateTime={event.created_at}>{new Date(event.created_at).toLocaleDateString(lang === 'KH' ? 'km-KH' : 'en-GB', { day: 'numeric', month: 'short' })}</time>
                      </div>)}
                      {!websiteEvents.length && <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">{tx('No visits yet. New activity will appear here.', 'មិនទាន់មានអ្នកចូលមើលទេ។ សកម្មភាពថ្មីនឹងបង្ហាញនៅទីនេះ។')}</p>}
                    </div>
                  </section>
                </div>
              </>}
            </section>}
            {activeAdminSection === 'storage' && <section className="min-w-0 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-extrabold text-slate-900"><HardDrive className="h-5 w-5 text-green-700" aria-hidden="true" />{tx('Data & storage health', 'សុខភាពទិន្នន័យ និងឃ្លាំងផ្ទុក')}</h2>
                  <p className="mt-1 text-sm text-slate-500">{tx('Check database setup and see how many pictures are stored in Supabase.', 'ពិនិត្យការរៀបចំមូលដ្ឋានទិន្នន័យ និងចំនួនរូបភាពដែលរក្សាទុកក្នុង Supabase។')}</p>
                </div>
                <button type="button" onClick={() => void handleDownloadBackup()} disabled={backupLoading || !Boolean(supabaseClient)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-green-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-800 disabled:cursor-wait disabled:opacity-60">
                  <Download className="h-4 w-4" aria-hidden="true" />{backupLoading ? tx('Preparing backup…', 'កំពុងរៀបចំការបម្រុងទុក…') : tx('Download backup', 'ទាញយកការបម្រុងទុក')}
                </button>
                <button type="button" onClick={() => void refreshDataHealth()} disabled={dataHealthLoading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-green-300 hover:bg-green-50 disabled:opacity-60">
                  <RefreshCw className={`h-4 w-4 ${dataHealthLoading ? 'animate-spin' : ''}`} aria-hidden="true" />{dataHealthLoading ? tx('Checking…', 'កំពុងពិនិត្យ…') : tx('Check again', 'ពិនិត្យម្ដងទៀត')}
                </button>
              </div>

              <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-950">
                <p className="font-bold">{tx('Keep a copy of your website data', 'រក្សាទុកច្បាប់ចម្លងទិន្នន័យគេហទំព័រ')}</p>
                <p className="mt-1 text-green-900">{tx('The backup file includes products, website content, traffic history, local admin records, and all images in both Supabase image buckets. Save the downloaded file somewhere safe.', 'ឯកសារបម្រុងទុកមានផលិតផល មាតិកាគេហទំព័រ ប្រវត្តិចរាចរណ៍ ទិន្នន័យអ្នកគ្រប់គ្រងក្នុងកម្មវិធីរុករក និងរូបភាពទាំងអស់ក្នុងឃ្លាំង Supabase ទាំងពីរ។ សូមរក្សាទុកឯកសារដែលបានទាញយកនៅកន្លែងមានសុវត្ថិភាព។')}</p>
              </div>

              {dataHealthError && <p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{dataHealthError}</p>}
              {!dataHealth && dataHealthLoading && <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">{tx('Checking your database and image buckets…', 'កំពុងពិនិត្យមូលដ្ឋានទិន្នន័យ និងឃ្លាំងរូបភាព…')}</div>}

              {dataHealth && <>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    { label: tx('Products table', 'តារាងផលិតផល'), check: dataHealth.products, icon: Package, setup: 'product_catalog_setup.sql' },
                    { label: tx('Website content', 'មាតិកាគេហទំព័រ'), check: dataHealth.siteContent, icon: Database, setup: 'site_content_storage_setup.sql' },
                    { label: tx('Inquiries', 'សំណើទំនាក់ទំនង'), check: dataHealth.inquiries, icon: MessageCircle, setup: 'inquiries_setup.sql' },
                    { label: tx('Traffic events', 'សកម្មភាពអ្នកចូលមើល'), check: dataHealth.events, icon: Eye, setup: 'website_analytics_setup.sql' }
                  ].map((item) => <div key={item.label} className={`rounded-2xl border p-4 ${item.check.error ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-white'}`}>
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-800"><item.icon className="h-4 w-4 text-green-700" aria-hidden="true" />{item.label}</div>
                    <p className={`mt-3 text-lg font-black ${item.check.error ? 'text-amber-800' : 'text-green-800'}`}>{item.check.error ? tx('Needs setup', 'ត្រូវរៀបចំ') : tx('Connected', 'បានភ្ជាប់')}</p>
                    <p className="mt-1 break-words text-xs text-slate-600">{item.check.error ? <>{tx(`Run ${item.setup} in Supabase SQL Editor.`, `ដំណើរការ ${item.setup} ក្នុង Supabase SQL Editor។`)}<span className="mt-1 block text-amber-800">{item.check.error}</span></> : `${item.check.count.toLocaleString()} ${tx('records', 'កំណត់ត្រា')}`}</p>
                  </div>)}
                </div>

                <div className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                  <div className="flex min-w-0 flex-wrap items-end justify-between gap-2">
                    <div><h3 className="flex items-center gap-2 text-lg font-extrabold text-slate-900"><ImageIcon className="h-5 w-5 text-green-700" aria-hidden="true" />{tx('Uploaded images', 'រូបភាពដែលបានផ្ទុកឡើង')}</h3>
                      <p className="mt-1 text-sm text-slate-500">{tx('Estimated size from image files currently in Supabase Storage.', 'ទំហំប៉ាន់ស្មានពីឯកសាររូបភាពដែលមានក្នុង Supabase Storage។')}</p>
                    </div>
                    <p className="max-w-full break-words text-left text-sm font-bold text-slate-700 sm:text-right">{dataHealth.buckets.reduce((sum, bucket) => sum + bucket.files, 0).toLocaleString()} {tx('files', 'ឯកសារ')} · {formatStorageBytes(dataHealth.buckets.reduce((sum, bucket) => sum + bucket.bytes, 0))}</p>
                  </div>
                  <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2">
                    {dataHealth.buckets.map((bucket) => <div key={bucket.bucket} className={`min-w-0 overflow-hidden rounded-2xl border p-4 ${bucket.error ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
                      <div className="flex items-center justify-between gap-3"><span className="truncate text-sm font-bold text-slate-800">{bucket.bucket}</span><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${bucket.error ? 'bg-amber-100 text-amber-900' : 'bg-green-100 text-green-900'}`}>{bucket.error ? tx('Needs setup', 'ត្រូវរៀបចំ') : tx('Ready', 'រួចរាល់')}</span></div>
                      {bucket.error ? <p className="mt-2 break-words text-xs text-amber-900">{bucket.error}</p> : <>
                        <p className="mt-3 text-2xl font-black text-slate-900">{bucket.files.toLocaleString()} <span className="text-sm font-semibold text-slate-500">{tx('images', 'រូបភាព')}</span></p>
                        <p className="mt-1 text-xs text-slate-600">{formatStorageBytes(bucket.bytes)} {tx('estimated size', 'ទំហំប៉ាន់ស្មាន')}</p>
                        {bucket.latest && <p className="mt-3 truncate border-t border-slate-200 pt-3 text-xs text-slate-600" title={bucket.latest.name}>{tx('Latest upload:', 'បានផ្ទុកចុងក្រោយ៖')} {bucket.latest.name} · {new Date(bucket.latest.createdAt).toLocaleString(lang === 'KH' ? 'km-KH' : 'en-GB')}</p>}
                      </>}
                    </div>)}
                  </div>
                  <div className="mt-6 min-w-0 border-t border-slate-100 pt-5">
                    <h4 className="text-sm font-extrabold text-slate-900">{tx('Recent uploads', 'រូបភាពដែលបានផ្ទុកថ្មីៗ')}</h4>
                    {dataHealth.recentUploads.length ? <div className="mt-3 divide-y divide-slate-100">
                      {dataHealth.recentUploads.map((file) => {
                        const imageUrl = supabaseClient?.storage.from(file.bucket).getPublicUrl(file.name).data.publicUrl;
                        return <div key={`${file.bucket}/${file.name}`} className="grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-2 py-3 sm:gap-3">
                          {imageUrl && <img src={imageUrl} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-lg border border-slate-200 bg-slate-50 object-cover" />}
                          <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-800" title={file.name}>{file.name}</span><span className="mt-1 block truncate text-[11px] text-slate-500">{file.bucket} · {new Date(file.createdAt).toLocaleString(lang === 'KH' ? 'km-KH' : 'en-GB')} · {formatStorageBytes(file.bytes)}</span></span>
                          {imageUrl && <a href={imageUrl} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-green-800 hover:bg-green-50">{tx('Open', 'បើក')}</a>}
                        </div>;
                      })}
                    </div> : <p className="mt-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">{tx('No images are stored in the connected buckets yet.', 'មិនទាន់មានរូបភាពក្នុងឃ្លាំងដែលបានភ្ជាប់ទេ។')}</p>}
                  </div>
                  {dataHealth.checkedAt && <p className="mt-4 text-right text-[11px] text-slate-400">{tx('Checked', 'បានពិនិត្យ')} {new Date(dataHealth.checkedAt).toLocaleString(lang === 'KH' ? 'km-KH' : 'en-GB')}</p>}
                </div>
              </>}
            </section>}
            {activeAdminSection === 'products' && <>
            {supabaseClient && <div className={`rounded-2xl border p-4 text-sm ${productsDatabaseError ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-green-200 bg-green-50 text-green-950'}`}>
              {productsDatabaseError ? <>
                <p className="font-bold">{tx('Product database needs setup or a connection check.', 'ត្រូវរៀបចំមូលដ្ឋានទិន្នន័យផលិតផល ឬពិនិត្យការតភ្ជាប់។')}</p>
                <p className="mt-1">{tx('Run supabase/product_catalog_setup.sql in the Supabase SQL Editor, then retry. Details:', 'សូមដំណើរការ supabase/product_catalog_setup.sql ក្នុង Supabase SQL Editor រួចសាកល្បងម្ដងទៀត។ ព័ត៌មានលម្អិត៖')} {productsDatabaseError}</p>
                <p className="mt-1 break-all text-xs text-amber-800">Connected Supabase project: {supabaseProjectHost}</p>
                <button type="button" onClick={() => setProductsRetry((attempt) => attempt + 1)} className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm">{tx('Retry connection', 'ព្យាយាមតភ្ជាប់ម្ដងទៀត')}</button>
              </> : <p>{productsSyncing ? tx('Saving products and pictures to Supabase…', 'កំពុងរក្សាទុកផលិតផល និងរូបភាពទៅ Supabase…') : tx('Products are connected to Supabase. When you publish or edit a product, its details and picture sync for every visitor.', 'ផលិតផលបានភ្ជាប់ទៅ Supabase។ ពេលអ្នកបោះពុម្ព ឬកែផលិតផល ព័ត៌មាន និងរូបភាពនឹងធ្វើសមកាលកម្មសម្រាប់អ្នកទស្សនាទាំងអស់។')}</p>}
            </div>}
            {/* Quick Product Creator CMS */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-[#202124]"><Package className="h-5 w-5 shrink-0 text-green-500" aria-hidden="true" />{tx('Add New Product to Website Catalog', 'បន្ថែមផលិតផលថ្មីទៅក្នុងកាតាឡុកគេហទំព័រ')}</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (newProductSaving) return;
                  const form = e.currentTarget;
                  const descriptionText = (html: string) => html.replace(/<[^>]*>/gu, '').replace(/&nbsp;/gu, ' ').trim();
                  if (!descriptionText(newProductSpecs)) {
                    triggerToast(tx('Please enter the product description.', 'សូមបញ្ចូលការពិពណ៌នាផលិតផល។'));
                    return;
                  }
                  if (!supabaseClient) {
                    triggerToast('Supabase is not configured. The product was not saved.');
                    return;
                  }
                  const fd = new FormData(form);
                  const newP = {
                    id: `p-${Date.now()}`,
                    code: String(fd.get('code') || '').trim(),
                    name_en: String(fd.get('name_en') || ''),
                    name_kh: String(fd.get('name_kh') || fd.get('name_en') || ''),
                    brand: String(fd.get('brand') || ''),
                    category: String(fd.get('category') || ''),
                    origin: "Malaysia",
                    sizes: String(fd.get('sizes') || ''),
                    specs: newProductSpecs,
                    specs_kh: newProductSpecsKh,
                    featured: false,
                    imageBg: "bg-green-100",
                    imageBadge: "New",
                    image: newProductImage || undefined
                  };
                  setNewProductSaving(true);
                  setProductsSyncing(true);
                  setProductsDatabaseError('');
                  try {
                    const saved = await saveProductToSupabase(newP);
                    productBaseline.current.set(saved.id, JSON.stringify(saved));
                    setProducts((currentProducts) => [saved, ...currentProducts]);
                    form.reset();
                    setNewProductImage('');
                    setNewProductSpecs('');
                    setNewProductSpecsKh('');
                    triggerToast('Product saved to Supabase and added to the catalog.');
                  } catch (error) {
                    const message = getSupabaseErrorMessage(error, 'Could not save this product to Supabase.');
                    setProductsDatabaseError(message);
                    triggerToast(`Product was not saved: ${message}`);
                  } finally {
                    setNewProductSaving(false);
                    setProductsSyncing(productsInFlight.current.size > 0);
                  }
                }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-4"
              >
                <input name="code" aria-label="Product code" placeholder={tx('Product code (optional)', 'កូដផលិតផល (ស្រេចចិត្ត)')} className="border border-slate-300 p-2.5 rounded-xl text-xs" />
                <input required name="name_en" placeholder={tx('Product Name (English)', 'ឈ្មោះផលិតផល (អង់គ្លេស)')} className="border border-slate-300 p-2.5 rounded-xl text-xs" />
                <input name="name_kh" placeholder={tx('Product Name (Khmer)', 'ឈ្មោះផលិតផល (ខ្មែរ)')} className="border border-slate-300 p-2.5 rounded-xl text-xs" />
                <select name="brand" value={newProductBrand} onChange={(event) => setNewProductBrand(event.target.value)} className="border border-slate-300 p-2.5 rounded-xl text-xs bg-white">
                  {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
                <ImageUpload label="Country flag for selected brand" lang={lang} image={brands.find((brand) => brand.name === newProductBrand)?.flagImage} onChange={(flagImage) => setBrands((current) => current.map((brand) => brand.name === newProductBrand ? { ...brand, flagImage } : brand))} />
              <select name="category" className="border border-slate-300 p-2.5 rounded-xl text-xs bg-white">
                  <option value="Personal Care">{localizedCategory('Personal Care')}</option>
                  <option value="Baby Care">{localizedCategory('Baby Care')}</option>
                  <option value="Beauty & Body Care">{localizedCategory('Beauty & Body Care')}</option>
                  <option value="Household Care">{localizedCategory('Household Care')}</option>
                  <option value="Food & Confectionery">{localizedCategory('Food & Confectionery')}</option>
                </select>
                <ProductDescriptionEditor value={newProductSpecs} onChange={setNewProductSpecs} label={tx('Description (English)', 'ការពិពណ៌នា (អង់គ្លេស)')} placeholder={tx('Write product details…', 'សរសេរព័ត៌មានលម្អិតអំពីផលិតផល…')} />
                <ProductDescriptionEditor value={newProductSpecsKh} onChange={setNewProductSpecsKh} label={tx('Description (Khmer)', 'ការពិពណ៌នា (ខ្មែរ)')} placeholder={tx('Write product details…', 'សរសេរព័ត៌មានលម្អិតអំពីផលិតផល…')} />
                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                  {tx('Pack size / packaging', 'ទំហំ / ការវេចខ្ចប់')}
                  <input name="sizes" placeholder={tx('e.g. 12 x 750ml', 'ឧ. 12 x 750ml')} className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-normal" />
                </label>
                <ImageUpload label={tx('Product picture', 'រូបភាពផលិតផល')} lang={lang} image={newProductImage} onChange={setNewProductImage} crop aspectRatio={4 / 3} />
                <button type="submit" disabled={newProductSaving} className="bg-[#267A3B] text-white rounded-xl text-xs font-bold py-2.5 sm:col-span-3 disabled:cursor-wait disabled:opacity-60">
                  {newProductSaving ? tx('Saving product…', 'កំពុងរក្សាទុកផលិតផល…') : tx('+ Publish Product to Catalog', '+ បោះពុម្ពផលិតផលទៅកាតាឡុក')}
                </button>
              </form>
          </div>

            {/* Edit existing products */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-extrabold text-[#202124]"><Package className="h-5 w-5 shrink-0 text-green-500" aria-hidden="true" />{tx('Edit Products', 'កែសម្រួលផលិតផល')}</h2>
                <p className="text-xs text-slate-500">{tx('Update product names, details, and pictures shown in the catalog.', 'កែឈ្មោះ ព័ត៌មានលម្អិត និងរូបភាពផលិតផលដែលបង្ហាញក្នុងកាតាឡុក។')}</p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                  <div key={product.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 p-3">
                    {product.image ? <img src={product.image} alt="" className="h-12 w-12 rounded-lg object-cover" /> : <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${product.imageBg} text-[9px] font-bold text-slate-600`}>{product.imageBadge}</div>}
                    <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-800">{product.name_en}</span>
                    <button type="button" onClick={() => setEditingProduct({ ...product, specs: normalizeProductDescriptionInput(product.specs), specs_kh: product.specs_kh ? normalizeProductDescriptionInput(product.specs_kh) : undefined })} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-200">{tx('Edit', 'កែសម្រួល')}</button>
                  </div>
                ))}
              </div>

              {editingProduct && (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    setProducts((current) => current.map((product) => product.id === editingProduct.id ? editingProduct : product));
                    setEditingProduct(null);
                    triggerToast(tx('Product saved.', 'បានរក្សាទុកផលិតផល។'));
                  }}
                  className="grid grid-cols-1 gap-3 rounded-2xl border border-green-200 bg-green-50/50 p-4 sm:grid-cols-2"
                >
                  <h3 className="text-sm font-extrabold text-[#202124] sm:col-span-2">{tx('Product details', 'ព័ត៌មានលម្អិតអំពីផលិតផល')}</h3>
                  <input aria-label="Product code" placeholder={tx('Product code (optional)', 'កូដផលិតផល (ស្រេចចិត្ត)')} value={editingProduct.code ?? ''} onChange={(event) => setEditingProduct({ ...editingProduct, code: event.target.value })} className="rounded-xl border border-slate-300 p-2.5 text-xs" />
                  <input required aria-label="Product name in English" placeholder={tx('Product name (English)', 'ឈ្មោះផលិតផល (អង់គ្លេស)')} value={editingProduct.name_en} onChange={(event) => setEditingProduct({ ...editingProduct, name_en: event.target.value })} className="rounded-xl border border-slate-300 p-2.5 text-xs" />
                  <input aria-label="Product name in Khmer" placeholder={tx('Product name (Khmer)', 'ឈ្មោះផលិតផល (ខ្មែរ)')} value={editingProduct.name_kh} onChange={(event) => setEditingProduct({ ...editingProduct, name_kh: event.target.value })} className="rounded-xl border border-slate-300 p-2.5 text-xs" />
                  <select aria-label="Product brand" value={editingProduct.brand} onChange={(event) => setEditingProduct({ ...editingProduct, brand: event.target.value })} className="rounded-xl border border-slate-300 bg-white p-2.5 text-xs">
                    {brands.map((brand) => <option key={brand.id} value={brand.name}>{brand.name}</option>)}
                  </select>
                  <select aria-label="Product category" value={editingProduct.category} onChange={(event) => setEditingProduct({ ...editingProduct, category: event.target.value })} className="rounded-xl border border-slate-300 bg-white p-2.5 text-xs">
                    {productCategories.filter((category) => category !== 'All').map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                  <input aria-label="Product origin" placeholder={tx('Country of origin', 'ប្រទេសដើម')} value={editingProduct.origin} onChange={(event) => setEditingProduct({ ...editingProduct, origin: event.target.value })} className="rounded-xl border border-slate-300 p-2.5 text-xs" />
                  <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-white p-3">
                    <ImageUpload label="Country flag for this brand" lang={lang} image={brands.find((brand) => brand.name === editingProduct.brand)?.flagImage} onChange={(flagImage) => setBrands((current) => current.map((brand) => brand.name === editingProduct.brand ? { ...brand, flagImage } : brand))} />
                    <p className="mt-2 text-xs text-slate-500">This flag is shared by every product from the selected brand and saves with website content.</p>
                  </div>
                  <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                    {tx('Pack size / packaging', 'ទំហំ / ការវេចខ្ចប់')}
                    <input aria-label="Pack size / packaging" placeholder={tx('e.g. 12 x 750ml', 'ឧ. 12 x 750ml')} value={editingProduct.sizes ?? ''} onChange={(event) => setEditingProduct({ ...editingProduct, sizes: event.target.value })} className="rounded-xl border border-slate-300 p-2.5 text-xs font-normal" />
                  </label>
                  <ProductDescriptionEditor value={editingProduct.specs} onChange={(specs) => setEditingProduct({ ...editingProduct, specs })} label={tx('Product description (English)', 'ការពិពណ៌នាផលិតផល (អង់គ្លេស)')} placeholder={tx('Write product details…', 'សរសេរព័ត៌មានលម្អិតអំពីផលិតផល…')} />
                  <ProductDescriptionEditor value={editingProduct.specs_kh || ''} onChange={(specs_kh) => setEditingProduct({ ...editingProduct, specs_kh })} label={tx('Product description in Khmer', 'ការពិពណ៌នាផលិតផល (ខ្មែរ)')} placeholder={tx('Write product details…', 'សរសេរព័ត៌មានលម្អិតអំពីផលិតផល…')} />
                  <ImageUpload label={tx('Product picture', 'រូបភាពផលិតផល')} lang={lang} image={editingProduct.image} onChange={(image) => setEditingProduct({ ...editingProduct, image })} crop aspectRatio={4 / 3} />
                  <div className="flex gap-2 sm:col-span-2">
                    <button type="submit" className="rounded-xl bg-green-500 px-4 py-2.5 text-xs font-extrabold text-slate-950">{tx('Save Product', 'រក្សាទុកផលិតផល')}</button>
                    <button type="button" onClick={() => setEditingProduct(null)} className="rounded-xl bg-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700">{tx('Cancel', 'បោះបង់')}</button>
                  </div>
                </form>
              )}
            </div>
            </>}
            {activeAdminSection === 'catalogs' && <CatalogStudioAdmin />}
              </div>
              </div>
          </div>
        )}
      </main>

      {}
      {/* Product Detail Modal */}
      {selectedProduct && (
        <Modal label="Product details" onClose={() => setSelectedProduct(null)} size="xl" closeOnBackdrop className="relative animate-fadeIn space-y-4 sm:space-y-5">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <button type="button" onClick={() => selectedProduct.image && setProductImageZoomOpen(true)} aria-label="Zoom product image" className={`flex h-56 w-full items-center justify-center overflow-hidden rounded-2xl bg-white text-2xl font-black text-slate-600/50 uppercase sm:h-72 ${selectedProduct.image ? 'cursor-zoom-in' : ''}`}>
              {selectedProduct.image ? <img src={selectedProduct.image} alt={lang === 'KH' ? localizedProductName(selectedProduct) : selectedProduct.name_en} className="h-full w-full rounded-2xl bg-white object-contain p-2" /> : localizedProductBadge(selectedProduct)}
            </button>
            {productImageZoomOpen && selectedProduct.image && (
              <div role="dialog" aria-modal="true" aria-label={`${localizedProductName(selectedProduct)} image`} className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/90 p-4" onClick={() => setProductImageZoomOpen(false)}>
                <button type="button" onClick={() => setProductImageZoomOpen(false)} aria-label="Close image zoom" className="absolute right-4 top-4 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-900">Close</button>
                <img src={selectedProduct.image} alt={localizedProductName(selectedProduct)} className="max-h-[90vh] max-w-[95vw] cursor-zoom-out object-contain" onClick={(event) => event.stopPropagation()} />
              </div>
            )}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span title={selectedProduct.origin} className="flex h-9 min-w-14 items-center justify-center rounded-xl border border-slate-200 bg-white px-1.5 shadow-sm">
                  <CountryFlag country={selectedProduct.origin} image={brands.find((brand) => brand.name === selectedProduct.brand)?.flagImage} />
                </span>
                <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-green-800">{selectedProduct.brand}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">{localizedCategory(selectedProduct.category)}</span>
              </div>
              <h3 className="text-2xl font-extrabold leading-tight text-slate-950 sm:text-3xl">{localizedProductName(selectedProduct)}</h3>
              <div className="rounded-2xl border border-slate-100 bg-white px-1 py-1 text-slate-700">
                <ProductDescription text={localizedProductSpecs(selectedProduct)} className="px-3 py-2 text-sm leading-6 sm:px-4" />
              </div>
            </div>

            <div className="rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 to-slate-50 p-3 sm:p-4">
              <h4 className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-green-800">{tx('Product information', 'ព័ត៌មានផលិតផល')}</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-white bg-white/90 p-3 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{tx('Country of Origin', 'ប្រទេសដើម')}</p>
                  <p className="mt-1 font-extrabold text-slate-900">{tx(selectedProduct.origin, selectedProduct.origin === 'Malaysia' ? 'ម៉ាឡេស៊ី' : selectedProduct.origin)}</p>
                </div>
                <div className="rounded-xl border border-white bg-white/90 p-3 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{tx('Sizes / Packaging', 'ទំហំ / ការវេចខ្ចប់')}</p>
                  <p className="mt-1 font-extrabold text-slate-900">{selectedProduct.sizes || tx('Standard packaging', 'ការវេចខ្ចប់ស្តង់ដារ')}</p>
                </div>
                <div className="rounded-xl border border-white bg-white/90 p-3 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{tx('Product code', 'កូដផលិតផល')}</p>
                  <p className="mt-1 font-extrabold text-slate-900">{selectedProduct.code?.trim() || tx('Not assigned', 'មិនទាន់កំណត់')}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row">
              <button type="button" onClick={() => openInquiry(localizedProductName(selectedProduct), selectedProduct.brand)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-3 font-extrabold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-green-800"><MessageCircle className="h-4 w-4" />{tx('Ask about this product', 'សាកសួរអំពីផលិតផលនេះ')}</button>
              <a href={settings.telegram.startsWith('http') ? settings.telegram : `https://t.me/${String(settings.telegram).replace(/^@/, '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 transition hover:border-green-300 hover:bg-green-50"><Send className="h-4 w-4 text-green-700" />Telegram</a>
              <a href={`mailto:${settings.email}?subject=${encodeURIComponent(`Product inquiry: ${localizedProductName(selectedProduct)}`)}`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 transition hover:border-green-300 hover:bg-green-50"><Mail className="h-4 w-4 text-green-700" />{tx('Email', 'អ៊ីមែល')}</a>
            </div>
        </Modal>
      )}

      {/* Brand Detail Modal */}
      {selectedBrand && (
        <Modal label="Brand details" onClose={() => setSelectedBrand(null)} closeOnBackdrop className="relative space-y-4 sm:space-y-6">
            <button onClick={() => setSelectedBrand(null)} className="absolute top-4 right-4 p-2 text-slate-400">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-[#267A3B] text-white font-black text-xl flex items-center justify-center">
                {selectedBrand.image ? <img src={selectedBrand.image} alt={`${selectedBrand.name} logo`} className="h-full w-full rounded-2xl bg-white p-2 object-contain" /> : selectedBrand.logoText.slice(0,3)}
              </div>
              <div>
                <h3 className="text-2xl font-extrabold text-slate-900">{selectedBrand.name}</h3>
                <p className="text-xs font-bold text-green-600">{tx('Imported from', 'នាំចូលពី')} {selectedBrand.origin === 'Malaysia' && lang === 'KH' ? 'ម៉ាឡេស៊ី' : selectedBrand.origin}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white px-1 py-1 text-slate-700">
              <ProductDescription text={localizedBrandDescription(selectedBrand)} className="px-3 py-2 text-sm leading-6 sm:px-4" />
            </div>

            <div className="border-t border-slate-100 pt-4 flex flex-col gap-2 sm:flex-row">
              {getSafeBrandWebsite(selectedBrand.website || getDefaultBrandWebsite(selectedBrand.name)) && <a href={getSafeBrandWebsite(selectedBrand.website || getDefaultBrandWebsite(selectedBrand.name))!} target="_blank" rel="noopener noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-green-200 bg-white py-3 text-xs font-bold text-green-800 hover:bg-green-50 sm:flex-1"><ExternalLink className="h-4 w-4" />{tx('Official Website', 'គេហទំព័រផ្លូវការ')}</a>}
              <button
                onClick={() => {
                  setSelectedBrand(null);
                  setActiveBrandFilter(selectedBrand.name);
                  setActiveCategory('All');
                  setSearchQuery('');
                  setCurrentView('products');
                }}
                className="w-full bg-[#267A3B] text-white font-bold py-3 rounded-xl text-xs sm:flex-1"
              >
                {tx('View Brand Products', 'មើលផលិតផលរបស់ម៉ាកនេះ')}
              </button>
            </div>
        </Modal>
      )}

      {/* Inquiry Flow Modal */}
      {inquiryModalOpen && (
        <Modal label="Product inquiry form" onClose={() => setInquiryModalOpen(false)} className="relative space-y-4">
            <button onClick={() => setInquiryModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-[#202124]">{tx('Send Direct Product Inquiry', 'ផ្ញើសំណួរអំពីផលិតផល')}</h3>
            {inquiryPrefill.product && (
              <div className="bg-green-50 border border-green-200 p-3 rounded-xl text-xs text-green-900 font-medium">
                Inquiring about: <span className="font-bold">{inquiryPrefill.product}</span> ({inquiryPrefill.brand})
              </div>
            )}

            <form onSubmit={handleInquirySubmit} className="space-y-3">
              <input type="hidden" name="type" value={inquiryPrefill.type} />
              <input required name="name" placeholder={tx('Your Name *', 'ឈ្មោះរបស់អ្នក *')} className="w-full border p-2.5 rounded-xl text-xs" />
              <input required name="phone" placeholder={tx('Phone Number *', 'លេខទូរសព្ទ *')} className="w-full border p-2.5 rounded-xl text-xs" />
              <input name="telegram" placeholder={tx('Telegram Username (@handle)', 'ឈ្មោះអ្នកប្រើ Telegram (@handle)')} className="w-full border p-2.5 rounded-xl text-xs" />
              <textarea name="message" rows={3} placeholder={tx('Inquiry notes or quantity requirements...', 'កំណត់សម្គាល់ ឬចំនួនផលិតផលដែលត្រូវការ...')} className="w-full border p-2.5 rounded-xl text-xs" />
              <button type="submit" className="w-full bg-[#267A3B] text-white py-3 rounded-xl font-bold text-xs">
                {tx('Submit Inquiry', 'ផ្ញើសំណួរ')}
              </button>
            </form>
        </Modal>
      )}

      {/* Article Reader Modal */}
      {selectedArticle && (
        <Modal label="News article" onClose={() => setSelectedArticle(null)} size="xl" closeOnBackdrop className="relative space-y-4">
            <button onClick={() => setSelectedArticle(null)} className="absolute top-4 right-4 p-2 text-slate-400">
              <X className="w-5 h-5" />
            </button>
            {selectedArticle.image && <img src={selectedArticle.image} alt="" className="max-h-[70vh] w-full rounded-xl bg-slate-50 object-contain" />}
            <span className="text-xs font-bold text-green-600">{tx(selectedArticle.category, selectedArticle.category === 'Company' ? 'ក្រុមហ៊ុន' : selectedArticle.category === 'Products' ? 'ផលិតផល' : selectedArticle.category === 'Events' ? 'ព្រឹត្តិការណ៍' : selectedArticle.category)} • {selectedArticle.date}</span>
            <h2 className="text-xl font-bold text-slate-900">{localizedArticleTitle(selectedArticle)}</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{localizedArticleExcerpt(selectedArticle)}</p>
        </Modal>
      )}

      {}
      {currentView !== 'admin' && <div className="fixed bottom-4 right-4 z-40 flex flex-col space-y-2 sm:bottom-6 sm:left-6 sm:right-auto">
        <a
          href={`https://t.me/${settings.telegram.replace('@','')}`}
          target="_blank"
          rel="noreferrer"
          className="h-11 w-11 rounded-full bg-green-500 p-0 text-white shadow-lg flex items-center justify-center transition-transform hover:scale-110 sm:h-auto sm:w-auto sm:p-3.5"
          title="Contact via Telegram"
        >
          <MessageCircle className="w-6 h-6" />
        </a>
        <a
          href={settings.facebook}
          target="_blank"
          rel="noreferrer"
          className="hidden rounded-full bg-green-600 p-3.5 text-white shadow-lg items-center justify-center transition-transform hover:scale-110 sm:flex"
          title="Visit VistaLab on Facebook"
          aria-label="Visit VistaLab on Facebook"
        >
          <span aria-hidden="true" className="text-2xl font-black leading-none">f</span>
        </a>
      </div>}

      {}
      <footer className="site-footer-friendly bg-green-50 text-slate-700 text-xs border-t border-green-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-7 sm:py-12 grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-7 sm:gap-8">
          <div className="col-span-2 space-y-3 md:col-span-1">
            <div className="flex items-center space-x-2 text-white font-extrabold text-lg">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-green-100 bg-white shadow-sm"><BrandMark className="h-7 w-7" /></div>
              <span>VISTALAB CAMBODIA</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">{t.footerDesc}</p>
          </div>

          <div className="min-w-0">
            <h4 className="text-white font-bold mb-3 uppercase tracking-wider text-[11px] text-green-400">{t.quickLinks}</h4>
            <ul className="space-y-2 text-slate-400 font-medium">
              <li><button onClick={() => setCurrentView('about')} className="hover:text-white">{tx('About & Distribution', 'អំពីយើង និងបណ្តាញចែកចាយ')}</button></li>
              <li><button onClick={() => setCurrentView('brands')} className="hover:text-white">{t.navBrands}</button></li>
              <li><button onClick={() => setCurrentView('products')} className="hover:text-white">{t.navProducts}</button></li>
            </ul>
          </div>

          <div className="min-w-0">
            <h4 className="text-white font-bold mb-3 uppercase tracking-wider text-[11px] text-green-400">{tx('Commercial', 'កិច្ចការពាណិជ្ជកម្ម')}</h4>
            <ul className="space-y-2 text-slate-400 font-medium">
              <li><button onClick={() => setCurrentView('partner')} className="hover:text-white">{t.navPartner}</button></li>
              <li><button onClick={() => setCurrentView('seller')} className="hover:text-white">{t.navSeller}</button></li>
              <li><button onClick={() => setCurrentView('news')} className="hover:text-white">{t.navNews}</button></li>
            </ul>
          </div>

          <div className="col-span-2 min-w-0 md:col-span-1">
            <h4 className="text-white font-bold mb-3 uppercase tracking-wider text-[11px] text-green-400">{t.contactInfo}</h4>
            <p className="text-slate-400 leading-relaxed">{tx('Hotline:', 'ទូរសព្ទ៖')} {settings.phone1}</p>
            <p className="break-all text-slate-400">{tx('Email:', 'អ៊ីមែល៖')} {settings.email}</p>
            <p className="break-all text-slate-400">Telegram: {settings.telegram}</p>
            <p className="mt-1"><a href={settings.facebook} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-white underline underline-offset-2">{tx('Facebook:', 'Facebook៖')} vistalab</a></p>
            <p className="text-slate-400 mt-2">{lang === 'KH' ? settings.address_kh : settings.address_en}</p>
          </div>
        </div>

        <div className="bg-green-100/70 px-4 py-4 pb-16 text-center text-slate-600 border-t border-green-100 sm:px-8 sm:pb-4">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
            <p>© 2026 VistaLab Cambodia Co., Ltd. {t.rightsReserved}</p>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-[11px] sm:justify-end">
              <button onClick={() => setCurrentView('admin')} className="text-slate-500 transition hover:text-green-800">Admin sign in</button>
              <span className="hover:text-slate-400 cursor-pointer">{tx('Privacy Policy', 'គោលការណ៍ឯកជនភាព')}</span>
              <span className="hover:text-slate-400 cursor-pointer">{tx('Terms of Distribution', 'លក្ខខណ្ឌនៃការចែកចាយ')}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

