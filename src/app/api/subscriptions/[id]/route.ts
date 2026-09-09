import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * PUT /api/subscriptions/[id]
 * อัปเดตข้อมูลแพ็กเกจ
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

        if (body.name !== undefined) updatePayload.name = body.name;
        if (body.price !== undefined) updatePayload.price = Number(body.price);
        if (body.currency !== undefined) updatePayload.currency = body.currency;
        if (body.billingCycle !== undefined) {
            const VALID_BILLING_CYCLES = ['daily', 'weekly', 'monthly', 'quarterly', 'half_yearly', 'yearly'];
            updatePayload.billing_cycle = VALID_BILLING_CYCLES.includes(body.billingCycle) ? body.billingCycle : 'monthly';
        }
        if (body.customIntervalDays !== undefined) updatePayload.custom_interval_days = Number(body.customIntervalDays) || 1;
        if (body.startDate !== undefined) updatePayload.start_date = body.startDate;
        if (body.nextBillingDate !== undefined) updatePayload.next_billing_date = body.nextBillingDate;
        if (body.category !== undefined) updatePayload.category = body.category;
        if (body.paymentMethod !== undefined) updatePayload.payment_method = body.paymentMethod;
        if (body.reminderDays !== undefined) updatePayload.reminder_days = Number(body.reminderDays);
        if (body.status !== undefined) updatePayload.status = body.status;
        if (body.notes !== undefined) updatePayload.notes = body.notes;

        let { data, error } = await supabase
            .from('subscriptions')
            .update(updatePayload)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error && error.message?.includes('custom_interval_days')) {
            // Fallback if custom_interval_days column has not been added to Supabase yet
            delete updatePayload.custom_interval_days;
            const retry = await supabase
                .from('subscriptions')
                .update(updatePayload)
                .eq('id', id)
                .eq('user_id', user.id)
                .select()
                .single();
            data = retry.data;
            error = retry.error;
        }

        if (error && error.message?.includes('subscriptions_billing_cycle_check')) {
            // Fallback if DB check constraint does not support half_yearly/daily yet
            updatePayload.billing_cycle = 'monthly';
            const retry = await supabase
                .from('subscriptions')
                .update(updatePayload)
                .eq('id', id)
                .eq('user_id', user.id)
                .select()
                .single();
            data = retry.data;
            error = retry.error;
        }

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            id: data.id,
            userId: data.user_id,
            name: data.name,
            price: Number(data.price) || 0,
            currency: data.currency,
            billingCycle: data.billing_cycle,
            customIntervalDays: Number(data.custom_interval_days) || 1,
            startDate: data.start_date,
            nextBillingDate: data.next_billing_date,
            category: data.category,
            paymentMethod: data.payment_method,
            reminderDays: Number(data.reminder_days) || 3,
            status: data.status,
            notes: data.notes,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * DELETE /api/subscriptions/[id]
 * ลบรายการแพ็กเกจ
 */
export async function DELETE(req: Request, { params }: RouteParams) {
    try {
        const { user, supabase } = await getAuthenticatedUser(req);
        const { id } = await params;

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { error } = await supabase
            .from('subscriptions')
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
