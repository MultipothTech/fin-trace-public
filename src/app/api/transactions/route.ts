import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server';

/**
 * GET /api/transactions
 * ดึงรายการธุรกรรมทั้งหมดของผู้ใช้งานที่ล็อกอินผ่าน Supabase Auth
 */
export async function GET(req: Request) {
    try {
        const { user, supabase } = await getAuthenticatedUser(req);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const email = user.email || '';
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .or(`user_id.eq.${user.id},user_email.eq.${email}`)
            .order('transaction_date', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const formatted = (data || []).map((item) => ({
            id: item.id,
            userId: item.user_id,
            userEmail: item.user_email,
            subscriptionId: item.subscription_id || null,
            amount: Number(item.amount) || 0,
            type: item.type || 'expense',
            category: item.category || 'other',
            transactionDate: item.transaction_date,
            description: item.description || '',
            paymentChannel: item.payment_channel || '',
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
 * POST /api/transactions
 * บันทึกรายการธุรกรรมใหม่ของผู้ใช้งาน
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
            transaction_date,
            transactionDate,
            description,
            payment_channel,
            paymentChannel,
            subscription_id,
            subscriptionId,
        } = body;

        const email = user.email || '';
        const rawAmount = Number(amount);
        const safeAmount = isNaN(rawAmount) ? 0 : Math.max(0, rawAmount);
        const safeType = type === 'income' ? 'income' : 'expense';
        const safeCategory = (category && String(category).trim()) || 'other';
        const rawDate = transactionDate || transaction_date;
        const safeDate =
            rawDate && typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
                ? rawDate
                : new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('transactions')
            .insert([
                {
                    user_id: user.id,
                    user_email: email,
                    subscription_id: subscriptionId || subscription_id || null,
                    amount: safeAmount,
                    type: safeType,
                    category: safeCategory,
                    transaction_date: safeDate,
                    description: description || '',
                    payment_channel: paymentChannel || payment_channel || '',
                },
            ])
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const formatted = {
            id: data.id,
            userId: data.user_id,
            userEmail: data.user_email,
            subscriptionId: data.subscription_id || null,
            amount: Number(data.amount) || 0,
            type: data.type || 'expense',
            category: data.category || 'other',
            transactionDate: data.transaction_date,
            description: data.description || '',
            paymentChannel: data.payment_channel || '',
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        };

        return NextResponse.json(formatted, { status: 201 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
