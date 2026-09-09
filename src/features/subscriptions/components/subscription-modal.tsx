"use client";

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { POPULAR_PRESETS, TRANSLATIONS, SUBSCRIPTION_CATEGORIES } from '@/config/constants';
import type { Subscription, SubscriptionInput, BillingCycle, SubscriptionStatus, Language } from '@/features/subscriptions/types/subscription.types';
import { calculateNextBillingDate } from '@/features/subscriptions/utils/billing-calculator';
import { resolveCategory } from '@/features/subscriptions/utils/category-helper';
import { CategoryManagerModal } from '@/features/subscriptions/components/category-manager-modal';
import { useApp } from '@/providers/app-store';
import { Settings2, Calendar, Sparkles, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { getUsdToThbRate, convertUsdToThb, DEFAULT_USD_THB_RATE } from '@/lib/currency/exchange-rate';

export interface SubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (input: SubscriptionInput) => Promise<void>;
    subscription?: Subscription | null;
    language: Language;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
    isOpen,
    onClose,
    onSave,
    subscription,
    language,
}) => {
    const { categories } = useApp();
    const t = TRANSLATIONS[language] || TRANSLATIONS.th;
    const isEdit = !!subscription;

    const todayStr = new Date().toISOString().split('T')[0];

    const [form, setForm] = useState<SubscriptionInput>({
        name: '',
        price: 0,
        currency: 'THB',
        billingCycle: 'monthly',
        customIntervalDays: 1,
        startDate: todayStr,
        nextBillingDate: todayStr,
        category: 'streaming',
        paymentMethod: 'Credit Card',
        reminderDays: 3,
        status: 'active',
        notes: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [categoryModalOpen, setCategoryModalOpen] = useState(false);

    // Quick Action toggle state (default is closed/hidden)
    const [showPresets, setShowPresets] = useState(false);

    // Currency Switcher state (THB or USD)
    const [inputCurrency, setInputCurrency] = useState<'THB' | 'USD'>('THB');
    const [rawPriceInput, setRawPriceInput] = useState<string>('');
    const [usdRate, setUsdRate] = useState<number>(DEFAULT_USD_THB_RATE);
    const [isRateLoading, setIsRateLoading] = useState<boolean>(false);
    const [isRateFallback, setIsRateFallback] = useState<boolean>(false);

    // Fetch exchange rate on modal open
    useEffect(() => {
        if (isOpen) {
            setIsRateLoading(true);
            getUsdToThbRate()
                .then((res) => {
                    setUsdRate(res.rate);
                    setIsRateFallback(res.isFallback);
                })
                .catch(() => {
                    setUsdRate(DEFAULT_USD_THB_RATE);
                    setIsRateFallback(true);
                })
                .finally(() => {
                    setIsRateLoading(false);
                });
        }
    }, [isOpen]);

    useEffect(() => {
        if (subscription) {
            const start = subscription.startDate || subscription.nextBillingDate || todayStr;
            const cycle = subscription.billingCycle || 'monthly';
            const days = subscription.customIntervalDays || 1;
            const next = subscription.nextBillingDate || calculateNextBillingDate(start, cycle, undefined, days);

            setForm({
                name: subscription.name,
                price: subscription.price,
                currency: 'THB',
                billingCycle: cycle,
                customIntervalDays: days,
                startDate: start,
                nextBillingDate: next,
                category: subscription.category || 'streaming',
                paymentMethod: subscription.paymentMethod || 'Credit Card',
                reminderDays: subscription.reminderDays || 3,
                status: subscription.status || 'active',
                notes: subscription.notes || '',
            });
            setRawPriceInput(subscription.price > 0 ? String(subscription.price) : '');
            setInputCurrency('THB');
            setShowPresets(false);
        } else {
            const calculatedNext = calculateNextBillingDate(todayStr, 'monthly', undefined, 1);
            setForm({
                name: '',
                price: 0,
                currency: 'THB',
                billingCycle: 'monthly',
                customIntervalDays: 1,
                startDate: todayStr,
                nextBillingDate: calculatedNext,
                category: 'streaming',
                paymentMethod: 'Credit Card',
                reminderDays: 3,
                status: 'active',
                notes: '',
            });
            setRawPriceInput('');
            setInputCurrency('THB');
            setShowPresets(false);
        }
    }, [subscription, isOpen, todayStr]);

    const handleStartDateChange = (newStartDate: string) => {
        const next = calculateNextBillingDate(newStartDate, form.billingCycle, undefined, form.customIntervalDays || 1);
        setForm((prev) => ({
            ...prev,
            startDate: newStartDate,
            nextBillingDate: next,
        }));
    };

    const handleBillingCycleChange = (newCycle: BillingCycle) => {
        const next = calculateNextBillingDate(form.startDate || todayStr, newCycle, undefined, form.customIntervalDays || 1);
        setForm((prev) => ({
            ...prev,
            billingCycle: newCycle,
            nextBillingDate: next,
        }));
    };

    const handleCustomDaysChange = (days: number) => {
        const validDays = Math.max(1, days);
        const next = calculateNextBillingDate(form.startDate || todayStr, 'daily', undefined, validDays);
        setForm((prev) => ({
            ...prev,
            customIntervalDays: validDays,
            nextBillingDate: next,
        }));
    };

    const handleSelectPreset = (preset: typeof POPULAR_PRESETS[0]) => {
        const cycle = preset.billingCycle as BillingCycle;
        const start = form.startDate || todayStr;
        const next = calculateNextBillingDate(start, cycle, undefined, 1);

        setForm((prev) => ({
            ...prev,
            name: preset.name,
            price: preset.price,
            category: preset.category,
            billingCycle: cycle,
            customIntervalDays: 1,
            nextBillingDate: next,
        }));
        setRawPriceInput(String(preset.price));
        setInputCurrency('THB');
    };

    const handleSwitchCurrency = (targetCurrency: 'THB' | 'USD') => {
        if (targetCurrency === inputCurrency) return;
        const currentVal = parseFloat(rawPriceInput);

        if (!isNaN(currentVal) && currentVal > 0) {
            if (targetCurrency === 'USD') {
                // THB -> USD
                setRawPriceInput((currentVal / usdRate).toFixed(2));
            } else {
                // USD -> THB
                setRawPriceInput((currentVal * usdRate).toFixed(2));
            }
        }
        setInputCurrency(targetCurrency);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numVal = parseFloat(rawPriceInput);
        if (!form.name.trim() || isNaN(numVal) || numVal < 0) return;

        // Auto convert USD to THB if user entered in USD
        const finalThbPrice = inputCurrency === 'USD' ? convertUsdToThb(numVal, usdRate) : numVal;

        setSubmitting(true);
        try {
            const computedNextDate = calculateNextBillingDate(
                form.startDate || todayStr,
                form.billingCycle,
                undefined,
                form.customIntervalDays || 1
            );
            const payload: SubscriptionInput = {
                ...form,
                price: finalThbPrice,
                currency: 'THB',
                customIntervalDays: form.billingCycle === 'daily' ? (form.customIntervalDays || 1) : undefined,
                startDate: form.startDate || todayStr,
                nextBillingDate: form.nextBillingDate?.trim() || computedNextDate,
            };
            await onSave(payload);
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    // Category options list (merge context categories with fallback if empty)
    const categoryList = categories.length > 0
        ? categories
        : Object.entries(SUBSCRIPTION_CATEGORIES).map(([k, v]) => ({
            key: k,
            label_th: v.label_th,
            label_en: v.label_en,
            icon: v.icon,
            color: v.color,
            bg: v.bg,
            isSystem: true,
        }));

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto p-4 sm:p-6">
                    <DialogHeader>
                        <DialogTitle>{isEdit ? t.modals.editSub : t.modals.newSub}</DialogTitle>
                    </DialogHeader>

                    {/* Quick Action Presets (Collapsible, default closed) */}
                    {!isEdit && (
                        <div className="border border-border/60 rounded-xl overflow-hidden bg-card/50 transition-all">
                            <button
                                type="button"
                                onClick={() => setShowPresets(!showPresets)}
                                className="w-full flex items-center justify-between p-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                            >
                                <span className="flex items-center gap-1.5 font-semibold text-foreground">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                    {language === 'th' ? 'เลือกจากบริการยอดนิยม (Quick Add)' : 'Popular Presets (Quick Add)'}
                                </span>
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                                        {POPULAR_PRESETS.length} รายการ
                                    </span>
                                    {showPresets ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                                </div>
                            </button>

                            {showPresets && (
                                <div className="p-2.5 pt-0 border-t border-border/40 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="flex flex-wrap gap-1.5 pt-2">
                                        {POPULAR_PRESETS.map((p) => (
                                            <Button
                                                key={p.name}
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="text-xs h-7 px-2.5 rounded-full hover:border-primary hover:text-primary transition-colors"
                                                onClick={() => handleSelectPreset(p)}
                                            >
                                                {p.name} (฿{p.price})
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Name */}
                        <div className="space-y-1.5">
                            <Label htmlFor="name" className="text-xs font-medium">
                                {t.modals.name} *
                            </Label>
                            <Input
                                id="name"
                                required
                                placeholder="Netflix, ChatGPT Plus, YouTube..."
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                            />
                        </div>

                        {/* Price & Billing Cycle with Currency Switcher */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="price" className="text-xs font-medium">
                                        {t.modals.price} *
                                    </Label>
                                    {/* Currency Switcher Toggle */}
                                    <div className="flex items-center bg-muted p-0.5 rounded-md border border-border/60">
                                        <button
                                            type="button"
                                            onClick={() => handleSwitchCurrency('THB')}
                                            className={`px-2 py-0.5 text-[11px] font-bold rounded transition-all ${
                                                inputCurrency === 'THB'
                                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            ฿ THB
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSwitchCurrency('USD')}
                                            className={`px-2 py-0.5 text-[11px] font-bold rounded transition-all ${
                                                inputCurrency === 'USD'
                                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            $ USD
                                        </button>
                                    </div>
                                </div>

                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                                        {inputCurrency === 'USD' ? '$' : '฿'}
                                    </span>
                                    <Input
                                        id="price"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        placeholder="0.00"
                                        value={rawPriceInput}
                                        onChange={(e) => setRawPriceInput(e.target.value)}
                                        className="pl-7 bg-card"
                                    />
                                </div>

                                {/* Live USD to THB conversion helper */}
                                {inputCurrency === 'USD' && (
                                    <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 space-y-1 text-xs animate-in fade-in slide-in-from-top-1">
                                        <div className="flex items-center justify-between font-medium">
                                            <span className="text-foreground text-[11px]">
                                                {language === 'th' ? 'แปลงเป็นเงินบาทอัตโนมัติ:' : 'Auto Converted to THB:'}
                                            </span>
                                            <span className="font-bold text-primary text-sm">
                                                ฿{convertUsdToThb(parseFloat(rawPriceInput) || 0, usdRate).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                            <span>
                                                1 USD ≈ ฿{usdRate} {isRateFallback ? '(Fallback Rate)' : '(Live Rate)'}
                                            </span>
                                            {isRateLoading && (
                                                <span className="animate-pulse flex items-center gap-1 text-primary">
                                                    <RefreshCw className="w-2.5 h-2.5 animate-spin" /> อัปเดตเรท...
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="cycle" className="text-xs font-medium">
                                    {t.modals.cycle}
                                </Label>
                                <Select
                                    value={form.billingCycle}
                                    onValueChange={(val: BillingCycle) => handleBillingCycleChange(val)}
                                >
                                    <SelectTrigger id="cycle" className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="monthly">{t.modals.cycleMonthly}</SelectItem>
                                        <SelectItem value="half_yearly">{t.modals.cycleHalfYearly || 'รายครึ่งปี (6 เดือน)'}</SelectItem>
                                        <SelectItem value="yearly">{t.modals.cycleYearly}</SelectItem>
                                        <SelectItem value="quarterly">{t.modals.cycleQuarterly}</SelectItem>
                                        <SelectItem value="weekly">{t.modals.cycleWeekly}</SelectItem>
                                        <SelectItem value="daily">{t.modals.cycleDaily || 'รายวัน (กำหนดจำนวนวัน)'}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Custom Days Input (แสดงเมื่อเลือกรายวัน) */}
                        {form.billingCycle === 'daily' && (
                            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                <Label htmlFor="customDays" className="text-xs font-medium text-indigo-300">
                                    {t.modals.customIntervalDays || 'ตัดรอบทุกๆ (จำนวนวัน)'} *
                                </Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="customDays"
                                        type="number"
                                        min="1"
                                        required
                                        placeholder="1, 7, 15, 30..."
                                        value={form.customIntervalDays || 1}
                                        onChange={(e) => handleCustomDaysChange(parseInt(e.target.value, 10) || 1)}
                                        className="bg-background"
                                    />
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {t.modals.daysUnit || 'วัน'}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Start Date & Next Billing Date */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="startDate" className="text-xs font-medium flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                    {t.modals.startDate || 'วันที่เริ่มสมัครสมาชิก'}
                                </Label>
                                <Input
                                    id="startDate"
                                    type="date"
                                    value={form.startDate || todayStr}
                                    onChange={(e) => handleStartDateChange(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="date" className="text-xs font-medium">
                                        {t.modals.nextBillingDate}
                                    </Label>
                                </div>
                                <Input
                                    id="date"
                                    type="date"
                                    placeholder={language === 'th' ? 'เว้นว่างเพื่อคำนวณอัตโนมัติ' : 'Leave empty to auto-calculate'}
                                    value={form.nextBillingDate || ''}
                                    onChange={(e) => setForm({ ...form, nextBillingDate: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Category & Payment Method */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="category" className="text-xs font-medium">
                                        {t.modals.category}
                                    </Label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setCategoryModalOpen(true)}
                                        className="h-5 px-1.5 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                                    >
                                        <Settings2 className="w-3 h-3" />
                                        {language === 'th' ? 'จัดการ' : 'Manage'}
                                    </Button>
                                </div>
                                <Select
                                    value={form.category}
                                    onValueChange={(val) => setForm({ ...form, category: val })}
                                >
                                    <SelectTrigger id="category" className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-56">
                                        {categoryList.map((cat) => {
                                            const resolved = resolveCategory(cat.key, categories, language);
                                            const ItemIcon = resolved.Icon;
                                            return (
                                                <SelectItem key={cat.key} value={cat.key}>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`p-1 rounded ${resolved.bg} ${resolved.color}`}>
                                                            <ItemIcon className="w-3.5 h-3.5" />
                                                        </span>
                                                        <span>{language === 'th' ? cat.label_th : cat.label_en}</span>
                                                    </div>
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="paymentMethod" className="text-xs font-medium">
                                    {t.modals.paymentMethod}
                                </Label>
                                <Input
                                    id="paymentMethod"
                                    placeholder="Credit Card, PromptPay..."
                                    value={form.paymentMethod}
                                    onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Reminder Days & (if edit) Status */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="reminder" className="text-xs font-medium">
                                    {t.modals.reminderDays}
                                </Label>
                                <Select
                                    value={String(form.reminderDays || 3)}
                                    onValueChange={(val) => setForm({ ...form, reminderDays: parseInt(val, 10) })}
                                >
                                    <SelectTrigger id="reminder" className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1 วันล่วงหน้า (1 day)</SelectItem>
                                        <SelectItem value="2">2 วันล่วงหน้า (2 days)</SelectItem>
                                        <SelectItem value="3">3 วันล่วงหน้า (3 days)</SelectItem>
                                        <SelectItem value="5">5 วันล่วงหน้า (5 days)</SelectItem>
                                        <SelectItem value="7">7 วันล่วงหน้า (7 days)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {isEdit ? (
                                <div className="space-y-1.5">
                                    <Label htmlFor="status" className="text-xs font-medium">
                                        {t.modals.status}
                                    </Label>
                                    <Select
                                        value={form.status}
                                        onValueChange={(val: SubscriptionStatus) => setForm({ ...form, status: val })}
                                    >
                                        <SelectTrigger id="status" className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">{t.subscriptions.active}</SelectItem>
                                            <SelectItem value="paused">{t.subscriptions.paused}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : null}
                        </div>

                        {/* Notes / บันทึกเพิ่มเติม */}
                        <div className="space-y-1.5">
                            <Label htmlFor="notes" className="text-xs font-medium flex items-center justify-between">
                                <span>{t.modals.notes || 'บันทึกเพิ่มเติม'}</span>
                                <span className="text-[10px] text-muted-foreground font-normal">Optional</span>
                            </Label>
                            <Textarea
                                id="notes"
                                placeholder={language === 'th' ? 'เช่น รายละเอียดแพ็กเกจ, สมาชิกในกลุ่ม, วันที่ต่ออายุอัตโนมัติ...' : 'Add any notes, plan details or account info...'}
                                value={form.notes || ''}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                className="text-xs min-h-[68px]"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                                {t.modals.cancel}
                            </Button>
                            <Button type="submit" disabled={submitting}>
                                {isEdit ? t.modals.update : t.modals.save}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Category Manager Modal */}
            <CategoryManagerModal
                isOpen={categoryModalOpen}
                onClose={() => setCategoryModalOpen(false)}
                language={language}
            />
        </>
    );
};
