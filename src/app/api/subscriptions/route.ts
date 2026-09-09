import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { calculateNextBillingDate } from '@/features/subscriptions/utils/billing-calculator';
import type { BillingCycle } from '@/features/subscriptions/types/subscription.types';
import { normalizeTagIds, readTagIdsFromRow, normalizeProjectIds, readProjectIdsFromRow } from '@/lib/tags/tag-ids';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatSubscription(
    item: Record<string, unknown>,
    categoryKey = 'other'
) {
    const tagIds = readTagIdsFromRow(item);
    const projectIds = readProjectIdsFromRow(item);
    return {
        id: item.id,
        userId: item.user_id,
        name: item.name,
        price: Number(item.price) || 0,
        currency: (item.currency as string) || 'THB',
        billingCycle: (item.billing_cycle as string) || 'monthly',
        customIntervalDays: Number(item.custom_interval_days) || 1,
        startDate:
            (item.start_date as string) ||
            (item.next_billing_date as string) ||
            new Date().toISOString().split('T')[0],
        nextBillingDate: item.next_billing_date,
        category: categoryKey,
        categoryId: (item.category_id as string) || null,
        tagIds,
        tagId: tagIds[0] || null,
        projectIds,
        paymentMethod: (item.payment_method as string) || 'Credit Card',
        reminderDays: Number(item.reminder_days) || 3,
        status: (item.status as string) || 'active',
        notes: (item.notes as string) || '',
        createdAt: item.created_at,
        updatedAt: item.updated_at,
    };
}

async function resolveCategoryId(
    supabase: Awaited<ReturnType<typeof getAuthenticatedUser>>['supabase'],
    userId: string,
    categoryId?: string | null,
    categoryKey?: string | null
): Promise<string | null> {
    if (categoryId && UUID_RE.test(categoryId)) return categoryId;
    if (categoryKey && !categoryKey.startsWith('system_')) {
        const { data } = await supabase
            .from('categories')
            .select('id')
            .eq('user_id', userId)
            .eq('key', categoryKey)
            .maybeSingle();
        if (data?.id) return data.id;
    }
    return null;
}

/**
 * GET /api/subscriptions
 */
export async function GET(req: Request) {
    try {
        const { user, supabase } = await getAuthenticatedUser(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const [{ data, error }, { data: cats }] = await Promise.all([
            supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', user.id)
                .order('next_billing_date', { ascending: true }),
            supabase.from('categories').select('id, key').eq('user_id', user.id),
        ]);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const keyById = new Map((cats || []).map((c) => [c.id, c.key]));
        const formatted = (data || []).map((item) =>
            formatSubscription(item, keyById.get(item.category_id) || 'other')
        );

        return NextResponse.json(formatted);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * POST /api/subscriptions
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
            category = 'other',
            categoryId = null,
            tagId = null,
            tagIds,
            projectIds,
            paymentMethod = 'Credit Card',
            reminderDays = 3,
            status = 'active',
            notes = '',
        } = body;

        const todayStr = new Date().toISOString().split('T')[0];
        const finalStartDate = startDate || todayStr;
        const intervalDays = Math.max(1, Number(customIntervalDays) || 1);
        const VALID_BILLING_CYCLES = ['daily', 'weekly', 'monthly', 'quarterly', 'half_yearly', 'yearly'];
        const safeBillingCycle = VALID_BILLING_CYCLES.includes(billingCycle) ? billingCycle : 'monthly';
        const finalNextBillingDate =
            nextBillingDate && String(nextBillingDate).trim() !== ''
                ? nextBillingDate
                : calculateNextBillingDate(finalStartDate, safeBillingCycle as BillingCycle, undefined, intervalDays);

        const resolvedCategoryId = await resolveCategoryId(supabase, user.id, categoryId, category);
        const resolvedTagIds = normalizeTagIds(tagIds, tagId);
        const resolvedProjectIds = normalizeProjectIds(projectIds);

        const insertPayload: Record<string, unknown> = {
            user_id: user.id,
            name: name || 'Untitled Subscription',
            price: Number(price) || 0,
            currency,
            billing_cycle: safeBillingCycle,
            custom_interval_days: intervalDays,
            start_date: finalStartDate,
            next_billing_date: finalNextBillingDate,
            category_id: resolvedCategoryId,
            tag_ids: resolvedTagIds,
            project_ids: resolvedProjectIds,
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

        if (error && (error.message?.includes('tag_ids') || error.message?.includes('project_ids') || error.code === 'PGRST204')) {
            return NextResponse.json(
                { error: 'Database missing tag_ids/project_ids. Run migrate-multi-tags.sql and migrate-projects.sql' },
                { status: 500 }
            );
        }

        if (error && error.message?.includes('custom_interval_days')) {
            delete insertPayload.custom_interval_days;
            const retry = await supabase.from('subscriptions').insert([insertPayload]).select().single();
            data = retry.data;
            error = retry.error;
        }

        if (error && error.message?.includes('subscriptions_billing_cycle_check')) {
            insertPayload.billing_cycle = 'monthly';
            const retry = await supabase.from('subscriptions').insert([insertPayload]).select().single();
            data = retry.data;
            error = retry.error;
        }

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const categoryKey =
            typeof category === 'string' && category && !UUID_RE.test(category) ? category : 'other';
        return NextResponse.json(formatSubscription(data, categoryKey), { status: 201 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
