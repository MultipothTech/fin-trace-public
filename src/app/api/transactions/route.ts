import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { normalizeTagIds, readTagIdsFromRow, normalizeProjectIds, readProjectIdsFromRow } from '@/lib/tags/tag-ids';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatTx(item: Record<string, unknown>, categoryKey = 'other') {
    const tagIds = readTagIdsFromRow(item);
    const projectIds = readProjectIdsFromRow(item);
    return {
        id: item.id,
        userId: item.user_id,
        subscriptionId: item.subscription_id || null,
        amount: Number(item.amount) || 0,
        type: item.type || 'expense',
        category: categoryKey,
        categoryId: (item.category_id as string) || null,
        tagIds,
        tagId: tagIds[0] || null,
        projectIds,
        transactionDate: item.transaction_date,
        description: item.description || '',
        paymentChannel: item.payment_channel || '',
        createdAt: item.created_at,
        updatedAt: item.updated_at,
    };
}

/**
 * GET /api/transactions
 */
export async function GET(req: Request) {
    try {
        const { user, supabase } = await getAuthenticatedUser(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const [{ data, error }, { data: cats }] = await Promise.all([
            supabase
                .from('transactions')
                .select('*')
                .eq('user_id', user.id)
                .order('transaction_date', { ascending: false })
                .order('created_at', { ascending: false }),
            supabase.from('categories').select('id, key').eq('user_id', user.id),
        ]);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const keyById = new Map((cats || []).map((c) => [c.id, c.key]));
        return NextResponse.json(
            (data || []).map((item) =>
                formatTx(item, keyById.get(item.category_id) || 'other')
            )
        );
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * POST /api/transactions
 */
export async function POST(req: Request) {
    try {
        const { user, supabase } = await getAuthenticatedUser(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const {
            amount,
            type,
            category,
            categoryId,
            tagId,
            tagIds,
            projectIds,
            transaction_date,
            transactionDate,
            description,
            payment_channel,
            paymentChannel,
            subscription_id,
            subscriptionId,
        } = body;

        const rawAmount = Number(amount);
        const safeAmount = isNaN(rawAmount) ? 0 : Math.max(0, rawAmount);
        const safeType = type === 'income' ? 'income' : 'expense';
        const rawDate = transactionDate || transaction_date;
        const safeDate =
            rawDate && typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
                ? rawDate
                : new Date().toISOString().split('T')[0];

        let resolvedCategoryId: string | null =
            categoryId && UUID_RE.test(String(categoryId)) ? categoryId : null;
        if (!resolvedCategoryId && category && typeof category === 'string') {
            if (UUID_RE.test(category)) {
                resolvedCategoryId = category;
            } else {
                const { data: cat } = await supabase
                    .from('categories')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('key', category)
                    .maybeSingle();
                resolvedCategoryId = cat?.id || null;
            }
        }

        const resolvedTagIds = normalizeTagIds(tagIds, tagId);
        const resolvedProjectIds = normalizeProjectIds(projectIds);

        const insertPayload: Record<string, unknown> = {
            user_id: user.id,
            subscription_id: subscriptionId || subscription_id || null,
            amount: safeAmount,
            type: safeType,
            category_id: resolvedCategoryId,
            tag_ids: resolvedTagIds,
            project_ids: resolvedProjectIds,
            transaction_date: safeDate,
            description: description || '',
            payment_channel: paymentChannel || payment_channel || '',
        };

        let { data, error } = await supabase
            .from('transactions')
            .insert([insertPayload])
            .select()
            .single();

        if (error && (error.message?.includes('tag_ids') || error.message?.includes('project_ids') || error.code === 'PGRST204')) {
            return NextResponse.json(
                { error: 'Database missing tag_ids/project_ids. Run migrate-multi-tags.sql and migrate-projects.sql' },
                { status: 500 }
            );
        }

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const categoryKey =
            typeof category === 'string' && category && !UUID_RE.test(category) ? category : 'other';
        return NextResponse.json(formatTx(data, categoryKey), { status: 201 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
