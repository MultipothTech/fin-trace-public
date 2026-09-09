import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { TAG_COLOR_PALETTES } from '@/lib/tags/tag-colors';

function mapTag(item: {
    id: string;
    name_en: string;
    name_th: string;
    color?: string | null;
    bg?: string | null;
    created_at?: string;
}) {
    return {
        id: item.id,
        nameEn: item.name_en,
        nameTh: item.name_th,
        color: item.color || 'text-sky-400',
        bg: item.bg || 'bg-sky-500/10 border-sky-500/20',
        createdAt: item.created_at,
    };
}

/**
 * GET /api/tags
 * Optional ?q= for ILIKE search on name_en / name_th
 */
export async function GET(req: Request) {
    try {
        const { user, supabase } = await getAuthenticatedUser(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const q = String(searchParams.get('q') || '').trim();
        // Escape PostgREST filter special chars
        const safeQ = q.replace(/[%_,.()\\]/g, '');

        let query = supabase
            .from('tags')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

        if (safeQ) {
            query = query.or(`name_en.ilike.%${safeQ}%,name_th.ilike.%${safeQ}%`).limit(20);
        }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json((data || []).map(mapTag));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * POST /api/tags
 */
export async function POST(req: Request) {
    try {
        const { user, supabase } = await getAuthenticatedUser(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const nameTh = String(body.nameTh || '').trim();
        const nameEn = String(body.nameEn || '').trim();
        if (!nameTh && !nameEn) {
            return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
        }

        const lookupName = (nameEn || nameTh).replace(/[%_,.()\\"]/g, '').trim();
        if (lookupName) {
            const { data: existing } = await supabase
                .from('tags')
                .select('*')
                .eq('user_id', user.id)
                .or(`name_en.ilike."${lookupName}",name_th.ilike."${lookupName}"`)
                .limit(1)
                .maybeSingle();

            if (existing) {
                return NextResponse.json(mapTag(existing), { status: 200 });
            }
        }

        const randomPalette = TAG_COLOR_PALETTES[Math.floor(Math.random() * TAG_COLOR_PALETTES.length)];
        const color = body.color || randomPalette.color;
        const bg = body.bg || randomPalette.bg;

        const { data, error } = await supabase
            .from('tags')
            .insert([
                {
                    user_id: user.id,
                    name_en: nameEn || nameTh,
                    name_th: nameTh || nameEn,
                    color,
                    bg,
                },
            ])
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(mapTag(data), { status: 201 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
