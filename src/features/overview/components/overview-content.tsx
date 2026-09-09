"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import {
    CreditCard,
    Calendar,
    Plus,
    PieChart,
    Sparkles,
    ArrowUpRight,
    SlidersHorizontal,
    ArrowUp,
    ArrowDown,
    EyeOff,
    Check,
    RotateCcw,
    BellRing,
    LayoutDashboard,
    History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { UrgentAlertBanner } from './urgent-alert-banner';
import { TagExpensePie, buildTagExpenseSlices, buildLabeledExpenseSlices } from './tag-expense-pie';
import { useApp } from '@/providers/app-store';
import { TRANSLATIONS } from '@/config/constants';
import { calculateDaysRemaining } from '@/features/notifications/services/notification-service';
import { resolveCategory } from '@/features/subscriptions/utils/category-helper';
import { formatLocalizedDate, localizeDatesInText } from '@/lib/date/thai-date';
import type { SubscriptionInput } from '@/features/subscriptions/types/subscription.types';
import type { DashboardLayoutItem } from '@/features/settings/types/settings.types';

// Lazy-load modal and banner
const SubscriptionModal = dynamic(
    () => import('@/features/subscriptions/components/subscription-modal').then((mod) => mod.SubscriptionModal),
    { ssr: false }
);

const PwaInstallBanner = dynamic(
    () => import('@/components/pwa/pwa-install-banner').then((mod) => mod.PwaInstallBanner),
    { ssr: false }
);

export interface OverviewContentProps {
    setView?: (view: string) => void;
    user?: {
        id?: string;
        name?: string | null;
        email?: string | null;
    } | null;
}

const DEFAULT_LAYOUT: DashboardLayoutItem[] = [
    { id: 'urgent_banner', visible: true },
    { id: 'stat_cards', visible: true },
    { id: 'upcoming_renewals', visible: true },
    { id: 'category_breakdown', visible: true },
    { id: 'recent_history', visible: true },
];

const WIDGET_METAS: Record<string, {
    titleTh: string;
    titleEn: string;
    descTh: string;
    descEn: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
}> = {
    urgent_banner: {
        titleTh: 'ป้ายเตือนบิลเร่งด่วน 3 วัน',
        titleEn: '3-Day Urgent Bill Alert Banner',
        descTh: 'แบนเนอร์แจ้งเตือนบิลที่ใกล้จะถึงกำหนดชำระใน 3 วัน',
        descEn: 'Banner showing bills due within 3 days',
        icon: BellRing,
        color: 'text-amber-500 bg-amber-500/10',
    },
    stat_cards: {
        titleTh: 'การ์ดสรุปยอดภาพรวม',
        titleEn: 'Summary Stat Cards',
        descTh: 'สรุปยอดจ่ายรายเดือน, รายปี, จำนวนบริการ และบิลเร่งด่วน',
        descEn: 'Monthly spend, yearly estimate, active subs, due count',
        icon: CreditCard,
        color: 'text-primary bg-primary/10',
    },
    upcoming_renewals: {
        titleTh: 'รายการรอบบิลเร็วๆ นี้',
        titleEn: 'Upcoming Renewals Timeline',
        descTh: 'รายการบิล 5 รายการที่ใกล้ถึงกำหนดชำระมากที่สุด',
        descEn: 'Timeline list of next upcoming subscription bills',
        icon: Calendar,
        color: 'text-purple-400 bg-purple-500/10',
    },
    category_breakdown: {
        titleTh: 'สัดส่วนตามหมวดหมู่ / แท็ก',
        titleEn: 'Category & Tag Breakdown',
        descTh: 'กราฟแสดงสัดส่วนค่าใช้จ่ายแยกตามหมวดหมู่และแท็ก',
        descEn: 'Expense distribution by category and tag',
        icon: PieChart,
        color: 'text-emerald-400 bg-emerald-500/10',
    },
    recent_history: {
        titleTh: 'ประวัติการชำระเงินล่าสุด (Snapshot)',
        titleEn: 'Recent Payment Snapshots',
        descTh: 'แสดงรายการประวัติบิลที่ชำระไปล่าสุด พร้อมยอดเงินและวันที่',
        descEn: 'Show recently paid subscription transaction snapshots',
        icon: History,
        color: 'text-amber-500 bg-amber-500/10',
    },
};

export const OverviewContent: React.FC<OverviewContentProps> = ({ setView = () => {}, user }) => {
    const {
        subscriptions,
        urgentSubscriptions,
        categories,
        tags,
        projects,
        transactions,
        monthlyTotal,
        yearlyTotal,
        activeCount,
        addSubscription,
        language,
        settings,
        updateSettings,
    } = useApp();
    const t = TRANSLATIONS[language] || TRANSLATIONS.th;
    const [modalOpen, setModalOpen] = useState(false);
    const [isEditingLayout, setIsEditingLayout] = useState(false);

    const displayName = user?.name || 'User';

    const currentLayout = settings.dashboardLayout && settings.dashboardLayout.length > 0
        ? settings.dashboardLayout
        : DEFAULT_LAYOUT;

    // Group upcoming subscriptions
    const upcomingRenewals = subscriptions
        .filter((s) => s.status === 'active')
        .sort((a, b) => a.nextBillingDate.localeCompare(b.nextBillingDate))
        .slice(0, 5);

    // Category distribution
    const categoryTotals: Record<string, number> = {};
    const tagMonthlyEntries: Array<{ tagId: string | null | undefined; amount: number }> = [];
    const projectMonthlyEntries: Array<{ id: string | null | undefined; amount: number }> = [];
    subscriptions.forEach((sub) => {
        if (sub.status === 'active') {
            let val = sub.price;
            if (sub.billingCycle === 'yearly') val = sub.price / 12;
            else if (sub.billingCycle === 'half_yearly') val = sub.price / 6;
            else if (sub.billingCycle === 'quarterly') val = sub.price / 3;
            else if (sub.billingCycle === 'weekly') val = sub.price * 4.33;
            else if (sub.billingCycle === 'daily') val = (sub.price / (sub.customIntervalDays || 1)) * 30.416;

            categoryTotals[sub.category] = (categoryTotals[sub.category] || 0) + val;
            const ids = sub.tagIds?.length ? sub.tagIds : sub.tagId ? [sub.tagId] : [];
            if (ids.length === 0) {
                tagMonthlyEntries.push({ tagId: null, amount: val });
            } else {
                const share = val / ids.length;
                ids.forEach((tid) => tagMonthlyEntries.push({ tagId: tid, amount: share }));
            }

            const pids = sub.projectIds || [];
            if (pids.length === 0) {
                projectMonthlyEntries.push({ id: null, amount: val });
            } else {
                const share = val / pids.length;
                pids.forEach((pid) => projectMonthlyEntries.push({ id: pid, amount: share }));
            }
        }
    });
    const tagSlices = buildTagExpenseSlices(tagMonthlyEntries, tags, language);
    const projectSlices = buildLabeledExpenseSlices(projectMonthlyEntries, projects, language);

    const handleSaveNewSub = async (input: SubscriptionInput) => {
        await addSubscription(input);
    };

    // Reordering handlers
    const visibleItems = currentLayout.filter((x) => x.visible);
    const hiddenItems = currentLayout.filter((x) => !x.visible);

    const handleMoveUp = async (id: string) => {
        const visibleIndex = visibleItems.findIndex((x) => x.id === id);
        if (visibleIndex <= 0) return;

        const prevVisibleId = visibleItems[visibleIndex - 1].id;
        const fullIdx1 = currentLayout.findIndex((x) => x.id === id);
        const fullIdx2 = currentLayout.findIndex((x) => x.id === prevVisibleId);

        const newLayout = [...currentLayout];
        const temp = newLayout[fullIdx1];
        newLayout[fullIdx1] = newLayout[fullIdx2];
        newLayout[fullIdx2] = temp;

        await updateSettings({ dashboardLayout: newLayout });
    };

    const handleMoveDown = async (id: string) => {
        const visibleIndex = visibleItems.findIndex((x) => x.id === id);
        if (visibleIndex < 0 || visibleIndex >= visibleItems.length - 1) return;

        const nextVisibleId = visibleItems[visibleIndex + 1].id;
        const fullIdx1 = currentLayout.findIndex((x) => x.id === id);
        const fullIdx2 = currentLayout.findIndex((x) => x.id === nextVisibleId);

        const newLayout = [...currentLayout];
        const temp = newLayout[fullIdx1];
        newLayout[fullIdx1] = newLayout[fullIdx2];
        newLayout[fullIdx2] = temp;

        await updateSettings({ dashboardLayout: newLayout });
    };

    const handleHideWidget = async (id: string) => {
        const newLayout = currentLayout.map((item) =>
            item.id === id ? { ...item, visible: false } : item
        );
        await updateSettings({ dashboardLayout: newLayout });
    };

    const handleShowWidget = async (id: string) => {
        const newLayout = currentLayout.map((item) =>
            item.id === id ? { ...item, visible: true } : item
        );
        await updateSettings({ dashboardLayout: newLayout });
    };

    const handleResetLayout = async () => {
        await updateSettings({ dashboardLayout: DEFAULT_LAYOUT });
    };

    // Sub-renderers for each widget ID
    const renderWidgetContent = (id: string) => {
        switch (id) {
            case 'urgent_banner':
                return (
                    <UrgentAlertBanner
                        key="urgent_banner"
                        urgentSubscriptions={urgentSubscriptions}
                        language={language}
                        onViewAll={() => setView('subscriptions')}
                    />
                );

            case 'stat_cards':
                return (
                    <div key="stat_cards" className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {/* Monthly Spend */}
                        <Card className="p-4 bg-card border-border shadow-sm">
                            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                                <CreditCard className="w-3.5 h-3.5 text-primary" /> {t.overview.monthlySpend}
                            </p>
                            <div className="mt-2 flex items-baseline gap-1">
                                <span className="text-2xl font-bold tracking-tight text-foreground">
                                    ฿{monthlyTotal.toLocaleString()}
                                </span>
                                <span className="text-xs text-muted-foreground">/mo</span>
                            </div>
                        </Card>

                        {/* Yearly Projected */}
                        <Card className="p-4 bg-card border-border shadow-sm">
                            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-purple-400" /> {t.overview.yearlyEstimate}
                            </p>
                            <div className="mt-2 flex items-baseline gap-1">
                                <span className="text-2xl font-bold tracking-tight text-foreground">
                                    ฿{yearlyTotal.toLocaleString()}
                                </span>
                                <span className="text-xs text-muted-foreground">/yr</span>
                            </div>
                        </Card>

                        {/* Active Subscriptions */}
                        <Card className="p-4 bg-card border-border shadow-sm">
                            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> {t.overview.activeSubs}
                            </p>
                            <div className="mt-2 flex items-baseline gap-1">
                                <span className="text-2xl font-bold tracking-tight text-foreground">
                                    {activeCount}
                                </span>
                                <span className="text-xs text-muted-foreground">{t.overview.plansUnit}</span>
                            </div>
                        </Card>

                        {/* Bills Due in 3 Days */}
                        <Card className={`p-4 border shadow-sm ${urgentSubscriptions.length > 0 ? 'bg-amber-500/10 border-amber-500/40' : 'bg-card border-border'}`}>
                            <p className="text-xs font-medium flex items-center gap-1.5 text-amber-500">
                                {t.overview.urgentAlerts}
                            </p>
                            <div className="mt-2 flex items-baseline gap-1">
                                <span className="text-2xl font-bold tracking-tight text-foreground">
                                    {urgentSubscriptions.length}
                                </span>
                                <span className="text-xs text-muted-foreground">{t.overview.billsUnit}</span>
                            </div>
                        </Card>
                    </div>
                );

            case 'upcoming_renewals':
                return (
                    <Card key="upcoming_renewals" className="p-4 bg-card border-border shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between pb-3 border-b border-border">
                                <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-primary" />
                                    {t.overview.upcomingThisWeek}
                                </h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setView('subscriptions')}
                                    className="text-xs h-7 gap-1"
                                >
                                    {t.overview.viewAll} <ArrowUpRight className="w-3 h-3" />
                                </Button>
                            </div>

                            {upcomingRenewals.length > 0 ? (
                                <div className="space-y-3 pt-3">
                                    {upcomingRenewals.map((sub) => {
                                        const { Icon: IconComp, color: catColor, bg: catBg } = resolveCategory(sub.category, categories, language);
                                        const days = calculateDaysRemaining(sub.nextBillingDate);
                                        const isUrgent = days >= 0 && days <= 3;

                                        return (
                                            <div
                                                key={sub.id}
                                                className="flex items-center justify-between p-2.5 rounded-lg border border-border/70 hover:bg-muted/30 transition-colors"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`p-2 rounded-lg ${catBg} ${catColor} shrink-0`}>
                                                        <IconComp className="w-4 h-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-sm text-foreground truncate">
                                                            {sub.name}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {formatLocalizedDate(sub.nextBillingDate, language, 'medium')}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="text-right shrink-0">
                                                    <p className="font-bold text-sm text-foreground">
                                                        ฿{sub.price.toLocaleString()}
                                                    </p>
                                                    <span
                                                        className={`text-[10px] font-medium ${
                                                            isUrgent
                                                                ? 'text-amber-500 font-bold'
                                                                : 'text-muted-foreground'
                                                        }`}
                                                    >
                                                        {days === 0
                                                            ? t.overview.dueToday
                                                            : days === 1
                                                            ? t.overview.dueTomorrow
                                                            : t.overview.dueInDays.replace('{days}', String(days))}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-xs text-muted-foreground">
                                    {t.overview.noSubscriptions}
                                </div>
                            )}
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setView('calendar')}
                            className="w-full mt-4 text-xs"
                        >
                            {t.overview.viewCalendar}
                        </Button>
                    </Card>
                );

            case 'category_breakdown':
                return (
                    <Card key="category_breakdown" className="p-4 bg-card border-border shadow-sm">
                        <div className="flex items-center justify-between pb-3 border-b border-border">
                            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                                <PieChart className="w-4 h-4 text-primary" />
                                {t.overview.categoryBreakdown}
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-3">
                            {/* Category bars */}
                            <div className="space-y-3.5 lg:col-span-2">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {language === 'th' ? 'หมวดหมู่' : 'Categories'}
                                </p>
                                {Object.entries(categoryTotals).length > 0 ? (
                                    Object.entries(categoryTotals).map(([catKey, total]) => {
                                        const { label: catLabel, Icon: IconComp, color: catColor } = resolveCategory(catKey, categories, language);
                                        const percentage = monthlyTotal > 0 ? Math.round((total / monthlyTotal) * 100) : 0;

                                        return (
                                            <div key={catKey} className="space-y-1.5">
                                                <div className="flex items-center justify-between text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <IconComp className={`w-3.5 h-3.5 ${catColor}`} />
                                                        <span className="font-medium text-foreground">
                                                            {catLabel}
                                                        </span>
                                                    </div>
                                                    <span className="text-muted-foreground">
                                                        ฿{Math.round(total).toLocaleString()} ({percentage}%)
                                                    </span>
                                                </div>
                                                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-500 bg-primary"
                                                        style={{ width: `${Math.min(percentage, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-8 text-xs text-muted-foreground">
                                        {t.overview.noSubscriptions}
                                    </div>
                                )}
                            </div>

                            {/* Tag pie */}
                            <div className="space-y-2 border-t border-border pt-4">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {t.overview.tagBreakdown}
                                </p>
                                <TagExpensePie
                                    slices={tagSlices}
                                    monthlyTotal={monthlyTotal}
                                    language={language}
                                />
                            </div>

                            {/* Project pie */}
                            <div className="space-y-2 border-t border-border pt-4">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {t.overview.projectBreakdown}
                                </p>
                                <TagExpensePie
                                    slices={projectSlices}
                                    monthlyTotal={monthlyTotal}
                                    language={language}
                                />
                            </div>
                        </div>
                    </Card>
                );

            case 'recent_history': {
                const sortedRecentTxs = [...transactions]
                    .sort((a, b) => (b.transactionDate || '').localeCompare(a.transactionDate || '') || (b.createdAt || '').localeCompare(a.createdAt || ''))
                    .slice(0, 4);

                return (
                    <Card key="recent_history" className="p-4 bg-card border-border shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between pb-3 border-b border-border">
                                <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                                    <History className="w-4 h-4 text-amber-500" />
                                    {language === 'th' ? 'ประวัติการชำระเงินล่าสุด (Snapshot)' : 'Recent Payment History (Snapshot)'}
                                </h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setView('history')}
                                    className="text-xs h-7 gap-1"
                                >
                                    {t.overview.viewAll} <ArrowUpRight className="w-3 h-3" />
                                </Button>
                            </div>

                            {sortedRecentTxs.length > 0 ? (
                                <div className="space-y-2.5 pt-3">
                                    {sortedRecentTxs.map((tx) => {
                                        const { Icon: IconComp, color: catColor, bg: catBg } = resolveCategory(tx.category, categories, language);

                                        return (
                                            <div
                                                key={tx.id}
                                                className="flex items-center justify-between p-2.5 rounded-lg border border-border/70 hover:bg-muted/30 transition-colors"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`p-2 rounded-lg ${catBg} ${catColor} shrink-0`}>
                                                        <IconComp className="w-4 h-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-sm text-foreground truncate">
                                                            {localizeDatesInText(
                                                                tx.description || tx.category || (language === 'th' ? 'ชำระค่าบริการ' : 'Subscription Payment'),
                                                                language
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                                                            <span>{formatLocalizedDate(tx.transactionDate, language, 'medium')}</span>
                                                            {tx.paymentChannel && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span>{tx.paymentChannel}</span>
                                                                </>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="text-right shrink-0">
                                                    <p className={`font-bold text-sm ${
                                                        tx.type !== 'income'
                                                            ? 'text-rose-600 dark:text-rose-400'
                                                            : 'text-emerald-600 dark:text-emerald-400'
                                                    }`}>
                                                        {tx.type !== 'income' ? '-' : '+'}฿{Number(tx.amount || 0).toLocaleString()}
                                                        <span className="ml-1 text-[10px] font-medium text-muted-foreground">
                                                            {(subscriptions.find((s) => s.id === tx.subscriptionId)?.currency || 'THB').toUpperCase()}
                                                        </span>
                                                    </p>
                                                    <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                                                        {language === 'th' ? 'ชำระแล้ว' : 'Paid'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-xs text-muted-foreground">
                                    {language === 'th' ? 'ยังไม่มีประวัติการชำระเงิน' : 'No payment records yet'}
                                </div>
                            )}
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setView('history')}
                            className="w-full mt-4 text-xs"
                        >
                            {language === 'th' ? 'ดูประวัติการชำระเงินทั้งหมด' : 'View All Payment Records'}
                        </Button>
                    </Card>
                );
            }

            default:
                return null;
        }
    };

    return (
        <div className={`space-y-6 animate-in fade-in duration-300 pb-12 ${isEditingLayout ? 'bg-muted/15 -m-2 p-2 sm:-m-4 sm:p-4 rounded-3xl' : ''}`}>
            {/* Top Greeting & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                        {t.overview.welcome}, {displayName} 👋
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {t.overview.subtitle}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {isEditingLayout ? (
                        <Button
                            size="sm"
                            onClick={() => setIsEditingLayout(false)}
                            className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                        >
                            <Check className="w-4 h-4" />
                            {t.overview.doneEditing}
                        </Button>
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditingLayout(true)}
                            className="gap-1.5 text-xs font-medium border-dashed hover:border-primary"
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                            {t.overview.customizeDashboard}
                        </Button>
                    )}

                    <Button onClick={() => setModalOpen(true)} className="gap-2 font-semibold shadow-md text-xs">
                        <Plus className="w-4 h-4" /> {t.overview.addQuick}
                    </Button>
                </div>
            </div>

            {/* Edit Mode Active Banner */}
            {isEditingLayout && (
                <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2.5">
                        <SlidersHorizontal className="w-4 h-4 text-primary animate-pulse shrink-0" />
                        <div>
                            <p className="text-xs font-bold text-foreground">
                                {t.overview.customizerMode}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleResetLayout}
                            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                        >
                            <RotateCcw className="w-3 h-3" />
                            {t.overview.reset}
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => setIsEditingLayout(false)}
                            className="h-7 text-xs gap-1 font-semibold"
                        >
                            <Check className="w-3 h-3" />
                            {t.overview.done}
                        </Button>
                    </div>
                </div>
            )}

            {/* PWA Install Banner */}
            {!isEditingLayout && <PwaInstallBanner />}

            {/* Dynamic Ordered Widgets */}
            <div className="space-y-6">
                {visibleItems.map((item, visibleIndex) => {
                    const meta = WIDGET_METAS[item.id];
                    const widgetTitle = meta ? (language === 'th' ? meta.titleTh : meta.titleEn) : item.id;

                    if (!isEditingLayout) {
                        return (
                            <div key={item.id}>
                                {renderWidgetContent(item.id)}
                            </div>
                        );
                    }

                    return (
                        <div
                            key={item.id}
                            className="relative group rounded-2xl border-2 border-dashed border-primary/60 dark:border-primary/50 p-3 pt-5 bg-card/75 dark:bg-card/60 backdrop-blur-sm shadow-md transition-all animate-in fade-in"
                        >
                            {/* Top Right Floating Reorder & Hide Toolbar */}
                            <div className="absolute -top-3.5 right-4 z-30 flex items-center gap-1 bg-background/95 backdrop-blur-md border border-primary/40 shadow-lg rounded-full px-2.5 py-1">
                                <span className="text-[10px] font-bold text-primary mr-1">
                                    #{visibleIndex + 1} {widgetTitle}
                                </span>
                                <button
                                    type="button"
                                    disabled={visibleIndex === 0}
                                    onClick={() => handleMoveUp(item.id)}
                                    className="p-1 hover:text-primary hover:bg-muted rounded-full disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                                    title={t.overview.moveUp}
                                >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    disabled={visibleIndex === visibleItems.length - 1}
                                    onClick={() => handleMoveDown(item.id)}
                                    className="p-1 hover:text-primary hover:bg-muted rounded-full disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                                    title={t.overview.moveDown}
                                >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <div className="w-px h-3.5 bg-border mx-0.5" />
                                <button
                                    type="button"
                                    onClick={() => handleHideWidget(item.id)}
                                    className="p-1 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                                    title={t.overview.hide}
                                >
                                    <EyeOff className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* Render Actual Widget with slight edit mode dimming */}
                            <div className="opacity-95 pointer-events-none select-none">
                                {renderWidgetContent(item.id)}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Hidden Section (Rendered at bottom when in edit mode or when items are hidden) */}
            {isEditingLayout && hiddenItems.length > 0 && (
                <div className="pt-6 border-t-2 border-dashed border-border space-y-3 animate-in fade-in">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                        <h3 className="text-xs font-bold uppercase tracking-wider">
                            {t.overview.hiddenSection}
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {hiddenItems.map((item) => {
                            const meta = WIDGET_METAS[item.id];
                            const IconComp = meta?.icon || LayoutDashboard;

                            return (
                                <Card
                                    key={item.id}
                                    className="p-3 bg-card/60 border-2 border-dashed border-border flex items-center justify-between gap-3 shadow-sm hover:border-primary/50 transition-colors"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className={`p-2 rounded-lg ${meta?.color || 'text-primary bg-primary/10'} shrink-0`}>
                                            <IconComp className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-foreground truncate">
                                                {language === 'th' ? meta?.titleTh : meta?.titleEn}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground truncate">
                                                {language === 'th' ? meta?.descTh : meta?.descEn}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => handleShowWidget(item.id)}
                                        className="h-7 text-xs gap-1 shrink-0 font-semibold text-primary"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        {t.overview.show}
                                    </Button>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Quick Add Modal */}
            <SubscriptionModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSaveNewSub}
                language={language}
            />
        </div>
    );
};
