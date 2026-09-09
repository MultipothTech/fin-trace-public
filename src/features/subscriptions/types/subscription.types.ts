export type BillingCycle = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';
export type Language = 'th' | 'en';

export interface CategoryItem {
    id?: string;
    key: string;
    label_en: string;
    label_th: string;
    icon?: string;
    color?: string;
    bg?: string;
    isSystem?: boolean;
}

export interface Subscription {
    id: string;
    userId?: string;
    name: string;
    price: number;
    currency: string;
    billingCycle: BillingCycle;
    customIntervalDays?: number; // สำหรับรอบชำระรายวัน (กำหนดจำนวนวัน เช่น ทุกๆ 1 วัน, ทุก 15 วัน)
    startDate: string; // YYYY-MM-DD
    nextBillingDate: string; // YYYY-MM-DD
    category: string;
    paymentMethod: string;
    reminderDays: number; // default 3
    status: SubscriptionStatus;
    icon?: string;
    color?: string;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface SubscriptionInput {
    name: string;
    price: number;
    currency?: string;
    billingCycle: BillingCycle;
    customIntervalDays?: number;
    startDate?: string;
    nextBillingDate?: string;
    category: string;
    paymentMethod?: string;
    reminderDays?: number;
    status?: SubscriptionStatus;
    notes?: string;
}

export interface CategoryInput {
    key: string;
    nameEn: string;
    nameTh: string;
    icon?: string;
    color?: string;
    bg?: string;
}

export interface SubscriptionOverviewStats {
    monthlyTotal: number;
    yearlyTotal: number;
    activeCount: number;
    urgentCount: number;
    urgentSubscriptions: Subscription[];
    categoryBreakdown: Record<string, number>;
}
