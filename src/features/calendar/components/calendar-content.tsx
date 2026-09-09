"use client";

import React, { useState, useMemo } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    Calendar as CalendarIcon,
    Clock,
    Download,
    X,
    Filter,
    ArrowUpRight,
    CheckCircle2,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { useApp } from '@/providers/app-store';
import { TRANSLATIONS } from '@/config/constants';
import { calculateDaysRemaining } from '@/features/notifications/services/notification-service';
import { resolveCategory } from '@/features/subscriptions/utils/category-helper';
import { isSubscriptionPaidForCurrentCycle } from '@/features/subscriptions/utils/billing-calculator';
import { formatLocalizedDate } from '@/lib/date/thai-date';
import type { Subscription } from '@/features/subscriptions/types/subscription.types';

// Lazy-load heavyweight export modal (29KB)
const CalendarExportModal = dynamic(
    () => import('./calendar-export-modal').then((mod) => mod.CalendarExportModal),
    { ssr: false }
);

export const CalendarContent: React.FC = () => {
    const { subscriptions, categories, transactions, language, markSubscriptionAsPaid } = useApp();
    const t = TRANSLATIONS[language] || TRANSLATIONS.th;
    const isTh = language === 'th';

    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [payConfirmTarget, setPayConfirmTarget] = useState<Subscription | null>(null);
    const [isPaying, setIsPaying] = useState(false);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-11
    const mStr = String(month + 1).padStart(2, '0');
    const monthPrefix = `${year}-${mStr}`;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 (Sun) - 6 (Sat)

    const prevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
        setSelectedDateStr(null);
    };

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
        setSelectedDateStr(null);
    };

    const setToday = () => {
        const today = new Date();
        setCurrentDate(today);
        setSelectedDateStr(today.toISOString().split('T')[0]);
    };

    const monthNames = language === 'th'
        ? ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
        : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const dayHeaders = language === 'th'
        ? ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
        : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Map subscriptions to dates
    const dateMap = useMemo(() => {
        const map: Record<string, typeof subscriptions> = {};
        subscriptions.forEach((sub) => {
            if (sub.status !== 'active') return;
            const subDate = sub.nextBillingDate;
            if (subDate) {
                if (!map[subDate]) map[subDate] = [];
                map[subDate].push(sub);
            }
        });
        return map;
    }, [subscriptions]);

    // Subscriptions within the currently selected month
    const monthSubscriptions = useMemo(() => {
        return subscriptions
            .filter((sub) => sub.status === 'active' && sub.nextBillingDate?.startsWith(monthPrefix))
            .sort((a, b) => a.nextBillingDate.localeCompare(b.nextBillingDate));
    }, [subscriptions, monthPrefix]);

    // Subscriptions for the selected date or entire month
    const displayedSubscriptions = useMemo(() => {
        if (selectedDateStr) {
            return dateMap[selectedDateStr] || [];
        }
        return monthSubscriptions;
    }, [selectedDateStr, dateMap, monthSubscriptions]);

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

    const totalDisplayedAmount = useMemo(() => {
        return displayedSubscriptions.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
    }, [displayedSubscriptions]);

    const totalMonthAmount = useMemo(() => {
        return monthSubscriptions.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
    }, [monthSubscriptions]);

    const todayStr = new Date().toISOString().split('T')[0];

    const handleDateClick = (dateStr: string) => {
        if (selectedDateStr === dateStr) {
            setSelectedDateStr(null); // Unfilter
        } else {
            setSelectedDateStr(dateStr); // Filter by this date
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500 pb-12">
            {/* Header with Navigation & Export Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-foreground tracking-tight">
                        {t.calendar.title}
                    </h2>
                    <p className="text-sm text-muted-foreground">{t.calendar.subtitle}</p>
                </div>

                <div className="flex items-center flex-wrap gap-2">
                    {/* Month Navigator */}
                    <div className="flex items-center bg-card border border-border rounded-lg p-1 shadow-sm">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-xs font-semibold min-w-[110px] text-center">
                            {monthNames[month]} {language === 'th' ? year + 543 : year}
                        </span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>

                    <Button variant="outline" size="sm" onClick={setToday} className="h-9 text-xs">
                        {t.calendar.today}
                    </Button>

                    {/* Export Report Button */}
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setExportModalOpen(true)}
                        className="h-9 text-xs font-semibold gap-1.5 shadow-sm"
                    >
                        <Download className="w-3.5 h-3.5 text-primary" />
                        {language === 'th' ? 'ส่งออก' : 'Export'}
                    </Button>
                </div>
            </div>

            {/* Calendar Grid */}
            <Card className="p-4 bg-card border-border shadow-sm">
                <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-muted-foreground pb-2 border-b border-border">
                    {dayHeaders.map((d, i) => (
                        <div key={d} className={i === 0 || i === 6 ? 'text-red-400/80' : ''}>
                            {d}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1 pt-2">
                    {/* Empty cells before 1st of month */}
                    {Array.from({ length: firstDayIndex }).map((_, i) => (
                        <div key={`empty-${i}`} className="min-h-[52px] sm:min-h-[70px] rounded-lg bg-transparent" />
                    ))}

                    {/* Days of month */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const dayNum = i + 1;
                        const dStr = String(dayNum).padStart(2, '0');
                        const fullDateStr = `${year}-${mStr}-${dStr}`;

                        const daySubs = dateMap[fullDateStr] || [];
                        const isToday = fullDateStr === todayStr;
                        const isSelected = fullDateStr === selectedDateStr;

                        const daysUntil = calculateDaysRemaining(fullDateStr);
                        const isUrgent = daysUntil >= 0 && daysUntil <= 3 && daySubs.length > 0;

                        return (
                            <button
                                key={fullDateStr}
                                type="button"
                                onClick={() => handleDateClick(fullDateStr)}
                                className={`min-h-[52px] sm:min-h-[70px] p-1 rounded-lg border text-left flex flex-col justify-between transition-all relative ${
                                    isSelected
                                        ? 'border-primary ring-2 ring-primary/30 bg-primary/10 shadow-sm'
                                        : isUrgent
                                        ? 'border-amber-500/50 bg-amber-500/10'
                                        : isToday
                                        ? 'border-border bg-accent/40 font-bold'
                                        : 'border-transparent hover:bg-muted/50'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span
                                        className={`text-xs w-5 h-5 flex items-center justify-center rounded-full ${
                                            isToday
                                                ? 'bg-primary text-primary-foreground font-bold'
                                                : isSelected
                                                ? 'bg-primary/20 text-primary font-bold'
                                                : 'text-foreground'
                                        }`}
                                    >
                                        {dayNum}
                                    </span>
                                    {isUrgent && (
                                        <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                                    )}
                                </div>

                                {daySubs.length > 0 && (
                                    <div className="space-y-0.5 mt-1 overflow-hidden w-full">
                                        {daySubs.slice(0, 2).map((sub) => {
                                            const { bg: catBg, color: catColor } = resolveCategory(sub.category, categories, language);
                                            return (
                                                <div
                                                    key={sub.id}
                                                    className={`text-[9px] sm:text-[10px] px-1 py-0.5 rounded truncate font-medium ${catBg} ${catColor}`}
                                                >
                                                    {sub.name} (฿{sub.price})
                                                </div>
                                            );
                                        })}
                                        {daySubs.length > 2 && (
                                            <span className="text-[8px] text-muted-foreground block pl-1">
                                                {t.calendar.moreItems.replace('{count}', String(daySubs.length - 2))}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </Card>

            {/* Bill List Section: Filtered by Selected Date or Full Month */}
            <Card className="p-4 bg-card border-border space-y-3 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border">
                    <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                        <CalendarIcon className="w-4 h-4 text-primary" />
                        <span>
                            {selectedDateStr ? (
                                <>
                                    {t.calendar.billsOnDate.replace('{date}', formatLocalizedDate(selectedDateStr, language, 'medium'))}
                                </>
                            ) : (
                                <>
                                    {t.calendar.billsInMonth
                                        .replace('{month}', monthNames[month])
                                        .replace('{year}', String(language === 'th' ? year + 543 : year))}
                                </>
                            )}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {selectedDateStr ? (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedDateStr(null)}
                                className="h-7 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10"
                            >
                                <X className="w-3.5 h-3.5" />
                                {t.calendar.clearFilter}
                            </Button>
                        ) : null}

                        <Badge variant="secondary" className="text-xs font-semibold">
                            {displayedSubscriptions.length} {t.calendar.billsCount} • ฿{totalDisplayedAmount.toLocaleString()}
                        </Badge>
                    </div>
                </div>

                {displayedSubscriptions.length > 0 ? (
                    <div className="space-y-2 pt-1">
                        {displayedSubscriptions.map((sub) => {
                            const { Icon: IconComp, color: catColor, bg: catBg } = resolveCategory(sub.category, categories, language);
                            const days = calculateDaysRemaining(sub.nextBillingDate);
                            const isUrgent = days >= 0 && days <= 3;
                            const isPaid = isSubscriptionPaidForCurrentCycle(sub, transactions);

                            return (
                                <div
                                    key={sub.id}
                                    className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/80 bg-background hover:bg-muted/30 transition-colors"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`p-2 rounded-lg ${catBg} ${catColor} shrink-0`}>
                                            <IconComp className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm text-foreground truncate">{sub.name}</p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {formatLocalizedDate(sub.nextBillingDate, language, 'medium')} • {sub.paymentMethod || 'Credit Card'} • {sub.billingCycle}
                                                {sub.notes ? ` • 📝 ${sub.notes}` : ''}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <div className="text-right">
                                            <p className="font-bold text-sm text-foreground">฿{Number(sub.price).toLocaleString()}</p>
                                            {isUrgent ? (
                                                <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-[10px] font-bold">
                                                    {days === 0
                                                        ? t.overview.dueToday
                                                        : days === 1
                                                        ? t.overview.dueTomorrow
                                                        : t.overview.dueInDays.replace('{days}', String(days))}
                                                </Badge>
                                            ) : (
                                                <span className="text-[10px] text-muted-foreground flex items-center justify-end gap-1">
                                                    <Clock className="w-3 h-3" /> {t.subscriptions.inDays.replace('{days}', String(days))}
                                                </span>
                                            )}
                                        </div>

                                        {sub.status === 'active' && (
                                            isPaid ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled
                                                    title={t.subscriptions.paidForCycleTitle || (isTh ? 'ชำระในรอบนี้แล้ว (ลบประวัติในหน้าประวัติเพื่อยกเลิก)' : 'Paid for this cycle')}
                                                    className="h-8 px-2 text-xs gap-1 font-medium text-muted-foreground bg-muted/60 border-border/70 opacity-75 cursor-not-allowed shadow-none"
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
                                                    <span className="hidden sm:inline">{t.subscriptions.paidForCycle || (isTh ? 'ชำระแล้ว' : 'Paid')}</span>
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handlePayClick(sub)}
                                                    title={t.subscriptions.markAsPaid}
                                                    className="h-8 px-2 text-xs gap-1 font-medium text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all shadow-xs"
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    <span className="hidden sm:inline">{t.subscriptions.markAsPaidQuick}</span>
                                                </Button>
                                            )
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8 text-xs text-muted-foreground">
                        {selectedDateStr ? (
                            <p>{t.calendar.noBillsOnDate.replace('{date}', formatLocalizedDate(selectedDateStr, language, 'medium'))}</p>
                        ) : (
                            <p>{t.calendar.noBillsThisMonth}</p>
                        )}
                    </div>
                )}
            </Card>

            {/* Export Report Modal */}
            <CalendarExportModal
                isOpen={exportModalOpen}
                onClose={() => setExportModalOpen(false)}
                subscriptions={subscriptions}
                categories={categories}
                selectedYear={year}
                selectedMonth={month}
                selectedDateStr={selectedDateStr}
                language={language}
            />

            {/* Mark As Paid Confirmation — same flow as subscriptions page */}
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
        </div>
    );
};

