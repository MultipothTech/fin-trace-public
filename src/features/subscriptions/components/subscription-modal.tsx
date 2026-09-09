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
import { Settings2, Calendar, Sparkles } from 'lucide-react';

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

    useEffect(() => {
        if (subscription) {
            const start = subscription.startDate || subscription.nextBillingDate || todayStr;
            const cycle = subscription.billingCycle || 'monthly';
            const days = subscription.customIntervalDays || 1;
            const next = subscription.nextBillingDate || calculateNextBillingDate(start, cycle, undefined, days);

            setForm({
                name: subscription.name,
                price: subscription.price,
                currency: subscription.currency || 'THB',
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
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim() || form.price < 0 || isNaN(form.price)) return;

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
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{isEdit ? t.modals.editSub : t.modals.newSub}</DialogTitle>
                    </DialogHeader>

                    {!isEdit && (
                        <div className="space-y-2 pb-2">
                            <Label className="text-xs text-muted-foreground">{t.modals.selectPreset}</Label>
                            <div className="flex flex-wrap gap-1.5">
                                {POPULAR_PRESETS.map((p) => (
                                    <Button
                                        key={p.name}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="text-xs h-7 px-2.5 rounded-full"
                                        onClick={() => handleSelectPreset(p)}
                                    >
                                        {p.name} (฿{p.price})
                                    </Button>
                                ))}
                            </div>
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

                        {/* Price & Billing Cycle */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="price" className="text-xs font-medium">
                                    {t.modals.price} (฿) *
                                </Label>
                                <Input
                                    id="price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    required
                                    placeholder="0.00"
                                    value={form.price || ''}
                                    onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                                />
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
                        <div className="grid grid-cols-2 gap-3">
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
                        <div className="grid grid-cols-2 gap-3">
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
                        <div className="grid grid-cols-2 gap-3">
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

