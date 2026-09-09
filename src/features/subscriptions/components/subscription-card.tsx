import React from 'react';
import {
    MoreVertical,
    AlertTriangle,
    Clock,
    CreditCard,
    Edit,
    Trash2,
    PauseCircle,
    PlayCircle,
    FileText,
    CheckCircle2,
    History,
    Tags,
    FolderKanban,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TRANSLATIONS } from '@/config/constants';
import { calculateDaysRemaining } from '@/features/notifications/services/notification-service';
import type { Subscription, Language } from '@/features/subscriptions/types/subscription.types';
import { resolveCategory } from '@/features/subscriptions/utils/category-helper';
import { isSubscriptionPaidForCurrentCycle } from '@/features/subscriptions/utils/billing-calculator';
import { useApp } from '@/providers/app-store';
import { formatLocalizedDate } from '@/lib/date/thai-date';

export interface SubscriptionCardProps {
    subscription: Subscription;
    language: Language;
    onEdit: (sub: Subscription) => void;
    onDelete: (id: string) => void;
    onToggleStatus: (id: string) => void;
    onMarkAsPaid?: (sub: Subscription) => void;
    onViewHistory?: (sub: Subscription) => void;
}

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
    subscription,
    language,
    onEdit,
    onDelete,
    onToggleStatus,
    onMarkAsPaid,
    onViewHistory,
}) => {
    const { categories, tags, projects, transactions } = useApp();
    const t = TRANSLATIONS[language] || TRANSLATIONS.th;
    const isTh = language === 'th';

    // ตรวจสอบว่าบริการนี้ในรอบนี้ถูกบันทึกว่าชำระแล้วหรือไม่
    const isPaid = isSubscriptionPaidForCurrentCycle(subscription, transactions);

    const subTagIds =
        subscription.tagIds?.length
            ? subscription.tagIds
            : subscription.tagId
              ? [subscription.tagId]
              : [];
    const subTags = subTagIds
        .map((id) => tags.find((tag) => tag.id === id))
        .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag));
    const subProjects = (subscription.projectIds || [])
        .map((id) => projects.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p));
    const chipLabel = (item: { nameTh: string; nameEn: string }) =>
        (isTh ? item.nameTh : item.nameEn) || item.nameEn || item.nameTh;

    const hasNotes = Boolean(subscription.notes && subscription.notes.trim() !== '');
    const hasTags = subTags.length > 0;
    const hasProjects = subProjects.length > 0;

    // Resolve category (first check context categories, then default constants mapping)
    const { label: catLabel, Icon: IconComponent, color: catColor, bg: catBg } = resolveCategory(
        subscription.category,
        categories,
        language
    );

    const daysRemaining = calculateDaysRemaining(subscription.nextBillingDate);
    const isUrgent = subscription.status === 'active' && daysRemaining >= 0 && daysRemaining <= 3;
    const isPastDue = subscription.status === 'active' && daysRemaining < 0;

    const cycleLabel = t.subscriptions[
        subscription.billingCycle === 'yearly'
            ? 'perYear'
            : subscription.billingCycle === 'half_yearly'
            ? 'perHalfYear'
            : 'perMonth'
    ] || '/mo';

    return (
        <Card
            className={`p-4 transition-all duration-200 border bg-card hover:shadow-md relative overflow-hidden ${
                subscription.status === 'paused'
                    ? 'opacity-60 bg-muted/30 border-dashed border-border'
                    : isPastDue
                    ? 'border-red-500/30 dark:border-red-500/20'
                    : isUrgent
                    ? 'border-amber-500/40 dark:border-amber-500/30'
                    : 'border-border/80'
            }`}
        >
            <div className="flex items-center justify-between gap-3">
                {/* Icon & Details */}
                <div className="flex items-center gap-3 min-w-0">
                    <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-border/50 ${catBg} ${catColor}`}
                    >
                        <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm text-foreground truncate">
                                {subscription.name}
                            </h3>
                            {subscription.status === 'paused' && (
                                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
                                    {t.subscriptions.paused}
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                            {catLabel}
                            {subscription.paymentMethod ? ` • ${subscription.paymentMethod}` : ''}
                        </p>
                    </div>
                </div>

                {/* Price & Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <div className="text-right">
                        <div className="font-bold text-base text-foreground">
                            ฿{subscription.price.toLocaleString()}
                            <span className="text-xs font-normal text-muted-foreground">{cycleLabel}</span>
                        </div>
                    </div>

                    {subscription.status === 'active' && onMarkAsPaid && (
                        isPaid ? (
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={true}
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
                                onClick={() => onMarkAsPaid(subscription)}
                                title={t.subscriptions.markAsPaid}
                                className="h-8 px-2 text-xs gap-1 font-medium text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all shadow-xs"
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{t.subscriptions.markAsPaidQuick}</span>
                            </Button>
                        )
                    )}

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                <MoreVertical className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            {subscription.status === 'active' && onMarkAsPaid && (
                                isPaid ? (
                                    <DropdownMenuItem disabled className="text-muted-foreground opacity-60">
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        <span>{t.subscriptions.alreadyPaidMenuItem || (isTh ? 'ชำระแล้วในรอบนี้' : 'Paid for this cycle')}</span>
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem onClick={() => onMarkAsPaid(subscription)} className="text-emerald-600 dark:text-emerald-400 font-medium">
                                        <CheckCircle2 className="w-4 h-4 mr-2" /> {t.subscriptions.markAsPaid}
                                    </DropdownMenuItem>
                                )
                            )}
                            {onViewHistory && (
                                <DropdownMenuItem onClick={() => onViewHistory(subscription)}>
                                    <History className="w-4 h-4 mr-2 text-amber-500" /> {t.subscriptions.paymentHistory}
                                </DropdownMenuItem>
                            )}
                            {(onMarkAsPaid || onViewHistory) && <DropdownMenuSeparator />}
                            <DropdownMenuItem onClick={() => onEdit(subscription)}>
                                <Edit className="w-4 h-4 mr-2" /> {t.subscriptions.edit}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onToggleStatus(subscription.id)}>
                                {subscription.status === 'active' ? (
                                    <>
                                        <PauseCircle className="w-4 h-4 mr-2" /> {t.subscriptions.pause}
                                    </>
                                ) : (
                                    <>
                                        <PlayCircle className="w-4 h-4 mr-2" /> {t.subscriptions.resume}
                                    </>
                                )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => onDelete(subscription.id)}
                                className="text-red-500 focus:text-red-500"
                            >
                                <Trash2 className="w-4 h-4 mr-2" /> {t.subscriptions.delete}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Bottom Row: Next Bill & Alert Badge */}
            <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>
                        {t.subscriptions.nextBill}: <strong className="text-foreground">{formatLocalizedDate(subscription.nextBillingDate, language, 'medium')}</strong>
                    </span>
                </div>

                {subscription.status === 'active' && (
                    <div>
                        {isUrgent ? (
                            <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 gap-1 font-semibold">
                                <AlertTriangle className="w-3 h-3" />
                                {daysRemaining === 0
                                    ? t.overview.dueToday
                                    : daysRemaining === 1
                                    ? t.overview.dueTomorrow
                                    : t.overview.dueInDays.replace('{days}', String(daysRemaining))}
                            </Badge>
                        ) : isPastDue ? (
                            <Badge variant="outline" className="text-muted-foreground">
                                {t.subscriptions.pastDue}
                            </Badge>
                        ) : (
                            <span className="text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {t.subscriptions.inDays.replace('{days}', String(daysRemaining))}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Notes + Tags + Projects */}
            {(hasNotes || hasTags || hasProjects) && (
                <div className="mt-2.5 pt-2 border-t border-border/40 space-y-2 bg-muted/30 -mx-4 -mb-1 px-4 py-1.5">
                    {hasNotes && (
                        <div className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                            <FileText className="w-3 h-3 text-amber-500/80 shrink-0 mt-0.5" />
                            <span className="line-clamp-2 leading-relaxed break-words">
                                {subscription.notes}
                            </span>
                        </div>
                    )}
                    {hasTags && (
                        <div className="flex items-start gap-1.5">
                            <Tags className="w-3 h-3 text-sky-500/80 shrink-0 mt-1" />
                            <div className="flex flex-wrap gap-1 min-w-0">
                                {subTags.map((tag) => (
                                    <span
                                        key={tag.id}
                                        className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${
                                            tag.bg || 'bg-sky-500/10 border-sky-500/20'
                                        } ${tag.color || 'text-sky-400'}`}
                                    >
                                        {chipLabel(tag)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    {hasProjects && (
                        <div className="flex items-start gap-1.5">
                            <FolderKanban className="w-3 h-3 text-violet-500/80 shrink-0 mt-1" />
                            <div className="flex flex-wrap gap-1 min-w-0">
                                {subProjects.map((project) => (
                                    <span
                                        key={project.id}
                                        className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${
                                            project.bg || 'bg-violet-500/10 border-violet-500/20'
                                        } ${project.color || 'text-violet-400'}`}
                                    >
                                        {chipLabel(project)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
};
