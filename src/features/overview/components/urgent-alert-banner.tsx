"use client";

import React from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TRANSLATIONS } from '@/config/constants';
import { calculateDaysRemaining } from '@/features/notifications/services/notification-service';
import { formatLocalizedDate } from '@/lib/date/thai-date';
import type { Subscription, Language } from '@/features/subscriptions/types/subscription.types';

export interface UrgentAlertBannerProps {
    urgentSubscriptions: Subscription[];
    language: Language;
    onViewAll: () => void;
}

export const UrgentAlertBanner: React.FC<UrgentAlertBannerProps> = ({
    urgentSubscriptions,
    language,
    onViewAll,
}) => {
    const t = TRANSLATIONS[language] || TRANSLATIONS.th;

    if (urgentSubscriptions.length === 0) {
        return (
            <Card className="p-4 bg-emerald-500/5 border-emerald-500/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="font-semibold text-sm text-foreground">
                            {language === 'th' ? 'ไม่มีบิลที่ต้องชำระใน 3 วันนี้' : 'No bills due in the next 3 days'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {language === 'th' ? 'ทุกบริการมีกำหนดตัดรอบบิลหลังจากนี้' : 'All subscriptions are on schedule'}
                        </p>
                    </div>
                </div>
                <Button variant="ghost" size="sm" onClick={onViewAll} className="text-xs gap-1">
                    {t.overview.manageAll} <ArrowRight className="w-3.5 h-3.5" />
                </Button>
            </Card>
        );
    }

    return (
        <Card className="p-4 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border-amber-500/40 relative overflow-hidden shadow-lg animate-in fade-in slide-in-from-top-3 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500 text-black shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-foreground">
                                {t.overview.urgentBannerTitle}
                            </h3>
                            <Badge className="bg-amber-500 text-black font-bold">
                                {urgentSubscriptions.length} รายการ
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed max-w-xl">
                            {t.overview.urgentBannerDesc}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <Button size="sm" onClick={onViewAll} className="text-xs gap-1 font-semibold">
                        {t.overview.manageAll} <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>

            {/* Urgent Items List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-4 pt-3 border-t border-amber-500/20">
                {urgentSubscriptions.map((sub) => {
                    const days = calculateDaysRemaining(sub.nextBillingDate);
                    return (
                        <div
                            key={sub.id}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-background/80 border border-border text-xs"
                        >
                            <div className="truncate pr-2">
                                <p className="font-semibold text-foreground truncate">{sub.name}</p>
                                <p className="text-muted-foreground text-[10px]">{formatLocalizedDate(sub.nextBillingDate, language, 'medium')}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="font-bold text-foreground">฿{sub.price.toLocaleString()}</p>
                                <Badge className="bg-amber-500/20 text-amber-500 dark:text-amber-400 border-amber-500/30 text-[9px] py-0 px-1">
                                    {days === 0
                                        ? t.overview.dueToday
                                        : days === 1
                                        ? t.overview.dueTomorrow
                                        : t.overview.dueInDays.replace('{days}', String(days))}
                                </Badge>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
};
