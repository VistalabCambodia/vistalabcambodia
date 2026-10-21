import { supabaseClient } from './supabase';

export type WebsiteEvent = {
  id: number;
  event_type: 'page_view' | 'product_view';
  page_path: string;
  product_id: string | null;
  product_name: string | null;
  visitor_id: string;
  created_at: string;
};

type TrackableEvent = Pick<WebsiteEvent, 'event_type' | 'page_path'> &
  Partial<Pick<WebsiteEvent, 'product_id' | 'product_name'>>;

const visitorSessionKey = 'vistalab.analytics.session';

function getVisitorSessionId(): string | null {
  try {
    let visitorId = window.sessionStorage.getItem(visitorSessionKey);
    if (!visitorId) {
      visitorId = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.sessionStorage.setItem(visitorSessionKey, visitorId);
    }
    return visitorId;
  } catch {
    return null;
  }
}

export async function trackWebsiteEvent(event: TrackableEvent): Promise<void> {
  if (!supabaseClient) return;
  const visitorId = getVisitorSessionId();
  if (!visitorId) return;
  try {
    const { error } = await supabaseClient.from('website_events').insert({
      ...event,
      product_id: event.product_id ?? null,
      product_name: event.product_name?.slice(0, 160) ?? null,
      page_path: event.page_path.slice(0, 80),
      visitor_id: visitorId
    });
    if (error) throw error;
  } catch {
    // Analytics must not interrupt normal browsing if the table is unavailable.
  }
}

export async function fetchWebsiteEvents(): Promise<{ events: WebsiteEvent[]; error: string | null }> {
  if (!supabaseClient) return { events: [], error: 'Supabase is not configured.' };
  try {
    const { data, error } = await supabaseClient.from('website_events').select('*').order('created_at', { ascending: false }).limit(1000);
    if (error) throw error;
    return { events: (data ?? []) as WebsiteEvent[], error: null };
  } catch (error) {
    return { events: [], error: error instanceof Error ? error.message : 'Could not load traffic history.' };
  }
}
