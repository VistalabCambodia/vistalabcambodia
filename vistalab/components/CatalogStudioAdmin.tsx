import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Cloud, LoaderCircle } from 'lucide-react';
import catalogStudioHtml from '../catalog-studio.html?raw';
import { supabaseClient } from '../utils/supabase';

const documentId = 'catalog-studio-main';
type StudioState = { pages: unknown[]; [key: string]: unknown };
type FrameMessage = { type: 'catalog-studio:ready' | 'catalog-studio:update'; data: StudioState };

export function CatalogStudioAdmin({ fullScreen = false }: { fullScreen?: boolean }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const frameState = useRef<StudioState | null>(null);
  const writeTimer = useRef<number | null>(null);
  const initialized = useRef(false);
  const [databaseReady, setDatabaseReady] = useState(false);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [frameStateReady, setFrameStateReady] = useState(false);
  const [storedState, setStoredState] = useState<StudioState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!supabaseClient) {
      setError('Supabase is not configured. Add the Supabase URL and anon key to the app environment.');
      setDatabaseReady(true);
      return;
    }
    void (async () => {
      const { data, error: queryError } = await supabaseClient
        .from('price_catalogs')
        .select('data,updated_at')
        .eq('id', documentId)
        .maybeSingle();
      if (cancelled) return;
      if (queryError) setError(queryError.message);
      else if (data?.data && typeof data.data === 'object' && Array.isArray((data.data as StudioState).pages)) {
        setStoredState(data.data as StudioState);
        setSavedAt(data.updated_at ?? '');
      }
      setDatabaseReady(true);
    })().catch((reason) => {
      if (!cancelled) {
        setError(reason instanceof Error ? reason.message : 'Could not load Catalog Studio data.');
        setDatabaseReady(true);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const persist = (data: StudioState) => {
    if (writeTimer.current !== null) window.clearTimeout(writeTimer.current);
    setSaving(true);
    writeTimer.current = window.setTimeout(() => {
      void (async () => {
        if (!supabaseClient) throw new Error('Supabase is not configured.');
        const updatedAt = new Date().toISOString();
        const { error: writeError } = await supabaseClient.from('price_catalogs').upsert({
          id: documentId,
          title: 'Catalog Studio',
          data,
          updated_at: updatedAt
        });
        if (writeError) throw new Error(writeError.message);
        setError('');
        setSavedAt(updatedAt);
      })().catch((reason) => setError(reason instanceof Error ? reason.message : 'Could not save Catalog Studio data.'))
        .finally(() => setSaving(false));
    }, 650);
  };

  useEffect(() => {
    const onMessage = (event: MessageEvent<FrameMessage>) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      const message = event.data;
      if (!message || !['catalog-studio:ready', 'catalog-studio:update'].includes(message.type)) return;
      if (!message.data || !Array.isArray(message.data.pages)) return;
      frameState.current = message.data;
      if (message.type === 'catalog-studio:update') {
        persist(message.data);
        return;
      }
      setFrameStateReady(true);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (!databaseReady || !frameLoaded || initialized.current) return;
    if (storedState) {
      initialized.current = true;
      frame.current?.contentWindow?.postMessage({ type: 'catalog-studio:init', data: storedState }, window.location.origin);
    } else if (frameStateReady && frameState.current) {
      initialized.current = true;
      persist(frameState.current);
    }
  }, [databaseReady, frameLoaded, frameStateReady, storedState]);

  useEffect(() => () => {
    if (writeTimer.current !== null) window.clearTimeout(writeTimer.current);
  }, []);

  return <section className={fullScreen ? 'flex min-h-0 flex-1 flex-col overflow-hidden' : 'space-y-3'}>
    <div className={`flex shrink-0 flex-wrap items-center justify-between gap-3 border border-slate-200 bg-white px-4 ${fullScreen ? 'min-h-10 border-x-0 border-t-0 py-1.5' : 'rounded-2xl py-3'}`}>
      <div>
        <h2 className="font-extrabold text-slate-900">Catalog Studio</h2>
        {!fullScreen && <p className="text-xs text-slate-500">Catalog editor and price sheets · private to admins</p>}
      </div>
      <div className="flex items-center gap-2 text-xs font-semibold">
        {saving ? <><LoaderCircle className="h-4 w-4 animate-spin text-blue-700"/>Saving to Supabase…</> : error ? <><AlertCircle className="h-4 w-4 text-amber-700"/>Not synced</> : <><CheckCircle2 className="h-4 w-4 text-green-700"/><span>Saved to Supabase</span></>}
        {!saving && !error && savedAt && <time className="hidden text-slate-400 sm:inline" dateTime={savedAt}>{new Date(savedAt).toLocaleTimeString()}</time>}
      </div>
    </div>
    {error && <p role="alert" className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-950"><Cloud className="mr-2 inline h-4 w-4"/>{error}{error.toLowerCase().includes('price_catalogs') || error.toLowerCase().includes('schema cache') ? ' Run supabase/price_catalogs_setup.sql in the Supabase SQL Editor, then reload this page.' : ''}</p>}
    <iframe
      ref={frame}
      title="Catalog Studio editor"
      srcDoc={catalogStudioHtml}
      sandbox="allow-scripts allow-same-origin allow-downloads allow-modals allow-forms"
      onLoad={() => {
        setFrameLoaded(true);
        frame.current?.contentWindow?.postMessage({ type: 'catalog-studio:request' }, window.location.origin);
      }}
      className={fullScreen ? 'min-h-0 w-full flex-1 border-0 bg-white' : 'h-[calc(100vh-240px)] min-h-[680px] w-full rounded-2xl border border-slate-300 bg-white shadow-sm'}
    />
  </section>;
}
