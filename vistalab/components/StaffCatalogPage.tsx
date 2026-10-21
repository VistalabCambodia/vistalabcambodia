import { useEffect, useRef, useState } from 'react';
import { AlertCircle, LoaderCircle, LogOut } from 'lucide-react';
import catalogStudioHtml from '../catalog-studio.html?raw';
import { supabaseClient } from '../utils/supabase';

type CatalogState = { pages: unknown[]; [key: string]: unknown };

export function StaffCatalogPage({ onSignOut }: { onSignOut: () => void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [catalog, setCatalog] = useState<CatalogState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      controller.abort();
      if (!cancelled) setError('Catalog request timed out. Check your internet connection and Supabase project settings, then retry.');
    }, 10000);
    setError('');
    void (async () => {
      if (!supabaseClient) throw new Error('Supabase is not configured.');
      const { data, error: queryError } = await supabaseClient
        .from('price_catalogs')
        .select('data')
        .eq('id', 'catalog-studio-main')
        .abortSignal(controller.signal)
        .maybeSingle();
      if (queryError) {
        if (controller.signal.aborted) throw new Error('Catalog request timed out. Check your internet connection and Supabase project settings, then retry.');
        throw new Error(queryError.message);
      }
      if (cancelled || controller.signal.aborted) return;
      if (!data?.data || !Array.isArray((data.data as CatalogState).pages)) {
        throw new Error('No catalog is visible to this staff account. Confirm an admin saved it and run the latest supabase/price_catalogs_setup.sql to enable staff viewing.');
      }
      if (!cancelled) setCatalog(data.data as CatalogState);
    })().catch((reason) => {
      if (!cancelled) setError(controller.signal.aborted
        ? 'Catalog request timed out. Check your internet connection and Supabase project settings, then retry.'
        : reason instanceof Error ? reason.message : 'Could not load the catalog.');
    }).finally(() => window.clearTimeout(timeout));
    return () => { cancelled = true; window.clearTimeout(timeout); controller.abort(); };
  }, [retry]);

  useEffect(() => {
    if (!loaded || !catalog) return;
    frame.current?.contentWindow?.postMessage({ type: 'catalog-studio:init', data: catalog, viewer: true }, window.location.origin);
  }, [loaded, catalog]);

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-green-700">VistaLab Cambodia · Staff</p>
            <h1 className="text-xl font-black text-slate-900">Product Catalog</h1>
          </div>
          <button onClick={onSignOut} className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><LogOut className="h-4 w-4"/>Sign out</button>
        </header>
        {error ? <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><span><AlertCircle className="mr-2 inline h-4 w-4"/>{error}{/relation .*price_catalogs|schema cache/i.test(error) ? ' Run supabase/price_catalogs_setup.sql, then retry.' : ''}</span><button onClick={() => { setCatalog(null); setLoaded(false); setRetry((n) => n + 1); }} className="rounded-lg border border-amber-300 bg-white px-3 py-2 font-semibold hover:bg-amber-100">Retry</button></div>
          : !catalog ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600"><span><LoaderCircle className="mr-2 inline h-4 w-4 animate-spin"/>Loading catalog from Supabase…</span><button onClick={() => { setLoaded(false); setRetry((n) => n + 1); }} className="rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50">Retry</button></div>
          : <iframe ref={frame} title="Staff catalog viewer" srcDoc={catalogStudioHtml} sandbox="allow-scripts allow-same-origin allow-downloads" onLoad={() => setLoaded(true)} className="h-[calc(100vh-110px)] min-h-[680px] w-full rounded-2xl border border-slate-300 bg-white shadow-sm" />}
      </div>
    </main>
  );
}
