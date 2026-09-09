import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { SUBSCRIPTION_CATEGORIES } from '@/config/constants';

// Map each category key to the correct Lucide icon component name string
// (SUBSCRIPTION_CATEGORIES stores actual icon components, but the frontend ICON_MAP uses string keys)
const CATEGORY_ICON_NAMES: Record<string, string> = {
    streaming: 'Film',
    ai_software: 'Bot',
    music: 'Music',
    cloud: 'Cloud',
    utilities: 'Zap',
    gaming: 'Gamepad2',
    fitness: 'Dumbbell',
    education: 'GraduationCap',
    shopping: 'ShoppingBag',
    coffee: 'Coffee',
    other: 'MoreHorizontal',
};

/**
 * GET /api/categories
 * ดึงรายการหมวดหมู่ทั้งหมด (หมวดหมู่เริ่มต้นของระบบ + หมวดหมู่ที่ผู้ใช้สร้างเอง)
 */
export async function GET(req: Request) {
    try {
        const { user, supabase } = await getAuthenticatedUser(req);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: userCategories, error } = await supabase
            .from('categories')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // ระบบ Default Categories
        const defaultList = Object.entries(SUBSCRIPTION_CATEGORIES).map(([key, cat]) => ({
            id: `system_${key}`,
            key,
            label_en: cat.label_en,
            label_th: cat.label_th,
            icon: CATEGORY_ICON_NAMES[key] || 'MoreHorizontal',
            color: cat.color,
            bg: cat.bg,
            isSystem: true,
        }));

        const customList = (userCategories || []).map((item) => ({
            id: item.id,
            key: item.key,
            label_en: item.name_en,
            label_th: item.name_th,
            icon: item.icon || 'MoreHorizontal',
            color: item.color || 'text-zinc-400',
            bg: item.bg || 'bg-zinc-500/10',
            isSystem: false,
            createdAt: item.created_at,
        }));

        return NextResponse.json([...defaultList, ...customList]);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * POST /api/categories
 * สร้างหมวดหมู่ใหม่ลงใน Supabase
 */
export async function POST(req: Request) {
    try {
        const { user, supabase } = await getAuthenticatedUser(req);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { nameTh, nameEn, icon = 'MoreHorizontal', color = 'text-purple-400', bg = 'bg-purple-500/10' } = body;

        const key = `custom_${Date.now()}`;

        const { data, error } = await supabase
            .from('categories')
            .insert([
                {
                    user_id: user.id,
                    key,
                    name_en: nameEn || nameTh || 'Custom Category',
                    name_th: nameTh || nameEn || 'หมวดหมู่กำหนดเอง',
                    icon,
                    color,
                    bg,
                    is_system: false,
                },
            ])
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(
            {
                id: data.id,
                key: data.key,
                label_en: data.name_en,
                label_th: data.name_th,
                icon: data.icon,
                color: data.color,
                bg: data.bg,
                isSystem: false,
            },
            { status: 201 }
        );
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
