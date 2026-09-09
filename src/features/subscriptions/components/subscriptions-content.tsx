"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Plus, Search, AlertTriangle, Layers, PauseCircle, CheckCircle2, History, FolderKanban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogFooter,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogAction,
    AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { SubscriptionCard } from './subscription-card';
import { useApp } from '@/providers/app-store';
import { TRANSLATIONS } from '@/config/constants';
import { calculateDaysRemaining } from '@/features/notifications/services/notification-service';
import { formatLocalizedDate } from '@/lib/date/thai-date';
import type { Subscription, SubscriptionInput } from '@/features/subscriptions/types/subscription.types';

// Lazy-load heavyweight modals on demand
const SubscriptionModal = dynamic(
    () => import('./subscription-modal').then((mod) => mod.SubscriptionModal),
    { ssr: false }
);

const CategoryManagerModal = dynamic(
    () => import('./category-manager-modal').then((mod) => mod.CategoryManagerModal),
    { ssr: false }
);

const PaymentHistoryModal = dynamic(
    () => import('@/features/transactions/components/payment-history-modal').then((mod) => mod.PaymentHistoryModal),
    { ssr: false }
);

export const SubscriptionsContent: React.FC = () => {
    const {
        subscriptions,
        addSubscription,
        updateSubscription,
        deleteSubscription,
        toggleSubscriptionStatus,
        markSubscriptionAsPaid,
        language,
    } = useApp();
    const router = useRouter();
    const t = TRANSLATIONS[language] || TRANSLATIONS.th;

    const [search, setSearch] = useState('');
    const [tabFilter, setTabFilter] = useState<'all' | 'active' | 'paused' | 'dueSoon'>('all');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingSub, setEditingSub] = useState<Subscription | null>(null);
    const [catManagerOpen, setCatManagerOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Subscription | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [payConfirmTarget, setPayConfirmTarget] = useState<Subscription | null>(null);
    const [isPaying, setIsPaying] = useState(false);
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [historySubId, setHistorySubId] = useState<string | null>(null);

    const filteredSubs = useMemo(() => {
        return subscriptions.filter((sub) => {
            const matchesSearch = sub.name.toLowerCase().includes(search.toLowerCase()) ||
                sub.category.toLowerCase().includes(search.toLowerCase()) ||
                (sub.paymentMethod && sub.paymentMethod.toLowerCase().includes(search.toLowerCase()));

            if (!matchesSearch) return false;

            if (tabFilter === 'active') return sub.status === 'active';
            if (tabFilter === 'paused') return sub.status === 'paused';
            if (tabFilter === 'dueSoon') {
                if (sub.status !== 'active') return false;
                const days = calculateDaysRemaining(sub.nextBillingDate);
                return days >= 0 && days <= 3;
            }

            return true;
        });
    }, [subscriptions, search, tabFilter]);

    const handleOpenAdd = () => {
        setEditingSub(null);
        setModalOpen(true);
    };

    const handleOpenEdit = (sub: Subscription) => {
        setEditingSub(sub);
        setModalOpen(true);
    };

    const handleSave = async (input: SubscriptionInput) => {
        if (editingSub) {
            await updateSubscription(editingSub.id, input);
        } else {
            await addSubscription(input);
        }
    };

    const handleDeleteClick = (id: string) => {
        const target = subscriptions.find((s) => s.id === id) || null;
        setDeleteTarget(target);
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            setIsDeleting(true);
            await deleteSubscription(deleteTarget.id);
            setDeleteTarget(null);
        } catch {
            // error handled in store
        } finally {
            setIsDeleting(false);
        }
    };

    const handlePayClick = (sub: Subscription) => {
        setPayConfirmTarget(sub);
    };

    const handleConfirmPay = async () => {
        if (!payConfirmTarget) return;
        try {
            setIsPaying(true);
            await markSubscriptionAsPaid(payConfirmTarget.id);
            setPayConfirmTarget(null);
        } catch (err) {
            console.error('Failed to pay subscription:', err);
        } finally {
            setIsPaying(false);
        }
    };

    const handleViewHistory = (sub?: Subscription) => {
        if (sub) {
            router.push(`/dashboard?tab=history&subId=${encodeURIComponent(sub.id)}`);
        } else {
            router.push('/dashboard?tab=history');
        }
    };

    const urgentCount = useMemo(() => {
        return subscriptions.filter((s) => {
            if (s.status !== 'active') return false;
            const days = calculateDaysRemaining(s.nextBillingDate);
            return days >= 0 && days <= 3;
        }).length;
    }, [subscriptions]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-foreground tracking-tight">
                        {t.subscriptions.title}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {t.subscriptions.summary
                            .replace('{total}', String(subscriptions.length))
                            .replace('{active}', String(subscriptions.filter((s) => s.status === 'active').length))}
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <Button
                        variant="outline"
                        onClick={() => setCatManagerOpen(true)}
                        className="gap-1.5 text-xs font-semibold border-border"
                    >
                        <FolderKanban className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="hidden sm:inline">{t.subscriptions.manageCategories || 'จัดการหมวดหมู่'}</span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => handleViewHistory()}
                        className="gap-1.5 text-xs font-semibold border-border"
                    >
                        <History className="w-3.5 h-3.5 text-amber-500" />
                        {t.subscriptions.paymentHistory}
                    </Button>
                    <Button onClick={handleOpenAdd} className="gap-1.5 text-xs font-semibold">
                        <Plus className="w-4 h-4" /> {t.subscriptions.add}
                    </Button>
                </div>
            </div>

            {/* Search & Tabs */}
            <div className="space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder={t.subscriptions.search}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 bg-card"
                    />
                </div>

                <Tabs value={tabFilter} onValueChange={(val) => setTabFilter(val as typeof tabFilter)}>
                    <TabsList className="grid grid-cols-4 w-full h-auto p-1 bg-muted">
                        <TabsTrigger value="all" className="text-xs py-1.5 gap-1.5">
                            <Layers className="w-3.5 h-3.5" />
                            {t.subscriptions.all} ({subscriptions.length})
                        </TabsTrigger>
                        <TabsTrigger value="active" className="text-xs py-1.5 gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {t.subscriptions.active}
                        </TabsTrigger>
                        <TabsTrigger value="dueSoon" className="text-xs py-1.5 gap-1.5 text-amber-500 dark:text-amber-400">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {t.subscriptions.dueSoonCount.replace('{count}', String(urgentCount))}
                        </TabsTrigger>
                        <TabsTrigger value="paused" className="text-xs py-1.5 gap-1.5">
                            <PauseCircle className="w-3.5 h-3.5" />
                            {t.subscriptions.paused}
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Subscriptions Grid / List */}
            {filteredSubs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredSubs.map((sub) => (
                        <SubscriptionCard
                            key={sub.id}
                            subscription={sub}
                            language={language}
                            onEdit={handleOpenEdit}
                            onDelete={handleDeleteClick}
                            onToggleStatus={toggleSubscriptionStatus}
                            onMarkAsPaid={handlePayClick}
                            onViewHistory={handleViewHistory}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 px-4 border border-dashed rounded-xl bg-card/50">
                    <p className="text-muted-foreground text-sm">{t.subscriptions.noResults}</p>
                    <Button variant="outline" size="sm" onClick={handleOpenAdd} className="mt-4 gap-2">
                        <Plus className="w-4 h-4" /> {t.subscriptions.add}
                    </Button>
                </div>
            )}

            {/* Add / Edit Modal (Lazy loaded) */}
            <SubscriptionModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
                subscription={editingSub}
                language={language}
            />

            {/* Custom Category Manager Modal (Lazy loaded) */}
            <CategoryManagerModal
                isOpen={catManagerOpen}
                onClose={() => setCatManagerOpen(false)}
                language={language}
            />

            {/* Payment History / Snapshot Modal (Lazy loaded) */}
            <PaymentHistoryModal
                isOpen={historyModalOpen}
                onClose={() => {
                    setHistoryModalOpen(false);
                    setHistorySubId(null);
                }}
                subscriptionId={historySubId}
                language={language}
            />

            {/* Mark As Paid Confirmation Alert Dialog */}
            <AlertDialog open={!!payConfirmTarget} onOpenChange={(open) => !open && !isPaying && setPayConfirmTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-5 h-5" />
                            {t.subscriptions.confirmPayTitle}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {t.subscriptions.confirmPayDesc
                                .replace('{name}', payConfirmTarget?.name || '')
                                .replace('{amount}', (payConfirmTarget?.price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 }))
                                .replace('{date}', formatLocalizedDate(payConfirmTarget?.nextBillingDate, language, 'medium'))}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPaying}>
                            {t.modals.cancel}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmPay}
                            disabled={isPaying}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                        >
                            {isPaying ? '...' : t.subscriptions.confirmPayAction}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Confirmation Alert Dialog */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !isDeleting && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t.subscriptions.deleteDialogTitle}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t.subscriptions.deleteDialogDesc.replace('{name}', deleteTarget?.name || '')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>
                            {t.subscriptions.deleteDialogCancel}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? '...' : t.subscriptions.deleteDialogConfirm}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

