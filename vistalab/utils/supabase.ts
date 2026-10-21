import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseClient = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null;

export async function isAdminUser(userId: string): Promise<boolean> {
  if (!supabaseClient) return false;
  const { data, error } = await supabaseClient
    .from('admin_users')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  return !error && Boolean(data);
}

export async function isCatalogStaffUser(userId: string): Promise<boolean> {
  if (!supabaseClient) return false;
  const { data, error } = await supabaseClient
    .from('catalog_staff_users')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  return !error && Boolean(data);
}
