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

export interface TagItem {
    id: string;
    nameEn: string;
    nameTh: string;
    color?: string;
    bg?: string;
    createdAt?: string;
}

export interface TagInput {
    nameEn: string;
    nameTh: string;
    color?: string;
    bg?: string;
}

export interface ProjectItem {
    id: string;
    nameEn: string;
    nameTh: string;
    color?: string;
    bg?: string;
    createdAt?: string;
}

export interface ProjectInput {
    nameEn: string;
    nameTh: string;
    color?: string;
    bg?: string;
}

export interface Subscription {
    id: string;
    userId?: string;
    name: string;
    price: number;
    currency: string;
    billingCycle: BillingCycle;
    customIntervalDays?: number;
    startDate: string; // YYYY-MM-DD
    nextBillingDate: string; // YYYY-MM-DD
    /** category key (resolved) for UI helpers */
    category: string;
    categoryId?: string | null;
    /** @deprecated use tagIds — kept for backward compat (first tag) */
    tagId?: string | null;
    tagIds?: string[];
    projectIds?: string[];
    paymentMethod: string;
    reminderDays: number;
    status: SubscriptionStatus;
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
    category?: string;
    categoryId?: string | null;
    /** @deprecated use tagIds */
    tagId?: string | null;
    tagIds?: string[];
    projectIds?: string[];
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
