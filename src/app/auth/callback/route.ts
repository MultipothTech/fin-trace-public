import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * GET /auth/callback
 * Endpoint สำหรับรับ Authorization Code จาก Supabase OAuth (Google)
 * และทำการ Exchange Code เป็น Session ใน Cookie อัตโนมัติ
 */
export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/';

    if (code) {
        try {
            const supabase = await createServerSupabaseClient();
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error) {
                const forwardUrl = next.startsWith('/') ? `${origin}${next}` : `${origin}/`;
                return NextResponse.redirect(forwardUrl);
            }
            console.error('Supabase OAuth code exchange error:', error.message);
        } catch (err) {
            console.error('Callback error:', err);
        }
    }

    // หากเกิดข้อผิดพลาด ให้ Redirect กลับไปหน้าแรก
    return NextResponse.redirect(`${origin}/`);
}
