import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { SUBSCRIPTION_CATEGORIES } from '@/config/constants';

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

function mapCategory(item: {
    id: string;
    key: string;
    name_en: string;
    name_th: string;
    icon?: string | null;
    color?: string | null;
    bg?: string | null;
    is_system?: boolean | null;
    created_at?: string;
}) {
    return {
        id: item.id,
        key: item.key,
        label_en: item.name_en,
        label_th: item.name_th,
        icon: item.icon || CATEGORY_ICON_NAMES[item.key] || 'MoreHorizontal',
        color: item.color || 'text-zinc-400',
        bg: item.bg || 'bg-zinc-500/10',
        isSystem: Boolean(item.is_system),
        createdAt: item.created_at,
    };
}

/**
 * Ensure default system categories exist in DB with real UUIDs
 * so subscriptions.category_id FK can reference them.
 */
async function ensureSystemCategories(
    supabase: Awaited<ReturnType<typeof getAuthenticatedUser>>['supabase'],
    userId: string
) {
    const { data: existing, error } = await supabase
        .from('categories')
        .select('id, key, is_system')
        .eq('user_id', userId);

    if (error) throw new Error(error.message);

    const existingKeys = new Set((existing || []).map((c) => c.key));
    const toInsert = Object.entries(SUBSCRIPTION_CATEGORIES)
        .filter(([key]) => !existingKeys.has(key))
        .map(([key, cat]) => ({
            user_id: userId,
            key,
            name_en: cat.label_en,
            name_th: cat.label_th,
            icon: CATEGORY_ICON_NAMES[key] || 'MoreHorizontal',
            color: cat.color,
            bg: cat.bg,
            is_system: true,
        }));

    if (toInsert.length > 0) {
        const { error: insertError } = await supabase.from('categories').insert(toInsert);
        if (insertError) throw new Error(insertError.message);
    }
}

/**
 * GET /api/categories
 */
export async function GET(req: Request) {
    try {
        const { user, supabase } = await getAuthenticatedUser(req);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await ensureSystemCategories(supabase, user.id);

        const { data: userCategories, error } = await supabase
            .from('categories')
            .select('*')
            .eq('user_id', user.id)
            .order('is_system', { ascending: false })
            .order('created_at', { ascending: true });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // System first (stable order by known keys), then custom
        const systemKeys = Object.keys(SUBSCRIPTION_CATEGORIES);
        const rows = userCategories || [];
        const systemRows = systemKeys
            .map((key) => rows.find((r) => r.key === key && r.is_system))
            .filter(Boolean) as typeof rows;
        const customRows = rows.filter((r) => !r.is_system);

        return NextResponse.json([...systemRows, ...customRows].map(mapCategory));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * POST /api/categories
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

        return NextResponse.json(mapCategory(data), { status: 201 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
