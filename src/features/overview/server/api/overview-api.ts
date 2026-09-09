import { apiFetch } from '@/lib/http/axios-client';
import type { OverviewStats } from '@/features/overview/types/overview.types';

/**
 * ดึงข้อมูลสถิติภาพรวมทางการเงิน (Dashboard Stats)
 */
export async function getOverviewStats(): Promise<OverviewStats> {
    return apiFetch<OverviewStats>('/overview', {
        method: 'GET',
    });
}
