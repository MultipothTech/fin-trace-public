import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { calculateNextBillingDate } from '@/features/subscriptions/utils/billing-calculator';
import type { BillingCycle } from '@/features/subscriptions/types/subscription.types';

/**
 * GET /api/subscriptions
 * ดึงรายการแพ็กเกจ/บิลทั้งหมดของผู้ใช้งาน
 */
export async function GET(req: Request) {
    try {
        const { user, supabase } = await getAuthenticatedUser(req);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .order('next_billing_date', { ascending: true });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const formatted = (data || []).map((item) => ({
            id: item.id,
            userId: item.user_id,
            name: item.name,
            price: Number(item.price) || 0,
            currency: item.currency || 'THB',
            billingCycle: item.billing_cycle || 'monthly',
            customIntervalDays: Number(item.custom_interval_days) || 1,
            startDate: item.start_date || item.next_billing_date || new Date().toISOString().split('T')[0],
            nextBillingDate: item.next_billing_date,
            category: item.category || 'other',
            paymentMethod: item.payment_method || 'Credit Card',
            reminderDays: Number(item.reminder_days) || 3,
            status: item.status || 'active',
            icon: item.icon || '',
            color: item.color || '',
            notes: item.notes || '',
            createdAt: item.created_at,
            updatedAt: item.updated_at,
        }));

        return NextResponse.json(formatted);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * POST /api/subscriptions
 * เพิ่มรายการ Subscription ใหม่
 */
export async function POST(req: Request) {
    try {
        const { user, supabase } = await getAuthenticatedUser(req);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const {
            name,
            price,
            currency = 'THB',
            billingCycle = 'monthly',
            customIntervalDays = 1,
            startDate,
            nextBillingDate,
            category = 'entertainment',
            paymentMethod = 'Credit Card',
            reminderDays = 3,
            status = 'active',
            notes = '',
        } = body;

        const todayStr = new Date().toISOString().split('T')[0];
        const finalStartDate = startDate || todayStr;
        const intervalDays = Math.max(1, Number(customIntervalDays) || 1);

        // Validate billing_cycle against the DB check constraint
        const VALID_BILLING_CYCLES = ['daily', 'weekly', 'monthly', 'quarterly', 'half_yearly', 'yearly'];
        const safeBillingCycle = VALID_BILLING_CYCLES.includes(billingCycle) ? billingCycle : 'monthly';

        const finalNextBillingDate =
            nextBillingDate && String(nextBillingDate).trim() !== ''
                ? nextBillingDate
                : calculateNextBillingDate(finalStartDate, safeBillingCycle as BillingCycle, undefined, intervalDays);

        const insertPayload: Record<string, unknown> = {
            user_id: user.id,
            name: name || 'Untitled Subscription',
            price: Number(price) || 0,
            currency,
            billing_cycle: safeBillingCycle,
            custom_interval_days: intervalDays,
            start_date: finalStartDate,
            next_billing_date: finalNextBillingDate,
            category,
            payment_method: paymentMethod,
            reminder_days: Number(reminderDays) || 3,
            status,
            notes,
        };

        let { data, error } = await supabase
            .from('subscriptions')
            .insert([insertPayload])
            .select()
            .single();

        if (error && error.message?.includes('custom_interval_days')) {
            // Fallback if custom_interval_days column has not been added to Supabase yet
            delete insertPayload.custom_interval_days;
            const retry = await supabase
                .from('subscriptions')
                .insert([insertPayload])
                .select()
                .single();
            data = retry.data;
            error = retry.error;
        }

        if (error && error.message?.includes('subscriptions_billing_cycle_check')) {
            // Fallback if DB check constraint does not support half_yearly/daily yet
            insertPayload.billing_cycle = 'monthly';
            const retry = await supabase
                .from('subscriptions')
                .insert([insertPayload])
                .select()
                .single();
            data = retry.data;
            error = retry.error;
        }

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const formatted = {
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
        };

        return NextResponse.json(formatted, { status: 201 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
