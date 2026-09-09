"use client";

import React from 'react';
import { LayoutDashboard, CreditCard, CalendarDays, History, Settings, LogOut, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { TRANSLATIONS } from '@/config/constants';
import { useAuth } from '@/providers/auth-provider';
import { useApp } from '@/providers/app-store';
import { NavButton } from '@/components/navigation/nav-button';
import { MobileNavButton } from '@/components/navigation/mobile-nav-button';

export interface MainLayoutUser {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
}

export interface MainLayoutProps {
    children: React.ReactNode;
    user: MainLayoutUser;
    view?: string;
    setView?: (view: string) => void;
}

/**
 * Main Layout with 5 Tabs: Overview, Subscriptions, Calendar, History, Settings
 */
export const MainLayout: React.FC<MainLayoutProps> = ({ children, user, view = 'overview', setView = () => {} }) => {
    const { language, urgentSubscriptions } = useApp();
    const { signOut } = useAuth();
    const t = TRANSLATIONS[language] || TRANSLATIONS.th;

    const avatarUrl = user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}`;
    const initials = user.name ? user.name.slice(0, 2).toUpperCase() : 'FT';

    const urgentCount = urgentSubscriptions.length;

    return (
        <div className="flex flex-col h-[100dvh] max-h-[100dvh] max-w-md mx-auto relative z-10 md:max-w-6xl md:flex-row shadow-2xl md:border-x md:border-border bg-background overflow-hidden">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex flex-col w-64 border-r border-border p-6 space-y-8">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500/20 via-zinc-100 to-zinc-50 border border-amber-500/30 text-amber-600 dark:from-amber-500/20 dark:via-zinc-800 dark:to-zinc-950 dark:border-amber-500/20 dark:text-amber-400 flex items-center justify-center shadow-lg relative shrink-0">
                        <div className="absolute inset-0 bg-amber-500/10 blur-sm rounded-xl" />
                        <BellRing className="w-4 h-4 text-amber-600 dark:text-amber-400 relative z-10 animate-pulse" />
                    </div>
                    <div>
                        <span className="font-bold text-lg tracking-tight block">FinTrace</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest block font-mono">
                            Bill Alert PWA
                        </span>
                    </div>
                </div>

                <nav className="flex-1 space-y-1.5">
                    <NavButton
                        active={view === 'overview'}
                        onClick={() => setView('overview')}
                        icon={LayoutDashboard}
                        label={t.nav.overview}
                    />

                    <div className="relative">
                        <NavButton
                            active={view === 'subscriptions'}
                            onClick={() => setView('subscriptions')}
                            icon={CreditCard}
                            label={t.nav.subscriptions}
                        />
                        {urgentCount > 0 && (
                            <Badge className="absolute right-2 top-1/2 -translate-y-1/2 bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0">
                                {urgentCount}
                            </Badge>
                        )}
                    </div>

                    <NavButton
                        active={view === 'calendar'}
                        onClick={() => setView('calendar')}
                        icon={CalendarDays}
                        label={t.nav.calendar}
                    />

                    <NavButton
                        active={view === 'history' || view === 'transactions'}
                        onClick={() => setView('history')}
                        icon={History}
                        label={t.nav.history || (language === 'th' ? 'ประวัติชำระเงิน' : 'History')}
                    />

                    <NavButton
                        active={view === 'settings'}
                        onClick={() => setView('settings')}
                        icon={Settings}
                        label={t.nav.settings}
                    />
                </nav>

                <div className="border-t border-border pt-4 space-y-3">
                    <div className="flex items-center gap-3 px-2">
                        <Avatar className="w-9 h-9 border border-border">
                            <AvatarImage src={avatarUrl} alt={user.name || 'User'} />
                            <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate leading-none mb-1">
                                {user.name || 'User'}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate leading-none">
                                {user.email}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={signOut}
                        className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-500/10 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/10"
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        {t.nav.logout}
                    </Button>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="md:hidden h-14 border-b border-border flex items-center justify-between px-4 bg-background/80 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500/20 via-zinc-100 to-zinc-50 border border-amber-500/30 text-amber-600 dark:from-amber-500/20 dark:via-zinc-800 dark:to-zinc-950 dark:border-amber-500/20 dark:text-amber-400 flex items-center justify-center shadow-md relative shrink-0">
                        <div className="absolute inset-0 bg-amber-500/10 blur-[2px] rounded-lg" />
                        <BellRing className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 relative z-10 animate-pulse" />
                    </div>
                    <span className="font-bold text-sm">FinTrace</span>
                </div>
                <div className="flex items-center gap-2">
                    {urgentCount > 0 && (
                        <Badge className="bg-amber-500 text-black text-[10px] font-bold">
                            {t.common.dueInDaysBadge.replace('{count}', String(urgentCount))}
                        </Badge>
                    )}
                    <Avatar className="w-7 h-7 border border-border">
                        <AvatarImage src={avatarUrl} alt={user.name || 'User'} />
                        <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                    </Avatar>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden relative bg-background scrollbar-hide">
                <div className="p-4 md:p-8 max-w-4xl mx-auto min-h-full pb-32 md:pb-8">
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Navigation Bar (5 tabs) */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 bg-background/98 backdrop-blur-xl border-t border-border grid grid-cols-5 px-1.5 pt-2 pb-6 sm:pb-3 shadow-[0_-4px_24px_rgba(0,0,0,0.12)] [padding-bottom:max(1.5rem,env(safe-area-inset-bottom,1.5rem))]">
                <MobileNavButton
                    active={view === 'overview'}
                    onClick={() => setView('overview')}
                    icon={LayoutDashboard}
                    label={t.nav.overview}
                />
                <MobileNavButton
                    active={view === 'subscriptions'}
                    onClick={() => setView('subscriptions')}
                    icon={CreditCard}
                    label={t.nav.subscriptions}
                    highlight={urgentCount > 0}
                />
                <MobileNavButton
                    active={view === 'calendar'}
                    onClick={() => setView('calendar')}
                    icon={CalendarDays}
                    label={t.nav.calendar}
                />
                <MobileNavButton
                    active={view === 'history' || view === 'transactions'}
                    onClick={() => setView('history')}
                    icon={History}
                    label={t.nav.history || (language === 'th' ? 'ประวัติ' : 'History')}
                />
                <MobileNavButton
                    active={view === 'settings'}
                    onClick={() => setView('settings')}
                    icon={Settings}
                    label={t.nav.settings}
                />
            </nav>
        </div>
    );
};
