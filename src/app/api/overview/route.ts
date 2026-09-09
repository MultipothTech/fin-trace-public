import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server';

function calculateDaysDiff(dateStr: string): number {
    if (!dateStr) return 999;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [y, m, d] = dateStr.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    target.setHours(0, 0, 0, 0);

    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * GET /api/overview
 * คำนวณสรุปยอดรายเดือน/รายปี, รายการที่ต้องจ่ายใน 3 วัน, และสัดส่วนค่าบริการ
 */
export async function GET(req: Request) {
    try {
        const { user, supabase } = await getAuthenticatedUser(req);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: subs, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .order('next_billing_date', { ascending: true });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        let monthlyTotal = 0;
        let yearlyTotal = 0;
        let activeCount = 0;
        const categoryBreakdown: Record<string, number> = {};
        const urgentSubscriptions: Array<Record<string, unknown>> = [];
        const upcomingSubscriptions: Array<Record<string, unknown>> = [];

        (subs || []).forEach((item) => {
            const price = Number(item.price) || 0;
            const cycle = item.billing_cycle || 'monthly';
            const status = item.status || 'active';
            const cat = item.category || 'other';
            const daysRemaining = calculateDaysDiff(item.next_billing_date);

            const formatted = {
                id: item.id,
                name: item.name,
                price,
                currency: item.currency || 'THB',
                billingCycle: cycle,
                nextBillingDate: item.next_billing_date,
                category: cat,
                paymentMethod: item.payment_method,
                status,
                daysRemaining,
                isUrgent: daysRemaining >= 0 && daysRemaining <= 3 && status === 'active',
            };

            if (status === 'active') {
                activeCount++;

                // Normalized monthly amount
                let normalizedMonthly = price;
                if (cycle === 'yearly') normalizedMonthly = price / 12;
                else if (cycle === 'half_yearly') normalizedMonthly = price / 6;
                else if (cycle === 'quarterly') normalizedMonthly = price / 3;
                else if (cycle === 'weekly') normalizedMonthly = price * 4.33;
                else if (cycle === 'daily') {
                    const days = Math.max(1, Number(item.custom_interval_days) || 1);
                    normalizedMonthly = (price / days) * 30.416;
                }

                monthlyTotal += normalizedMonthly;
                yearlyTotal += normalizedMonthly * 12;

                categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + normalizedMonthly;

                if (daysRemaining >= 0 && daysRemaining <= 3) {
                    urgentSubscriptions.push(formatted);
                }

                if (daysRemaining >= 0 && daysRemaining <= 14) {
                    upcomingSubscriptions.push(formatted);
                }
            }
        });

        return NextResponse.json({
            monthlyTotal: Math.round(monthlyTotal),
            yearlyTotal: Math.round(yearlyTotal),
            activeCount,
            urgentCount: urgentSubscriptions.length,
            urgentSubscriptions,
            upcomingSubscriptions,
            categoryBreakdown,
            allSubscriptionsCount: (subs || []).length,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
