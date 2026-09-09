"use client";

import React, { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { AppProvider } from '@/providers/app-store';
import { MainLayout } from '@/components/layout/main-layout';
import { LoadingSkeleton } from '@/components/feedback/loading-skeleton';
import { LazyOverviewPage } from '@/features/overview/lazy';
import { LazySubscriptionsPage } from '@/features/subscriptions/lazy';
import { LazyCalendarPage } from '@/features/calendar/lazy';
import { LazyHistoryPage } from '@/features/transactions/lazy';
import { LazySettingsPage } from '@/features/settings/lazy';

function DashboardContent() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentTab = searchParams.get('tab') || 'overview';
    const subId = searchParams.get('subId') || undefined;

    const setView = (tab: string) => router.push(`/dashboard?tab=${tab}`);

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/');
        }
    }, [isLoading, user, router]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
                <LoadingSkeleton className="min-h-screen" text="Loading Dashboard..." />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-foreground overflow-hidden">
            <div
                className="fixed inset-0 z-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05] text-foreground"
                style={{
                    backgroundImage:
                        'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                }}
            />

            <MainLayout user={user} view={currentTab} setView={setView}>
                <Suspense fallback={<LoadingSkeleton className="min-h-[300px]" />}>
                    {currentTab === 'overview' && <LazyOverviewPage setView={setView} user={user} />}
                    {currentTab === 'subscriptions' && <LazySubscriptionsPage />}
                    {currentTab === 'calendar' && <LazyCalendarPage />}
                    {(currentTab === 'history' || currentTab === 'transactions') && (
                        <LazyHistoryPage setView={setView} initialSubId={subId} />
                    )}
                    {currentTab === 'settings' && <LazySettingsPage user={user} />}
                </Suspense>
            </MainLayout>
        </div>
    );
}

export default function Dashboard() {
    return (
        <AppProvider>
            <Suspense fallback={<LoadingSkeleton className="min-h-screen" />}>
                <DashboardContent />
            </Suspense>
        </AppProvider>
    );
}
