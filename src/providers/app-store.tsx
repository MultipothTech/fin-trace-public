"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/providers/auth-provider';
import type { Subscription, SubscriptionInput, Language, CategoryItem, CategoryInput, TagItem, TagInput, ProjectItem, ProjectInput } from '@/features/subscriptions/types/subscription.types';
import type { UserSettings } from '@/features/settings/types/settings.types';
import type { Transaction, TransactionInput } from '@/features/transactions/types/transaction.types';
import {
    getSubscriptions,
    createSubscription as apiCreateSub,
    updateSubscription as apiUpdateSub,
    deleteSubscription as apiDeleteSub,
} from '@/features/subscriptions/server/api/subscriptions-api';
import {
    getCategories,
    createCategory as apiCreateCat,
    updateCategory as apiUpdateCat,
    deleteCategory as apiDeleteCat,
} from '@/features/categories/server/api/categories-api';
import {
    getTags,
    createTag as apiCreateTag,
    updateTag as apiUpdateTag,
    deleteTag as apiDeleteTag,
} from '@/features/tags/server/api/tags-api';
import {
    getProjects,
    createProject as apiCreateProject,
    updateProject as apiUpdateProject,
    deleteProject as apiDeleteProject,
} from '@/features/projects/server/api/projects-api';
import {
    getTransactions,
    createTransaction as apiCreateTx,
    deleteTransaction as apiDeleteTx,
} from '@/features/transactions/server/api/transactions-api';
import { getUserSettings, saveUserSettings } from '@/features/settings/server/api/settings-api';
import { checkAndTrigger3DayAlerts, calculateDaysRemaining } from '@/features/notifications/services/notification-service';
import { advanceNextBillingDate } from '@/features/subscriptions/utils/billing-calculator';

interface AppContextType {
    subscriptions: Subscription[];
    urgentSubscriptions: Subscription[];
    categories: CategoryItem[];
    tags: TagItem[];
    projects: ProjectItem[];
    transactions: Transaction[];
    monthlyTotal: number;
    yearlyTotal: number;
    activeCount: number;
    settings: UserSettings;
    addSubscription: (input: SubscriptionInput) => Promise<void>;
    updateSubscription: (id: string, input: Partial<SubscriptionInput>) => Promise<void>;
    deleteSubscription: (id: string) => Promise<void>;
    toggleSubscriptionStatus: (id: string) => Promise<void>;
    markSubscriptionAsPaid: (subscriptionId: string, customDate?: string) => Promise<Transaction>;
    deleteTransaction: (id: string) => Promise<void>;
    addCategory: (input: CategoryInput) => Promise<CategoryItem>;
    updateCategory: (id: string, input: Partial<CategoryInput>) => Promise<CategoryItem>;
    deleteCategory: (id: string) => Promise<void>;
    addTag: (input: TagInput) => Promise<TagItem>;
    updateTag: (id: string, input: Partial<TagInput>) => Promise<TagItem>;
    deleteTag: (id: string) => Promise<void>;
    addProject: (input: ProjectInput) => Promise<ProjectItem>;
    updateProject: (id: string, input: Partial<ProjectInput>) => Promise<ProjectItem>;
    deleteProject: (id: string) => Promise<void>;
    updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
    language: Language;
    setLanguage: (lang: Language) => void;
    loading: boolean;
    refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType>({} as AppContextType);

const DEFAULT_SETTINGS: UserSettings = {
    language: 'th',
    notificationEnabled: true,
    dashboardLayout: [
        { id: 'urgent_banner', visible: true },
        { id: 'stat_cards', visible: true },
        { id: 'upcoming_renewals', visible: true },
        { id: 'category_breakdown', visible: true },
    ],
};

/**
 * Global App State Provider for Subscriptions & Alerts
 */
export const AppProvider = ({ children }: { children: React.ReactNode }) => {
    const { user, isLoading: authLoading } = useAuth();
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [tags, setTags] = useState<TagItem[]>([]);
    const [projects, setProjects] = useState<ProjectItem[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(false);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [subs, sets, cats, tagList, projectList, txs] = await Promise.all([
                getSubscriptions().catch(() => []),
                getUserSettings().catch(() => DEFAULT_SETTINGS),
                getCategories().catch(() => []),
                getTags().catch(() => []),
                getProjects().catch(() => []),
                getTransactions().catch(() => []),
            ]);
            setSubscriptions(subs);
            setCategories(cats);
            setTags(tagList);
            setProjects(projectList);
            setTransactions(txs);
            const merged = { ...DEFAULT_SETTINGS, ...sets };
            setSettings(merged);

            if (merged.notificationEnabled !== false) {
                const lang = (merged.language === 'en' ? 'en' : 'th') as Language;
                checkAndTrigger3DayAlerts(subs, lang);
            }
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Initial Data Load เมื่อผู้ใช้ Authenticated
    useEffect(() => {
        if (user) {
            fetchData();
        } else if (!authLoading && !user) {
            setSubscriptions([]);
            setCategories([]);
            setTags([]);
            setProjects([]);
            setTransactions([]);
            setSettings(DEFAULT_SETTINGS);
            setLoading(false);
        }
    }, [user, authLoading, fetchData]);

    // Language HTML Tag Sync
    useEffect(() => {
        if (typeof document !== 'undefined') {
            document.documentElement.lang = settings.language || 'th';
        }
    }, [settings.language]);

    // คำนวณสรุปยอดรายเดือน/ปี และรายการบิลที่ใกล้ถึงใน 3 วัน
    const { monthlyTotal, yearlyTotal, activeCount, urgentSubscriptions } = useMemo(() => {
        let monthly = 0;
        let active = 0;
        const urgent: Subscription[] = [];

        subscriptions.forEach((sub) => {
            if (sub.status === 'active') {
                active++;
                let norm = sub.price;
                if (sub.billingCycle === 'yearly') norm = sub.price / 12;
                else if (sub.billingCycle === 'half_yearly') norm = sub.price / 6;
                else if (sub.billingCycle === 'quarterly') norm = sub.price / 3;
                else if (sub.billingCycle === 'weekly') norm = sub.price * 4.33;
                else if (sub.billingCycle === 'daily') norm = (sub.price / (sub.customIntervalDays || 1)) * 30.416;

                monthly += norm;

                const days = calculateDaysRemaining(sub.nextBillingDate);
                if (days >= 0 && days <= 3) {
                    urgent.push(sub);
                }
            }
        });

        return {
            monthlyTotal: Math.round(monthly),
            yearlyTotal: Math.round(monthly * 12),
            activeCount: active,
            urgentSubscriptions: urgent,
        };
    }, [subscriptions]);

    const addSubscription = async (input: SubscriptionInput) => {
        try {
            const created = await apiCreateSub(input);
            setSubscriptions((prev) => [...prev, created].sort((a, b) => a.nextBillingDate.localeCompare(b.nextBillingDate)));
        } catch (err) {
            console.error('Failed to add subscription:', err);
            throw err;
        }
    };

    const updateSubscription = async (id: string, input: Partial<SubscriptionInput>) => {
        const original = [...subscriptions];
        setSubscriptions((prev) =>
            prev.map((s) => (s.id === id ? ({ ...s, ...input } as Subscription) : s))
        );

        try {
            const updated = await apiUpdateSub(id, input);
            setSubscriptions((prev) =>
                prev.map((s) => (s.id === id ? updated : s)).sort((a, b) => a.nextBillingDate.localeCompare(b.nextBillingDate))
            );
        } catch (err) {
            setSubscriptions(original);
            console.error('Failed to update subscription:', err);
            throw err;
        }
    };

    const deleteSubscription = async (id: string) => {
        try {
            await apiDeleteSub(id);
            setSubscriptions((prev) => prev.filter((s) => s.id !== id));
        } catch (err) {
            console.error('Failed to delete subscription:', err);
            throw err;
        }
    };

    const toggleSubscriptionStatus = async (id: string) => {
        const target = subscriptions.find((s) => s.id === id);
        if (!target) return;
        const newStatus = target.status === 'active' ? 'paused' : 'active';
        await updateSubscription(id, { status: newStatus });
    };

    const markSubscriptionAsPaid = async (subscriptionId: string, customDate?: string): Promise<Transaction> => {
        const sub = subscriptions.find((s) => s.id === subscriptionId);
        if (!sub) throw new Error('Subscription not found');

        const todayStr = new Date().toISOString().split('T')[0];
        const paymentDate = customDate || todayStr;
        const billingCycleDate = sub.nextBillingDate || todayStr;
        const isTh = (settings.language || 'th') === 'th';
        const subName = sub.name || (isTh ? 'แพ็กเกจ' : 'Subscription');
        const desc = isTh
            ? `ชำระค่าบริการ ${subName} (รอบ ${billingCycleDate})`
            : `Paid ${subName} (Cycle ${billingCycleDate})`;

        const safeAmount = typeof sub.price === 'number' && !isNaN(sub.price) ? Math.max(0, sub.price) : 0;

        const txInput: TransactionInput = {
            subscriptionId: sub.id,
            amount: safeAmount,
            type: 'expense',
            category: sub.category || 'other',
            categoryId: sub.categoryId || null,
            tagId: sub.tagId || sub.tagIds?.[0] || null,
            tagIds: sub.tagIds?.length ? sub.tagIds : sub.tagId ? [sub.tagId] : [],
            projectIds: sub.projectIds || [],
            transactionDate: paymentDate,
            description: desc,
            paymentChannel: sub.paymentMethod || 'Credit Card',
            billingCycleDate: billingCycleDate,
        };

        try {
            // 1. บันทึกประวัติ Transaction Snapshot
            const createdTx = await apiCreateTx(txInput);
            setTransactions((prev) => [createdTx, ...prev]);

            // 2. คำนวณและเลื่อนวันตัดรอบบิลถัดไปไปข้างหน้า 1 รอบ
            const nextDate = advanceNextBillingDate(billingCycleDate, sub.billingCycle || 'monthly', sub.customIntervalDays || 1);
            await updateSubscription(sub.id, { nextBillingDate: nextDate });

            return createdTx;
        } catch (err) {
            console.error('Failed to mark subscription as paid:', err);
            throw err;
        }
    };

    const deleteTransaction = async (id: string): Promise<void> => {
        try {
            await apiDeleteTx(id);
            setTransactions((prev) => prev.filter((tx) => tx.id !== id));
        } catch (err) {
            console.error('Failed to delete transaction:', err);
            throw err;
        }
    };

    const addCategory = async (input: CategoryInput): Promise<CategoryItem> => {
        try {
            const created = await apiCreateCat(input);
            setCategories((prev) => [...prev, created]);
            return created;
        } catch (err) {
            console.error('Failed to add category:', err);
            throw err;
        }
    };

    const updateCategory = async (id: string, input: Partial<CategoryInput>): Promise<CategoryItem> => {
        const original = [...categories];
        try {
            const updated = await apiUpdateCat(id, input);
            setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
            return updated;
        } catch (err) {
            setCategories(original);
            console.error('Failed to update category:', err);
            throw err;
        }
    };

    const deleteCategory = async (id: string): Promise<void> => {
        try {
            await apiDeleteCat(id);
            setCategories((prev) => prev.filter((c) => c.id !== id));
            setSubscriptions((prev) =>
                prev.map((s) =>
                    s.categoryId === id
                        ? { ...s, categoryId: null, category: 'other' }
                        : s
                )
            );
            setTransactions((prev) =>
                prev.map((tx) =>
                    tx.categoryId === id ? { ...tx, categoryId: null, category: 'other' } : tx
                )
            );
        } catch (err) {
            console.error('Failed to delete category:', err);
            throw err;
        }
    };

    const addTag = async (input: TagInput): Promise<TagItem> => {
        try {
            const created = await apiCreateTag(input);
            setTags((prev) => (prev.some((t) => t.id === created.id) ? prev : [...prev, created]));
            return created;
        } catch (err) {
            console.error('Failed to add tag:', err);
            throw err;
        }
    };

    const updateTag = async (id: string, input: Partial<TagInput>): Promise<TagItem> => {
        const original = [...tags];
        try {
            const updated = await apiUpdateTag(id, input);
            setTags((prev) => prev.map((t) => (t.id === id ? updated : t)));
            return updated;
        } catch (err) {
            setTags(original);
            console.error('Failed to update tag:', err);
            throw err;
        }
    };

    const deleteTag = async (id: string): Promise<void> => {
        try {
            await apiDeleteTag(id);
            setTags((prev) => prev.filter((t) => t.id !== id));
            setSubscriptions((prev) =>
                prev.map((s) => {
                    const nextIds = (s.tagIds || (s.tagId ? [s.tagId] : [])).filter((tid) => tid !== id);
                    return {
                        ...s,
                        tagIds: nextIds,
                        tagId: nextIds[0] || null,
                    };
                })
            );
            setTransactions((prev) =>
                prev.map((tx) => {
                    const nextIds = (tx.tagIds || (tx.tagId ? [tx.tagId] : [])).filter((tid) => tid !== id);
                    return {
                        ...tx,
                        tagIds: nextIds,
                        tagId: nextIds[0] || null,
                    };
                })
            );
        } catch (err) {
            console.error('Failed to delete tag:', err);
            throw err;
        }
    };

    const addProject = async (input: ProjectInput): Promise<ProjectItem> => {
        try {
            const created = await apiCreateProject(input);
            setProjects((prev) => (prev.some((p) => p.id === created.id) ? prev : [...prev, created]));
            return created;
        } catch (err) {
            console.error('Failed to add project:', err);
            throw err;
        }
    };

    const updateProject = async (id: string, input: Partial<ProjectInput>): Promise<ProjectItem> => {
        const original = [...projects];
        try {
            const updated = await apiUpdateProject(id, input);
            setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
            return updated;
        } catch (err) {
            setProjects(original);
            console.error('Failed to update project:', err);
            throw err;
        }
    };

    const deleteProject = async (id: string): Promise<void> => {
        try {
            await apiDeleteProject(id);
            setProjects((prev) => prev.filter((p) => p.id !== id));
            setSubscriptions((prev) =>
                prev.map((s) => ({
                    ...s,
                    projectIds: (s.projectIds || []).filter((pid) => pid !== id),
                }))
            );
            setTransactions((prev) =>
                prev.map((tx) => ({
                    ...tx,
                    projectIds: (tx.projectIds || []).filter((pid) => pid !== id),
                }))
            );
        } catch (err) {
            console.error('Failed to delete project:', err);
            throw err;
        }
    };

    const updateSettings = async (newSettings: Partial<UserSettings>) => {
        try {
            const updated: UserSettings = { ...settings, ...newSettings };
            setSettings(updated);
            await saveUserSettings(updated);
        } catch (err) {
            console.error('Failed to update settings:', err);
        }
    };

    const setLanguage = (lang: Language) => {
        updateSettings({ language: lang });
    };

    return (
        <AppContext.Provider
            value={{
                subscriptions,
                urgentSubscriptions,
                categories,
                tags,
                projects,
                transactions,
                monthlyTotal,
                yearlyTotal,
                activeCount,
                settings,
                addSubscription,
                updateSubscription,
                deleteSubscription,
                toggleSubscriptionStatus,
                markSubscriptionAsPaid,
                deleteTransaction,
                addCategory,
                updateCategory,
                deleteCategory,
                addTag,
                updateTag,
                deleteTag,
                addProject,
                updateProject,
                deleteProject,
                updateSettings,
                language: (settings.language as Language) || 'th',
                setLanguage,
                loading,
                refreshData: fetchData,
            }}
        >
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => useContext(AppContext);
