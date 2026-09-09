import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { env } from '@/config/env';

/**
 * Supabase Server Client สำหรับใช้งานใน Route Handlers และ Server Components ผ่าน Cookies
 */
export async function createServerSupabaseClient(): Promise<SupabaseClient> {
    const cookieStore = await cookies();

    return createServerClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    );
                } catch {
                    // Server Component หรือ Read-only context
                }
            },
        },
    }) as unknown as SupabaseClient;
}

/**
 * ตรวจสอบและดึงข้อมูลผู้ใช้งานที่ Authenticated ผ่าน Cookie หรือ Authorization Bearer Header
 */
export async function getAuthenticatedUser(req?: Request): Promise<{
    user: User | null;
    supabase: SupabaseClient;
}> {
    // 1. ตรวจสอบผ่าน Authorization Bearer Header (หาก client ส่งมาแบบ token)
    const authHeader = req?.headers?.get('authorization') || req?.headers?.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const tokenClient = createClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
            global: {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
            auth: {
                persistSession: false,
            },
        });

        const { data: { user }, error } = await tokenClient.auth.getUser(token);
        if (!error && user) {
            return { user, supabase: tokenClient };
        }
    }

    // 2. ตรวจสอบผ่าน Next.js Cookies
    try {
        const serverClient = await createServerSupabaseClient();
        const { data: { user }, error } = await serverClient.auth.getUser();
        if (!error && user) {
            return { user, supabase: serverClient };
        }
        return { user: null, supabase: serverClient };
    } catch {
        const defaultClient = createClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
            auth: { persistSession: false },
        });
        return { user: null, supabase: defaultClient };
    }
}
