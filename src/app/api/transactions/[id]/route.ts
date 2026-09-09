import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * PUT /api/transactions/[id]
 * อัปเดตรายการธุรกรรมเดิมของผู้ใช้งาน
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

        if (body.amount !== undefined) updatePayload.amount = Number(body.amount);
        if (body.type !== undefined) updatePayload.type = body.type;
        if (body.category !== undefined) updatePayload.category = body.category;
        if (body.transaction_date !== undefined) updatePayload.transaction_date = body.transaction_date;
        if (body.description !== undefined) updatePayload.description = body.description;
        if (body.payment_channel !== undefined) updatePayload.payment_channel = body.payment_channel;

        const email = user.email || '';
        const { data, error } = await supabase
            .from('transactions')
            .update(updatePayload)
            .eq('id', id)
            .or(`user_id.eq.${user.id},user_email.eq.${email}`)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * DELETE /api/transactions/[id]
 * ลบรายการธุรกรรมของผู้ใช้งาน
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
            .from('transactions')
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
