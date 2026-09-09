import type { Language } from '@/features/subscriptions/types/subscription.types';

export interface DashboardLayoutItem {
    id: string;
    visible: boolean;
}

export interface UserSettings {
    language: Language;
    notificationEnabled?: boolean;
    dashboardLayout?: DashboardLayoutItem[];
}
