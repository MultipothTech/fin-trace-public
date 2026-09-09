"use client";

import React, { useState, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/providers/app-store';
import { TRANSLATIONS } from '@/config/constants';
import { formatLocalizedDate, localizeDatesInText } from '@/lib/date/thai-date';
import type { Transaction } from '@/features/transactions/types/transaction.types';
import type { Language } from '@/features/subscriptions/types/subscription.types';
import {
    History,
    Receipt,
    Trash2,
    Calendar,
    CreditCard,
    ArrowDownLeft,
    Filter,
} from 'lucide-react';

export interface PaymentHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    subscriptionId?: string | null;
    language: Language;
}

export const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({
    isOpen,
    onClose,
    subscriptionId,
    language,
}) => {
    const { transactions, subscriptions, deleteTransaction } = useApp();
    const t = TRANSLATIONS[language] || TRANSLATIONS.th;
    const isTh = language === 'th';

    const [selectedSubId, setSelectedSubId] = useState<string | 'all'>(subscriptionId || 'all');
    const [deleteTxTarget, setDeleteTxTarget] = useState<Transaction | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const getCycleDate = (tx: Transaction): string | null => {
        if (tx.billingCycleDate) return tx.billingCycleDate;
        if (tx.description) {
            const match = tx.description.match(/(?:รอบ|Cycle|cycle)\s*[:：]?\s*([0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2})/i);
            if (match && match[1]) return match[1];
            const matchParen = tx.description.match(/\(([0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2})\)/);
            if (matchParen && matchParen[1]) return matchParen[1];
        }
        return null;
    };

    // Sync selectedSubId when subscriptionId prop changes
    React.useEffect(() => {
        if (subscriptionId) {
            setSelectedSubId(subscriptionId);
        } else {
            setSelectedSubId('all');
        }
    }, [subscriptionId, isOpen]);

    // Filter transactions
    const filteredTxs = useMemo(() => {
        if (selectedSubId === 'all') return transactions;
        return transactions.filter((tx) => tx.subscriptionId === selectedSubId);
    }, [transactions, selectedSubId]);

    // Total amount of filtered transactions
    const totalAmount = useMemo(() => {
        return filteredTxs.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    }, [filteredTxs]);

    const activeSubscription = useMemo(() => {
        if (!subscriptionId || subscriptionId === 'all') return null;
        return subscriptions.find((s) => s.id === subscriptionId) || null;
    }, [subscriptions, subscriptionId]);

    const handleConfirmDelete = async () => {
        if (!deleteTxTarget) return;
        setIsDeleting(true);
        try {
            await deleteTransaction(deleteTxTarget.id);
            setDeleteTxTarget(null);
        } catch (err) {
            console.error('Failed to delete transaction:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
                    {/* Header */}
                    <DialogHeader className="p-5 pb-3 border-b border-border/50">
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                <History className="w-5 h-5" />
                            </div>
                            <div>
                                <span>{isTh ? 'ประวัติการชำระเงิน (Snapshot)' : 'Payment History Snapshots'}</span>
                                {activeSubscription && (
                                    <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                                        {activeSubscription.name}
                                    </span>
                                )}
                            </div>
                        </DialogTitle>
                    </DialogHeader>

                    {/* Filter & Summary Banner */}
                    <div className="px-5 py-3 bg-muted/40 border-b border-border/40 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                            <select
                                value={selectedSubId}
                                onChange={(e) => setSelectedSubId(e.target.value)}
                                className="bg-background border border-input rounded-md px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary"
                            >
                                <option value="all">{isTh ? 'ทุกบริการ (ทั้งหมด)' : 'All Subscriptions'}</option>
                                {subscriptions.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-muted-foreground">
                                {isTh ? `รวม ${filteredTxs.length} รายการ` : `${filteredTxs.length} transactions`}
                            </span>
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold">
                                {isTh ? 'ยอดชำระรวม: ' : 'Total: '} ฿{totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </Badge>
                        </div>
                    </div>

                    {/* Transactions List */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-[220px] max-h-[50vh]">
                        {filteredTxs.length > 0 ? (
                            filteredTxs.map((tx) => {
                                const sub = subscriptions.find((s) => s.id === tx.subscriptionId);
                                const rawName = tx.description || sub?.name || (isTh ? 'ชำระค่าบริการ' : 'Subscription Payment');
                                const name = localizeDatesInText(rawName, language);
                                const currency = (sub?.currency || 'THB').toUpperCase();
                                const isExpense = tx.type !== 'income';
                                const amountColor = isExpense
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-emerald-600 dark:text-emerald-400';
                                const amountPrefix = isExpense ? '-' : '+';

                                return (
                                    <div
                                        key={tx.id}
                                        className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-card hover:bg-muted/30 transition-all gap-3"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
                                                isExpense
                                                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                            }`}>
                                                <ArrowDownLeft className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-semibold text-sm text-foreground truncate">
                                                    {name}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                                                    {getCycleDate(tx) && (
                                                        <span className="bg-muted px-1.5 py-0.5 rounded border border-border/40 text-[10px]">
                                                            {isTh ? 'รอบ: ' : 'Cycle: '}{formatLocalizedDate(getCycleDate(tx), language, 'medium')}
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {tx.transactionDate ? formatLocalizedDate(tx.transactionDate, language, 'medium') : '-'}
                                                    </span>
                                                    {tx.paymentChannel && (
                                                        <span className="flex items-center gap-1">
                                                            <CreditCard className="w-3 h-3" />
                                                            {tx.paymentChannel}
                                                        </span>
                                                    )}
                                                    <Badge variant="outline" className="text-[9px] py-0 px-1.5 h-4 font-semibold">
                                                        {currency}
                                                    </Badge>
                                                    {tx.category && (
                                                        <Badge variant="secondary" className="text-[9px] py-0 px-1.5 h-4">
                                                            {tx.category}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className={`font-bold text-sm ${amountColor}`}>
                                                {amountPrefix}฿{Number(tx.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                                                onClick={() => setDeleteTxTarget(tx)}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-12 px-4 border border-dashed rounded-xl bg-card/40 flex flex-col items-center justify-center gap-2">
                                <Receipt className="w-8 h-8 text-muted-foreground/60" />
                                <p className="text-sm text-muted-foreground font-medium">
                                    {isTh ? 'ยังไม่มีประวัติการชำระเงิน' : 'No payment history records found.'}
                                </p>
                                <p className="text-xs text-muted-foreground/80 max-w-xs">
                                    {isTh
                                        ? 'เมื่อคุณกด "ชำระแล้ว" บนแพ็กเกจ ระบบจะบันทึกประวัติ Snapshot ย้อนหลังให้อัตโนมัติ'
                                        : 'When you mark a bill as paid, a snapshot record will appear here automatically.'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <DialogFooter className="p-4 border-t border-border/50 bg-muted/20">
                        <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
                            {t.modals.cancel}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Transaction Alert Dialog */}
            <AlertDialog
                open={!!deleteTxTarget}
                onOpenChange={(open) => !open && !isDeleting && setDeleteTxTarget(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {isTh ? 'ยืนยันการลบประวัติการชำระเงิน' : 'Delete Payment Record'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {isTh
                                ? `คุณแน่ใจหรือไม่ว่าต้องการลบบันทึกประวัติ "${deleteTxTarget?.description || ''}"? การลบนี้จะไม่ส่งผลต่อวันตัดรอบบิลปัจจุบัน`
                                : `Are you sure you want to delete this payment record "${deleteTxTarget?.description || ''}"?`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>
                            {isTh ? 'ยกเลิก' : 'Cancel'}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? '...' : (isTh ? 'ยืนยันการลบ' : 'Delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
