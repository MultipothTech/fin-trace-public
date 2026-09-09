import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * PUT /api/categories/[id]
 * แก้ไขหมวดหมู่ที่กำหนดเอง
 */
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

        if (body.nameTh !== undefined) updatePayload.name_th = body.nameTh;
        if (body.nameEn !== undefined) updatePayload.name_en = body.nameEn;
        if (body.icon !== undefined) updatePayload.icon = body.icon;
        if (body.color !== undefined) updatePayload.color = body.color;
        if (body.bg !== undefined) updatePayload.bg = body.bg;

        const email = user.email || '';
        const { data, error } = await supabase
            .from('categories')
            .update(updatePayload)
            .eq('id', id)
            .or(`user_id.eq.${user.id},user_email.eq.${email}`)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            id: data.id,
            key: data.key,
            label_en: data.name_en,
            label_th: data.name_th,
            icon: data.icon,
            color: data.color,
            bg: data.bg,
            isSystem: false,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * DELETE /api/categories/[id]
 * ลบหมวดหมู่ที่กำหนดเอง
 */
export async function DELETE(req: Request, { params }: RouteParams) {
    try {
        const { user, supabase } = await getAuthenticatedUser(req);
        const { id } = await params;

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const email = user.email || '';
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id)
            .or(`user_id.eq.${user.id},user_email.eq.${email}`);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
