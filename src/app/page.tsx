"use client";

import React, { useState, Suspense } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { AppProvider } from '@/providers/app-store';
import { MainLayout } from '@/components/layout/main-layout';
import { LoadingSkeleton } from '@/components/feedback/loading-skeleton';
import { LazyLandingPage } from '@/features/landing/lazy';
import { LazyOverviewPage } from '@/features/overview/lazy';
import { LazySubscriptionsPage } from '@/features/subscriptions/lazy';
import { LazyCalendarPage } from '@/features/calendar/lazy';
import { LazyHistoryPage } from '@/features/transactions/lazy';
import { LazySettingsPage } from '@/features/settings/lazy';

/**
 * หน้าแรกของแอปพลิเคชัน FinTrace Subscriptions & Bill Alert
 */
export default function FinanceApp() {
    return (
        <AppProvider>
            <AppContent />
        </AppProvider>
    );
}

function AppContent() {
    const { user, isLoading } = useAuth();
    const [view, setView] = useState('overview');

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
                <LoadingSkeleton className="min-h-screen" text="Loading FinTrace..." />
            </div>
        );
    }

    if (!user) {
        return <LazyLandingPage />;
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

            <MainLayout user={user} view={view} setView={setView}>
                <Suspense fallback={<LoadingSkeleton className="min-h-[300px]" />}>
                    {view === 'overview' && <LazyOverviewPage setView={setView} user={user} />}
                    {view === 'subscriptions' && <LazySubscriptionsPage />}
                    {view === 'calendar' && <LazyCalendarPage />}
                    {(view === 'history' || view === 'transactions') && <LazyHistoryPage setView={setView} />}
                    {view === 'settings' && <LazySettingsPage user={user} />}
                </Suspense>
            </MainLayout>
        </div>
    );
}