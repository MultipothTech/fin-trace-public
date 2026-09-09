import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/config/env';

/**
 * Supabase Client สำหรับฝั่ง Browser / Client Components
 * จัดการ Session และ Cookie อัตโนมัติด้วย @supabase/ssr
 */
export const supabase = createBrowserClient(env.SUPABASE_URL, env.SUPABASE_KEY);
export const createClient = () => createBrowserClient(env.SUPABASE_URL, env.SUPABASE_KEY);
