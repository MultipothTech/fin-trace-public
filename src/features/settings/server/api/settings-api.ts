import { apiFetch } from '@/lib/http/axios-client';
import type { UserSettings } from '@/features/settings/types/settings.types';

/**
 * บันทึกการตั้งค่าของผู้ใช้งาน
 */
export async function saveUserSettings(settings: UserSettings): Promise<UserSettings> {
    return apiFetch<UserSettings>('/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
    });
}

/**
 * ดึงการตั้งค่าของผู้ใช้งาน
 */
export async function getUserSettings(): Promise<UserSettings> {
    return apiFetch<UserSettings>('/settings', {
        method: 'GET',
    });
}
