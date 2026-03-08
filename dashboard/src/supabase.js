import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const dashboardKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
export const initialProjectId = import.meta.env.VITE_PROJECT_ID || '';

export const hasSupabaseConfig = Boolean(supabaseUrl && dashboardKey);

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, dashboardKey)
  : null;
