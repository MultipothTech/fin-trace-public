import { NextResponse } from 'next/server';
import { clearProjectReferences } from '@/lib/ids/clear-entity-refs';
import { getAuthenticatedUser } from '@/lib/supabase/server';

interface RouteParams {
    params: Promise<{ id: string }>;
}

function mapProject(item: {
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
        color: item.color || 'text-violet-400',
        bg: item.bg || 'bg-violet-500/10 border-violet-500/20',
        createdAt: item.created_at,
    };
}

export async function PUT(req: Request, { params }: RouteParams) {
    try {
        const { user, supabase } = await getAuthenticatedUser(req);
        const { id } = await params;
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const updatePayload: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };
        if (body.nameTh !== undefined) updatePayload.name_th = String(body.nameTh).trim();
        if (body.nameEn !== undefined) updatePayload.name_en = String(body.nameEn).trim();
        if (body.color !== undefined) updatePayload.color = body.color;
        if (body.bg !== undefined) updatePayload.bg = body.bg;

        const { data, error } = await supabase
            .from('projects')
            .update(updatePayload)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(mapProject(data));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: RouteParams) {
    try {
        const { user, supabase } = await getAuthenticatedUser(req);
        const { id } = await params;
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        try {
            await clearProjectReferences(supabase, user.id, id);
        } catch (clearErr: unknown) {
            const message = clearErr instanceof Error ? clearErr.message : 'Failed to clear project references';
            return NextResponse.json({ error: message }, { status: 500 });
        }

        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
