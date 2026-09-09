import { apiFetch } from '@/lib/http/axios-client';
import type { Subscription, SubscriptionInput } from '@/features/subscriptions/types/subscription.types';

/**
 * ดึงรายการ Subscription ทั้งหมด
 */
export async function getSubscriptions(): Promise<Subscription[]> {
    return apiFetch<Subscription[]>('/subscriptions');
}

/**
 * เพิ่ม Subscription ใหม่
 */
export async function createSubscription(input: SubscriptionInput): Promise<Subscription> {
    return apiFetch<Subscription>('/subscriptions', {
        method: 'POST',
        body: JSON.stringify(input),
    });
}

/**
 * อัปเดต Subscription
 */
export async function updateSubscription(
    id: string,
    input: Partial<SubscriptionInput>
): Promise<Subscription> {
    return apiFetch<Subscription>(`/subscriptions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
    });
}

/**
 * ลบ Subscription
 */
export async function deleteSubscription(id: string): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>(`/subscriptions/${id}`, {
        method: 'DELETE',
    });
}
