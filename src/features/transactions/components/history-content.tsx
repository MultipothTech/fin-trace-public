"use client";

import React, { useState, useMemo } from 'react';
import {
    History,
    Search,
    Download,
    Trash2,
    Calendar,
    CreditCard,
    ArrowDownLeft,
    Filter,
    Layers,
    DollarSign,
    Receipt,
    RefreshCw,
    ExternalLink,
    ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { Transaction } from '@/features/transactions/types/transaction.types';

export interface HistoryContentProps {
    setView?: (view: string) => void;
    initialSubId?: string;
}

export const HistoryContent: React.FC<HistoryContentProps> = ({ setView, initialSubId }) => {
    const { transactions, subscriptions, deleteTransaction, language } = useApp();
    const t = TRANSLATIONS[language] || TRANSLATIONS.th;
    const isTh = language === 'th';

    const [search, setSearch] = useState('');
    const [selectedSubId, setSelectedSubId] = useState<string | 'all'>(initialSubId || 'all');
    const [selectedMonth, setSelectedMonth] = useState<string | 'all'>('all');
    const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Extract billing cycle date helper
    const getCycleDate = (tx: Transaction): string => {
        if (tx.billingCycleDate) return tx.billingCycleDate;
        if (tx.description) {
            // 1. Match (รอบ YYYY-MM-DD) or (Cycle YYYY-MM-DD)
            const match = tx.description.match(/(?:รอบ|Cycle|cycle)\s*[:：]?\s*([0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2})/i);
            if (match && match[1]) return match[1];

            // 2. Match date inside parentheses e.g. (2026-09-09)
            const matchParen = tx.description.match(/\(([0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2})\)/);
            if (matchParen && matchParen[1]) return matchParen[1];

            // 3. Match any YYYY-MM-DD in description
            const matchAny = tx.description.match(/([0-9]{4}-[0-9]{2}-[0-9]{2})/);
            if (matchAny && matchAny[1]) return matchAny[1];
        }
        return tx.transactionDate || '-';
    };

    // List of unique months available in transactions (YYYY-MM)
    const availableMonths = useMemo(() => {
        const monthSet = new Set<string>();
        transactions.forEach((tx) => {
            if (tx.transactionDate) {
                const ym = tx.transactionDate.substring(0, 7);
                if (ym && ym.length === 7) monthSet.add(ym);
            }
        });
        return Array.from(monthSet).sort().reverse();
    }, [transactions]);

    // Current month identifier
    const currentMonthKey = useMemo(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }, []);

    // Overall KPI statistics
    const stats = useMemo(() => {
        const totalAllTime = transactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
        const thisMonthTxs = transactions.filter((tx) => tx.transactionDate?.startsWith(currentMonthKey));
        const totalThisMonth = thisMonthTxs.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
        const count = transactions.length;
        const avg = count > 0 ? totalAllTime / count : 0;

        return {
            totalAllTime,
            totalThisMonth,
            count,
            avg,
        };
    }, [transactions, currentMonthKey]);

    // Filtered transactions
    const filteredTxs = useMemo(() => {
        return transactions.filter((tx) => {
            const sub = subscriptions.find((s) => s.id === tx.subscriptionId);
            const subName = sub?.name || tx.description || '';
            const category = tx.category || sub?.category || '';
            const channel = tx.paymentChannel || sub?.paymentMethod || '';

            // Search query match
            const matchesSearch =
                search.trim() === '' ||
                subName.toLowerCase().includes(search.toLowerCase()) ||
                category.toLowerCase().includes(search.toLowerCase()) ||
                channel.toLowerCase().includes(search.toLowerCase()) ||
                (tx.description && tx.description.toLowerCase().includes(search.toLowerCase()));

            if (!matchesSearch) return false;

            // Subscription filter
            if (selectedSubId !== 'all' && tx.subscriptionId !== selectedSubId) {
                return false;
            }

            // Month filter
            if (selectedMonth !== 'all' && !tx.transactionDate?.startsWith(selectedMonth)) {
                return false;
            }

            return true;
        });
    }, [transactions, subscriptions, search, selectedSubId, selectedMonth]);

    // Total amount of current filtered view
    const filteredTotalAmount = useMemo(() => {
        return filteredTxs.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    }, [filteredTxs]);

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await deleteTransaction(deleteTarget.id);
            setDeleteTarget(null);
        } catch (err) {
            console.error('Failed to delete transaction:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    // Export filtered transactions to CSV
    const handleExportCsv = () => {
        if (filteredTxs.length === 0) return;

        const headers = [
            'ID',
            'Service/Description',
            'Billing Cycle Snapshot',
            'Payment Date',
            'Amount (THB)',
            'Category',
            'Payment Method',
        ];

        const rows = filteredTxs.map((tx) => {
            const sub = subscriptions.find((s) => s.id === tx.subscriptionId);
            const cycleDate = getCycleDate(tx);
            return [
                tx.id,
                `"${(tx.description || sub?.name || 'Subscription').replace(/"/g, '""')}"`,
                `"${cycleDate}"`,
                `"${tx.transactionDate || ''}"`,
                tx.amount,
                `"${(tx.category || sub?.category || '').replace(/"/g, '""')}"`,
                `"${(tx.paymentChannel || sub?.paymentMethod || '').replace(/"/g, '""')}"`,
            ];
        });

        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `FinTrace_Payment_History_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const hasActiveFilters = search.trim() !== '' || selectedSubId !== 'all' || selectedMonth !== 'all';

    const handleResetFilters = () => {
        setSearch('');
        setSelectedSubId('all');
        setSelectedMonth('all');
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500/20 via-zinc-100 to-zinc-50 border border-amber-500/30 text-amber-600 dark:from-amber-500/20 dark:via-zinc-800 dark:to-zinc-950 dark:border-amber-500/20 dark:text-amber-400 shadow-sm shrink-0">
                            <History className="w-5 h-5" />
                        </div>
                        <span>{t.history?.title || (isTh ? 'ประวัติการชำระเงิน (Snapshot)' : 'Payment History')}</span>
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1">
                        {t.history?.subtitle ||
                            (isTh
                                ? 'บันทึกและสแนปช็อตประวัติการชำระเงินแพ็กเกจย้อนหลังทั้งหมด'
                                : 'Track and review all recorded subscription payment snapshots')}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {filteredTxs.length > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportCsv}
                            className="text-xs gap-1.5 border-border shadow-sm hover:bg-muted"
                        >
                            <Download className="w-3.5 h-3.5 text-muted-foreground" />
                            {t.history?.exportCsv || (isTh ? 'ส่งออก CSV' : 'Export CSV')}
                        </Button>
                    )}
                    {setView && (
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => setView('subscriptions')}
                            className="text-xs gap-1.5 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            {t.history?.goToSubs || (isTh ? 'ไปที่หน้าแพ็กเกจ' : 'Go to Subscriptions')}
                        </Button>
                    )}
                </div>
            </div>

            {/* KPI Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="bg-card/80 backdrop-blur-sm border-border/80 shadow-sm hover:border-border transition-all">
                    <CardHeader className="p-3 pb-1">
                        <CardTitle className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
                            <span>{t.history?.totalPaid || (isTh ? 'ยอดชำระสะสม' : 'Total Paid')}</span>
                            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                        <div className="text-xl font-bold tracking-tight text-foreground">
                            ฿{stats.totalAllTime.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                            {isTh ? 'ตลอดอายุการใช้งาน' : 'All-time total'}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card/80 backdrop-blur-sm border-border/80 shadow-sm hover:border-border transition-all">
                    <CardHeader className="p-3 pb-1">
                        <CardTitle className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
                            <span>{t.history?.paidThisMonth || (isTh ? 'ยอดชำระเดือนนี้' : 'Paid This Month')}</span>
                            <Calendar className="w-3.5 h-3.5 text-amber-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                        <div className="text-xl font-bold tracking-tight text-foreground">
                            ฿{stats.totalThisMonth.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                            {isTh ? `รอบเดือน ${currentMonthKey}` : `Month ${currentMonthKey}`}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card/80 backdrop-blur-sm border-border/80 shadow-sm hover:border-border transition-all">
                    <CardHeader className="p-3 pb-1">
                        <CardTitle className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
                            <span>{t.history?.totalRecords || (isTh ? 'รายการทั้งหมด' : 'Total Records')}</span>
                            <Receipt className="w-3.5 h-3.5 text-sky-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                        <div className="text-xl font-bold tracking-tight text-foreground">
                            {stats.count}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                            {isTh ? 'รายการบิลที่บันทึกแล้ว' : 'Recorded transactions'}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card/80 backdrop-blur-sm border-border/80 shadow-sm hover:border-border transition-all">
                    <CardHeader className="p-3 pb-1">
                        <CardTitle className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
                            <span>{t.history?.avgPerTx || (isTh ? 'เฉลี่ยต่อรายการ' : 'Avg. per Bill')}</span>
                            <Layers className="w-3.5 h-3.5 text-purple-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                        <div className="text-xl font-bold tracking-tight text-foreground">
                            ฿{stats.avg.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                            {isTh ? 'ค่าเฉลี่ยการชำระต่อรอบ' : 'Average spend per cycle'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filter Toolbar */}
            <div className="p-4 rounded-xl bg-card border border-border/80 shadow-sm space-y-3">
                <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                    {/* Search Input */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder={t.history?.search || (isTh ? 'ค้นหาบริการ, หมวดหมู่, ช่องทาง...' : 'Search records...')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 text-xs bg-background h-9"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Filter by Subscription */}
                        <div className="flex items-center gap-1.5 bg-background border border-input rounded-lg px-2.5 py-1 text-xs">
                            <Filter className="w-3 h-3 text-muted-foreground" />
                            <select
                                value={selectedSubId}
                                onChange={(e) => setSelectedSubId(e.target.value)}
                                className="bg-transparent text-xs text-foreground outline-none cursor-pointer"
                            >
                                <option value="all">{t.history?.allSubscriptions || (isTh ? 'ทุกแพ็กเกจ' : 'All Subscriptions')}</option>
                                {subscriptions.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Filter by Month */}
                        <div className="flex items-center gap-1.5 bg-background border border-input rounded-lg px-2.5 py-1 text-xs">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="bg-transparent text-xs text-foreground outline-none cursor-pointer"
                            >
                                <option value="all">{t.history?.allMonths || (isTh ? 'ทุกช่วงเวลา' : 'All Months')}</option>
                                {availableMonths.map((m) => (
                                    <option key={m} value={m}>
                                        {m}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Reset Filters */}
                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleResetFilters}
                                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                            >
                                <RefreshCw className="w-3 h-3" />
                                {isTh ? 'รีเซ็ต' : 'Reset'}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Filter Summary Banner */}
                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs text-muted-foreground">
                    <div>
                        {t.history?.recordsFound?.replace('{count}', String(filteredTxs.length)) ||
                            (isTh ? `พบ ${filteredTxs.length} รายการ` : `${filteredTxs.length} records found`)}
                    </div>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold text-xs">
                        {isTh ? 'ยอดรวมที่เลือก: ' : 'Filtered Total: '} ฿{filteredTotalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </Badge>
                </div>
            </div>

            {/* Transactions Content View */}
            {filteredTxs.length > 0 ? (
                <div className="space-y-4">
                    {/* Desktop Table View */}
                    <div className="hidden md:block rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground font-medium">
                                <tr>
                                    <th className="py-3 px-4">{t.history?.tableService || (isTh ? 'บริการ / บิล' : 'Service / Bill')}</th>
                                    <th className="py-3 px-4">{t.history?.tableCycle || (isTh ? 'รอบบิลที่ชำระ (Snapshot)' : 'Billing Cycle')}</th>
                                    <th className="py-3 px-4">{t.history?.tablePaidDate || (isTh ? 'วันที่บันทึกชำระ' : 'Recorded Date')}</th>
                                    <th className="py-3 px-4">{t.history?.tableMethod || (isTh ? 'ช่องทาง' : 'Channel')}</th>
                                    <th className="py-3 px-4">{t.history?.tableCategory || (isTh ? 'หมวดหมู่' : 'Category')}</th>
                                    <th className="py-3 px-4 text-right">{t.history?.tableAmount || (isTh ? 'ยอดเงิน' : 'Amount')}</th>
                                    <th className="py-3 px-4 text-center">{t.history?.tableActions || (isTh ? 'จัดการ' : 'Action')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {filteredTxs.map((tx) => {
                                    const sub = subscriptions.find((s) => s.id === tx.subscriptionId);
                                    const name = tx.description || sub?.name || (isTh ? 'ชำระค่าบริการ' : 'Subscription Payment');
                                    const category = tx.category || sub?.category;
                                    const channel = tx.paymentChannel || sub?.paymentMethod;

                                    return (
                                        <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                                        <ArrowDownLeft className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-foreground text-xs">{name}</div>
                                                        {sub && sub.name !== name && (
                                                            <div className="text-[10px] text-muted-foreground">{sub.name}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="py-3.5 px-4 font-mono text-[11px] text-muted-foreground">
                                                {getCycleDate(tx) ? (
                                                    <span className="bg-muted px-2 py-0.5 rounded border border-border/40">
                                                        {getCycleDate(tx)}
                                                    </span>
                                                ) : (
                                                    '-'
                                                )}
                                            </td>

                                            <td className="py-3.5 px-4 text-muted-foreground">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-3.5 h-3.5 text-muted-foreground/70" />
                                                    <span>{tx.transactionDate || '-'}</span>
                                                </div>
                                            </td>

                                            <td className="py-3.5 px-4 text-muted-foreground">
                                                {channel ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <CreditCard className="w-3.5 h-3.5 text-muted-foreground/70" />
                                                        <span>{channel}</span>
                                                    </div>
                                                ) : (
                                                    '-'
                                                )}
                                            </td>

                                            <td className="py-3.5 px-4">
                                                {category ? (
                                                    <Badge variant="secondary" className="text-[10px] py-0 px-2 h-5 font-normal">
                                                        {category}
                                                    </Badge>
                                                ) : (
                                                    '-'
                                                )}
                                            </td>

                                            <td className="py-3.5 px-4 text-right">
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                                                    -฿{Number(tx.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>

                                            <td className="py-3.5 px-4 text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg"
                                                    onClick={() => setDeleteTarget(tx)}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card List View */}
                    <div className="md:hidden space-y-2.5">
                        {filteredTxs.map((tx) => {
                            const sub = subscriptions.find((s) => s.id === tx.subscriptionId);
                            const name = tx.description || sub?.name || (isTh ? 'ชำระค่าบริการ' : 'Subscription Payment');
                            const category = tx.category || sub?.category;
                            const channel = tx.paymentChannel || sub?.paymentMethod;

                            return (
                                <div
                                    key={tx.id}
                                    className="p-3.5 rounded-xl border border-border/80 bg-card shadow-sm space-y-2.5"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                                <ArrowDownLeft className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-semibold text-xs text-foreground truncate">{name}</div>
                                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                                                    <Calendar className="w-3 h-3" />
                                                    <span>{tx.transactionDate}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                                                -฿{Number(tx.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {getCycleDate(tx) && (
                                                <span className="font-mono bg-muted px-1.5 py-0.5 rounded border border-border/40">
                                                    {isTh ? 'รอบ: ' : 'Cycle: '}{getCycleDate(tx)}
                                                </span>
                                            )}
                                            {channel && (
                                                <span className="flex items-center gap-1">
                                                    <CreditCard className="w-3 h-3" />
                                                    {channel}
                                                </span>
                                            )}
                                            {category && (
                                                <Badge variant="secondary" className="text-[9px] py-0 px-1.5 h-4">
                                                    {category}
                                                </Badge>
                                            )}
                                        </div>

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 text-[10px]"
                                            onClick={() => setDeleteTarget(tx)}
                                        >
                                            <Trash2 className="w-3 h-3 mr-1" />
                                            {isTh ? 'ลบ' : 'Delete'}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                /* Empty State */
                <div className="text-center py-16 px-4 border border-dashed border-border/80 rounded-2xl bg-card/40 flex flex-col items-center justify-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shadow-inner">
                        <Receipt className="w-7 h-7" />
                    </div>
                    <div className="max-w-md space-y-1">
                        <p className="text-base font-semibold text-foreground">
                            {hasActiveFilters
                                ? (isTh ? 'ไม่พบประวัติชำระเงินที่ตรงกับตัวกรอง' : 'No payment records match your filter.')
                                : (t.history?.emptyTitle || (isTh ? 'ยังไม่มีประวัติการชำระเงิน' : 'No Payment History Records'))}
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            {hasActiveFilters
                                ? (isTh ? 'ลองปรับเปลี่ยนคำค้นหา หรือรีเซ็ตตัวกรองเพื่อดูรายการทั้งหมด' : 'Try adjusting your search terms or resetting filters.')
                                : (t.history?.emptyDesc ||
                                    (isTh
                                        ? 'เมื่อคุณกด "จ่ายแล้ว" ในหน้าแพ็กเกจ ระบบจะสร้างประวัติ Transaction Snapshot บันทึกข้อมูลและเลื่อนรอบบิลให้อัตโนมัติ'
                                        : 'When you mark subscriptions as paid, a snapshot record will be captured here and the next billing date will advance automatically.'))}
                        </p>
                    </div>

                    {hasActiveFilters ? (
                        <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-2 text-xs">
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                            {isTh ? 'ล้างตัวกรองทั้งหมด' : 'Clear all filters'}
                        </Button>
                    ) : setView ? (
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => setView('subscriptions')}
                            className="mt-2 text-xs gap-1.5 shadow-sm"
                        >
                            <span>{t.history?.goToSubs || (isTh ? 'ไปที่หน้าแพ็กเกจ' : 'Go to Subscriptions')}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                    ) : null}
                </div>
            )}

            {/* Delete Transaction Alert Dialog */}
            <AlertDialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && !isDeleting && setDeleteTarget(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {t.history?.deleteTitle || (isTh ? 'ยืนยันการลบประวัติการชำระเงิน' : 'Delete Payment Record')}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {t.history?.deleteDesc?.replace('{name}', deleteTarget?.description || '') ||
                                (isTh
                                    ? `คุณแน่ใจหรือไม่ว่าต้องการลบบันทึกประวัติ "${deleteTarget?.description || ''}"? การลบนี้เป็นเพียงการลบ snapshot และจะไม่เปลี่ยนวันตัดรอบบิลปัจจุบันของแพ็กเกจ`
                                    : `Are you sure you want to delete this payment record "${deleteTarget?.description || ''}"?`)}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>
                            {t.history?.deleteCancel || (isTh ? 'ยกเลิก' : 'Cancel')}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? '...' : (t.history?.deleteConfirm || (isTh ? 'ยืนยันการลบ' : 'Delete'))}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};
