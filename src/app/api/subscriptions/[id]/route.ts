import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { normalizeTagIds, readTagIdsFromRow, normalizeProjectIds, readProjectIdsFromRow } from '@/lib/tags/tag-ids';

interface RouteParams {
    params: Promise<{ id: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatSubscription(item: Record<string, unknown>, categoryKey = 'other') {
    const tagIds = readTagIdsFromRow(item);
    const projectIds = readProjectIdsFromRow(item);
    return {
        id: item.id,
        userId: item.user_id,
        name: item.name,
        price: Number(item.price) || 0,
        currency: item.currency,
        billingCycle: item.billing_cycle,
        customIntervalDays: Number(item.custom_interval_days) || 1,
        startDate: item.start_date,
        nextBillingDate: item.next_billing_date,
        category: categoryKey,
        categoryId: (item.category_id as string) || null,
        tagIds,
        tagId: tagIds[0] || null,
        projectIds,
        paymentMethod: item.payment_method,
        reminderDays: Number(item.reminder_days) || 3,
        status: item.status,
        notes: item.notes,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
    };
}

/**
 * PUT /api/subscriptions/[id]
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
            const VALID = ['daily', 'weekly', 'monthly', 'quarterly', 'half_yearly', 'yearly'];
            updatePayload.billing_cycle = VALID.includes(body.billingCycle) ? body.billingCycle : 'monthly';
        }
        if (body.customIntervalDays !== undefined) {
            updatePayload.custom_interval_days = Number(body.customIntervalDays) || 1;
        }
        if (body.startDate !== undefined) updatePayload.start_date = body.startDate;
        if (body.nextBillingDate !== undefined) updatePayload.next_billing_date = body.nextBillingDate;
        if (body.paymentMethod !== undefined) updatePayload.payment_method = body.paymentMethod;
        if (body.reminderDays !== undefined) updatePayload.reminder_days = Number(body.reminderDays);
        if (body.status !== undefined) updatePayload.status = body.status;
        if (body.notes !== undefined) updatePayload.notes = body.notes;

        if (body.categoryId !== undefined || body.category !== undefined) {
            let resolvedCategoryId: string | null = null;
            if (body.categoryId && UUID_RE.test(String(body.categoryId))) {
                resolvedCategoryId = String(body.categoryId);
            } else if (typeof body.category === 'string' && UUID_RE.test(body.category)) {
                resolvedCategoryId = body.category;
            } else if (typeof body.category === 'string' && body.category) {
                const { data: cat } = await supabase
                    .from('categories')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('key', body.category)
                    .maybeSingle();
                resolvedCategoryId = cat?.id || null;
            }
            updatePayload.category_id = resolvedCategoryId;
        }

        if (body.tagIds !== undefined || body.tagId !== undefined) {
            const resolvedTagIds = normalizeTagIds(body.tagIds, body.tagId);
            updatePayload.tag_ids = resolvedTagIds;
        }

        if (body.projectIds !== undefined) {
            updatePayload.project_ids = normalizeProjectIds(body.projectIds);
        }

        let { data, error } = await supabase
            .from('subscriptions')
            .update(updatePayload)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error && (error.message?.includes('tag_ids') || error.message?.includes('project_ids') || error.code === 'PGRST204')) {
            return NextResponse.json(
                { error: 'Database missing tag_ids/project_ids. Run migrate-multi-tags.sql and migrate-projects.sql' },
                { status: 500 }
            );
        }

        if (error && error.message?.includes('custom_interval_days')) {
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

        let categoryKey = 'other';
        if (data.category_id) {
            const { data: cat } = await supabase
                .from('categories')
                .select('key')
                .eq('id', data.category_id)
                .maybeSingle();
            if (cat?.key) categoryKey = cat.key;
        } else if (typeof body.category === 'string' && !UUID_RE.test(body.category)) {
            categoryKey = body.category;
        }

        return NextResponse.json(formatSubscription(data, categoryKey));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * DELETE /api/subscriptions/[id]
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
