import { NextResponse } from 'next/server';
import { clearCategoryReferences } from '@/lib/ids/clear-entity-refs';
import { getAuthenticatedUser } from '@/lib/supabase/server';

interface RouteParams {
    params: Promise<{ id: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
        icon: item.icon || 'MoreHorizontal',
        color: item.color || 'text-zinc-400',
        bg: item.bg || 'bg-zinc-500/10',
        isSystem: Boolean(item.is_system),
        createdAt: item.created_at,
    };
}

/**
 * PUT /api/categories/[id]
 */
export async function PUT(req: Request, { params }: RouteParams) {
    try {
        const { user, supabase } = await getAuthenticatedUser(req);
        const { id } = await params;

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!id || !UUID_RE.test(id)) {
            return NextResponse.json(
                { error: 'Invalid category id. System placeholders cannot be updated.' },
                { status: 400 }
            );
        }

        const body = await req.json();
        const updatePayload: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (body.nameTh !== undefined) updatePayload.name_th = body.nameTh;
        if (body.nameEn !== undefined) updatePayload.name_en = body.nameEn;
        if (body.icon !== undefined) updatePayload.icon = body.icon;
        if (body.color !== undefined) updatePayload.color = body.color;
        if (body.bg !== undefined) updatePayload.bg = body.bg;

        // Block editing system categories
        const { data: existing, error: findError } = await supabase
            .from('categories')
            .select('id, is_system')
            .eq('id', id)
            .eq('user_id', user.id)
            .maybeSingle();

        if (findError) {
            return NextResponse.json({ error: findError.message }, { status: 500 });
        }
        if (!existing) {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 });
        }
        if (existing.is_system) {
            return NextResponse.json({ error: 'System categories cannot be edited' }, { status: 403 });
        }

        const { data, error } = await supabase
            .from('categories')
            .update(updatePayload)
            .eq('id', id)
            .eq('user_id', user.id)
            .eq('is_system', false)
            .select()
            .maybeSingle();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        if (!data) {
            return NextResponse.json({ error: 'Category not updated' }, { status: 404 });
        }

        return NextResponse.json(mapCategory(data));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * DELETE /api/categories/[id]
 */
export async function DELETE(req: Request, { params }: RouteParams) {
    try {
        const { user, supabase } = await getAuthenticatedUser(req);
        const { id } = await params;

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!id || !UUID_RE.test(id)) {
            return NextResponse.json({ error: 'Invalid category id' }, { status: 400 });
        }

        const { data: existing } = await supabase
            .from('categories')
            .select('id, is_system')
            .eq('id', id)
            .eq('user_id', user.id)
            .maybeSingle();

        if (!existing) {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 });
        }
        if (existing.is_system) {
            return NextResponse.json({ error: 'System categories cannot be deleted' }, { status: 403 });
        }

        try {
            await clearCategoryReferences(supabase, user.id, id);
        } catch (clearErr: unknown) {
            const message = clearErr instanceof Error ? clearErr.message : 'Failed to clear category references';
            return NextResponse.json({ error: message }, { status: 500 });
        }

        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id)
            .eq('is_system', false);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
