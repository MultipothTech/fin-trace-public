import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server';

const DEFAULT_DASHBOARD_LAYOUT = [
    { id: 'urgent_banner', visible: true },
    { id: 'stat_cards', visible: true },
    { id: 'upcoming_renewals', visible: true },
    { id: 'category_breakdown', visible: true },
];

const DEFAULT_SETTINGS = {
    language: 'th',
    notificationEnabled: true,
    dashboardLayout: DEFAULT_DASHBOARD_LAYOUT,
};

/**
 * GET /api/settings
 * ดึงข้อมูลการตั้งค่าของผู้ใช้จาก Supabase
 */
export async function GET(req: Request) {
    try {
        const { user, supabase } = await getAuthenticatedUser(req);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!data) {
            return NextResponse.json(DEFAULT_SETTINGS);
        }

        return NextResponse.json({
            language: data.language || 'th',
            notificationEnabled: data.notification_enabled !== false,
            dashboardLayout: data.dashboard_layout || DEFAULT_DASHBOARD_LAYOUT,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * PUT /api/settings
 * บันทึกหรืออัปเดตการตั้งค่าของผู้ใช้ลงใน Supabase (Upsert)
 */
export async function PUT(req: Request) {
    try {
        const { user, supabase } = await getAuthenticatedUser(req);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { language, notificationEnabled, dashboardLayout } = body;

        const { data, error } = await supabase
            .from('user_settings')
            .upsert(
                {
                    user_id: user.id,
                    language: language ?? 'th',
                    notification_enabled: notificationEnabled ?? true,
                    dashboard_layout: dashboardLayout ?? DEFAULT_DASHBOARD_LAYOUT,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'user_id' }
            )
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            language: data.language,
            notificationEnabled: data.notification_enabled,
            dashboardLayout: data.dashboard_layout || DEFAULT_DASHBOARD_LAYOUT,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
