"use client";

import React, { useState, useEffect, useRef } from 'react';
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
import type { Subscription, SubscriptionInput, BillingCycle, SubscriptionStatus, Language, TagItem } from '@/features/subscriptions/types/subscription.types';
import { calculateNextBillingDate } from '@/features/subscriptions/utils/billing-calculator';
import { resolveCategory } from '@/features/subscriptions/utils/category-helper';
import { CategoryManagerModal } from '@/features/subscriptions/components/category-manager-modal';
import { useApp } from '@/providers/app-store';
import { searchTags } from '@/features/tags/server/api/tags-api';
import { searchProjects } from '@/features/projects/server/api/projects-api';
import {
    MultiChipAutocomplete,
    resolvePendingChipNames,
} from '@/components/multi-chip-autocomplete';
import { Settings2, Calendar, Sparkles, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { getUsdToThbRate, convertUsdToThb, DEFAULT_USD_THB_RATE } from '@/lib/currency/exchange-rate';
import { ThaiDatePicker } from '@/components/ui/thai-date-picker';

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
    const { categories, tags, projects, addTag, addProject } = useApp();
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
        categoryId: null,
        tagId: null,
        tagIds: [],
        projectIds: [],
        paymentMethod: 'Credit Card',
        reminderDays: 3,
        status: 'active',
        notes: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [categoryModalOpen, setCategoryModalOpen] = useState(false);

    // Tag autocomplete (multi)
    const [tagQuery, setTagQuery] = useState('');
    const [tagSuggestions, setTagSuggestions] = useState<TagItem[]>([]);
    const [tagMenuOpen, setTagMenuOpen] = useState(false);
    const [tagSearching, setTagSearching] = useState(false);
    /** Names typed that are not yet in DB — created on save */
    const [pendingTagNames, setPendingTagNames] = useState<string[]>([]);
    const [pendingProjectNames, setPendingProjectNames] = useState<string[]>([]);
    const [projectQueryLeftover, setProjectQueryLeftover] = useState('');
    const tagWrapRef = useRef<HTMLDivElement>(null);
    const tagSearchSeq = useRef(0);

    const tagLabel = (tag: TagItem) => (language === 'th' ? tag.nameTh : tag.nameEn) || tag.nameEn || tag.nameTh;

    const selectedTagItems = tags.filter((t) => (form.tagIds || []).includes(t.id));

    const findExactTag = (text: string, list: TagItem[] = tags): TagItem | undefined => {
        const q = text.trim().toLowerCase();
        if (!q) return undefined;
        return list.find(
            (t) => t.nameEn.toLowerCase() === q || t.nameTh.toLowerCase() === q
        );
    };

    const isNameAlreadySelected = (name: string) => {
        const q = name.trim().toLowerCase();
        if (!q) return true;
        if (pendingTagNames.some((n) => n.toLowerCase() === q)) return true;
        return selectedTagItems.some(
            (t) => t.nameEn.toLowerCase() === q || t.nameTh.toLowerCase() === q
        );
    };

    const addTagByItem = (tag: TagItem) => {
        setForm((prev) => {
            const current = prev.tagIds || [];
            if (current.includes(tag.id)) return prev;
            const next = [...current, tag.id];
            return { ...prev, tagIds: next, tagId: next[0] || null };
        });
        setPendingTagNames((prev) =>
            prev.filter(
                (n) =>
                    n.toLowerCase() !== tag.nameEn.toLowerCase() &&
                    n.toLowerCase() !== tag.nameTh.toLowerCase()
            )
        );
        setTagQuery('');
        setTagMenuOpen(false);
    };

    const addTagByName = (rawName: string) => {
        const name = rawName.trim();
        if (!name || isNameAlreadySelected(name)) {
            setTagQuery('');
            return;
        }
        const existing = findExactTag(name) || findExactTag(name, tagSuggestions);
        if (existing) {
            addTagByItem(existing);
            return;
        }
        setPendingTagNames((prev) =>
            prev.some((n) => n.toLowerCase() === name.toLowerCase()) ? prev : [...prev, name]
        );
        setTagQuery('');
        setTagMenuOpen(false);
    };

    const commitTagNames = (names: string[]) => {
        const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
        if (unique.length === 0) return;

        const addIds: string[] = [];
        const addPending: string[] = [];

        for (const name of unique) {
            if (isNameAlreadySelected(name) || addPending.some((n) => n.toLowerCase() === name.toLowerCase())) {
                continue;
            }
            const existing = findExactTag(name) || findExactTag(name, tagSuggestions);
            if (existing) {
                if (!addIds.includes(existing.id) && !(form.tagIds || []).includes(existing.id)) {
                    addIds.push(existing.id);
                }
            } else {
                addPending.push(name);
            }
        }

        if (addIds.length > 0) {
            setForm((prev) => {
                const current = prev.tagIds || [];
                const next = [...current];
                addIds.forEach((id) => {
                    if (!next.includes(id)) next.push(id);
                });
                return { ...prev, tagIds: next, tagId: next[0] || null };
            });
        }
        if (addPending.length > 0) {
            setPendingTagNames((prev) => {
                const next = [...prev];
                addPending.forEach((name) => {
                    if (!next.some((n) => n.toLowerCase() === name.toLowerCase())) next.push(name);
                });
                return next;
            });
        }
        setTagQuery('');
        setTagMenuOpen(false);
    };

    const commitTagQuery = (raw = tagQuery) => {
        commitTagNames(
            raw
                .split(',')
                .map((p) => p.trim())
                .filter(Boolean)
        );
    };

    const removeSelectedTagId = (id: string) => {
        setForm((prev) => {
            const next = (prev.tagIds || []).filter((tid) => tid !== id);
            return { ...prev, tagIds: next, tagId: next[0] || null };
        });
    };

    const removePendingName = (name: string) => {
        setPendingTagNames((prev) => prev.filter((n) => n !== name));
    };

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

            const initialTagIds =
                subscription.tagIds?.length
                    ? subscription.tagIds
                    : subscription.tagId
                      ? [subscription.tagId]
                      : [];

            setForm({
                name: subscription.name,
                price: subscription.price,
                currency: 'THB',
                billingCycle: cycle,
                customIntervalDays: days,
                startDate: start,
                nextBillingDate: next,
                category: subscription.category || 'streaming',
                categoryId: subscription.categoryId || null,
                tagId: initialTagIds[0] || null,
                tagIds: initialTagIds,
                projectIds: subscription.projectIds || [],
                paymentMethod: subscription.paymentMethod || 'Credit Card',
                reminderDays: subscription.reminderDays || 3,
                status: subscription.status || 'active',
                notes: subscription.notes || '',
            });
            setTagQuery('');
            setPendingTagNames([]);
            setPendingProjectNames([]);
            setProjectQueryLeftover('');
            setTagSuggestions([]);
            setTagMenuOpen(false);
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
                categoryId: null,
                tagId: null,
                tagIds: [],
                projectIds: [],
                paymentMethod: 'Credit Card',
                reminderDays: 3,
                status: 'active',
                notes: '',
            });
            setTagQuery('');
            setPendingTagNames([]);
            setPendingProjectNames([]);
            setProjectQueryLeftover('');
            setTagSuggestions([]);
            setTagMenuOpen(false);
            setRawPriceInput('');
            setInputCurrency('THB');
            setShowPresets(false);
        }
        // Intentionally omit `tags` — only reset when modal open / subscription changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [subscription, isOpen, todayStr, language]);

    // Debounced tag search (ILIKE via API)
    useEffect(() => {
        if (!isOpen) return;
        const q = tagQuery.trim();
        if (!q) {
            setTagSuggestions([]);
            setTagSearching(false);
            return;
        }

        const seq = ++tagSearchSeq.current;
        setTagSearching(true);
        const timer = window.setTimeout(async () => {
            try {
                const results = await searchTags(q);
                if (seq === tagSearchSeq.current) {
                    setTagSuggestions(results);
                }
            } catch (err) {
                console.error(err);
                if (seq === tagSearchSeq.current) {
                    // Fallback: filter local tags
                    const lower = q.toLowerCase();
                    setTagSuggestions(
                        tags.filter(
                            (t) =>
                                t.nameEn.toLowerCase().includes(lower) ||
                                t.nameTh.toLowerCase().includes(lower)
                        )
                    );
                }
            } finally {
                if (seq === tagSearchSeq.current) setTagSearching(false);
            }
        }, 250);

        return () => window.clearTimeout(timer);
    }, [tagQuery, isOpen, tags]);

    // Close tag dropdown on outside click
    useEffect(() => {
        if (!tagMenuOpen) return;
        const onPointerDown = (e: PointerEvent) => {
            if (tagWrapRef.current && !tagWrapRef.current.contains(e.target as Node)) {
                setTagMenuOpen(false);
            }
        };
        document.addEventListener('pointerdown', onPointerDown);
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [tagMenuOpen]);

    const handleRecalcNextBilling = () => {
        const next = calculateNextBillingDate(
            form.startDate || todayStr,
            form.billingCycle,
            undefined,
            form.customIntervalDays || 1
        );
        setForm((prev) => ({ ...prev, nextBillingDate: next }));
    };

    const handleNextBillingDateChange = (val: string) => {
        setForm((prev) => ({ ...prev, nextBillingDate: val }));
    };

    const handleStartDateChange = (newStartDate: string) => {
        const next = calculateNextBillingDate(
            newStartDate,
            form.billingCycle,
            undefined,
            form.customIntervalDays || 1
        );
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

    const handleTagInputChange = (value: string) => {
        if (value.includes(',')) {
            const parts = value.split(',');
            const completed = parts.slice(0, -1).map((p) => p.trim()).filter(Boolean);
            const rest = parts[parts.length - 1] ?? '';
            if (completed.length > 0) commitTagNames(completed);
            setTagQuery(rest);
            setTagMenuOpen(Boolean(rest.trim()));
            return;
        }
        setTagQuery(value);
        setTagMenuOpen(Boolean(value.trim()));
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
            const selectedCat = categories.find((c) => c.key === form.category);

            // Commit leftover query text as a tag name
            const leftover = tagQuery.trim();
            const namesToCreate = [
                ...pendingTagNames,
                ...(leftover && !isNameAlreadySelected(leftover) ? [leftover] : []),
            ];

            const resolvedIds = [...(form.tagIds || [])];
            for (const name of namesToCreate) {
                const existing = findExactTag(name);
                if (existing) {
                    if (!resolvedIds.includes(existing.id)) resolvedIds.push(existing.id);
                    continue;
                }
                const created = await addTag({ nameTh: name, nameEn: name });
                if (!resolvedIds.includes(created.id)) resolvedIds.push(created.id);
            }

            const resolvedProjectIds = await resolvePendingChipNames(
                pendingProjectNames,
                projectQueryLeftover,
                form.projectIds || [],
                projects,
                async (name) => addProject({ nameTh: name, nameEn: name })
            );

            const payload: SubscriptionInput = {
                ...form,
                price: finalThbPrice,
                currency: 'THB',
                customIntervalDays: form.billingCycle === 'daily' ? (form.customIntervalDays || 1) : undefined,
                startDate: form.startDate || todayStr,
                nextBillingDate: form.nextBillingDate?.trim() || computedNextDate,
                categoryId: selectedCat?.id || form.categoryId || null,
                tagIds: resolvedIds,
                tagId: resolvedIds[0] || null,
                projectIds: resolvedProjectIds,
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
                                    {t.modals.popularPresets}
                                </span>
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                                        {t.modals.itemsCount.replace('{count}', String(POPULAR_PRESETS.length))}
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
                                                {t.modals.autoConvertThb}
                                            </span>
                                            <span className="font-bold text-primary text-sm">
                                                ฿{convertUsdToThb(parseFloat(rawPriceInput) || 0, usdRate).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                            <span>
                                                1 USD ≈ ฿{usdRate}{' '}
                                                {isRateFallback ? t.modals.fallbackRate : t.modals.liveRate}
                                            </span>
                                            {isRateLoading && (
                                                <span className="animate-pulse flex items-center gap-1 text-primary">
                                                    <RefreshCw className="w-2.5 h-2.5 animate-spin" /> {t.modals.updatingRate}
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
                                        <SelectItem value="half_yearly">{t.modals.cycleHalfYearly}</SelectItem>
                                        <SelectItem value="yearly">{t.modals.cycleYearly}</SelectItem>
                                        <SelectItem value="quarterly">{t.modals.cycleQuarterly}</SelectItem>
                                        <SelectItem value="weekly">{t.modals.cycleWeekly}</SelectItem>
                                        <SelectItem value="daily">{t.modals.cycleDaily}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Custom Days Input (แสดงเมื่อเลือกรายวัน) */}
                        {form.billingCycle === 'daily' && (
                            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                <Label htmlFor="customDays" className="text-xs font-medium text-indigo-300">
                                    {t.modals.customIntervalDays} *
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
                                        {t.modals.daysUnit}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Start Date & Next Billing Date */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="startDate" className="text-xs font-medium flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                    {t.modals.startDate}
                                </Label>
                                <ThaiDatePicker
                                    id="startDate"
                                    value={form.startDate || todayStr}
                                    onChange={handleStartDateChange}
                                    language={language}
                                    showFullSubtitle={true}
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                    <Label htmlFor="nextBillingDate" className="text-xs font-medium flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                        {t.modals.nextBillingDate}
                                    </Label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleRecalcNextBilling}
                                        className="h-5 px-1.5 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                                    >
                                        <RefreshCw className="w-3 h-3" />
                                        {t.modals.autoCalc}
                                    </Button>
                                </div>
                                <ThaiDatePicker
                                    id="nextBillingDate"
                                    placeholder={t.modals.pickOrAutoCalc}
                                    value={form.nextBillingDate || ''}
                                    onChange={handleNextBillingDateChange}
                                    language={language}
                                    showFullSubtitle={true}
                                    required
                                />
                                <p className="text-[11px] text-muted-foreground px-0.5">
                                    {t.modals.autoCalculatedHint}
                                </p>
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
                                        {t.modals.manage}
                                    </Button>
                                </div>
                                <Select
                                    value={form.category}
                                    onValueChange={(val) => {
                                        const selectedCat = categories.find((c) => c.key === val);
                                        setForm({
                                            ...form,
                                            category: val,
                                            categoryId: selectedCat?.id || null,
                                        });
                                    }}
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

                        {/* Tag multi autocomplete */}
                        <div className="space-y-1.5" ref={tagWrapRef}>
                            <Label htmlFor="tag" className="text-xs font-medium">
                                {t.modals.tag}
                                <span className="ml-1.5 font-normal text-muted-foreground">
                                    ({t.modals.tagHint})
                                </span>
                            </Label>

                            {(selectedTagItems.length > 0 || pendingTagNames.length > 0) && (
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedTagItems.map((tag) => (
                                        <span
                                            key={tag.id}
                                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs ${tag.bg || 'bg-sky-500/10 border-sky-500/20'} ${tag.color || 'text-sky-400'}`}
                                        >
                                            {tagLabel(tag)}
                                            <button
                                                type="button"
                                                className="opacity-70 hover:opacity-100"
                                                onClick={() => removeSelectedTagId(tag.id)}
                                                aria-label="Remove tag"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                    {pendingTagNames.map((name) => (
                                        <span
                                            key={`pending-${name}`}
                                            className="inline-flex items-center gap-1 rounded-md border border-dashed border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400"
                                        >
                                            {name}
                                            <button
                                                type="button"
                                                className="opacity-70 hover:opacity-100"
                                                onClick={() => removePendingName(name)}
                                                aria-label="Remove tag"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="relative">
                                <Input
                                    id="tag"
                                    autoComplete="off"
                                    placeholder={t.modals.tagPlaceholder}
                                    value={tagQuery}
                                    onChange={(e) => handleTagInputChange(e.target.value)}
                                    onFocus={() => {
                                        if (tagQuery.trim()) setTagMenuOpen(true);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') {
                                            setTagMenuOpen(false);
                                            return;
                                        }
                                        if (e.key === 'Enter' || e.key === 'Tab') {
                                            if (tagQuery.trim()) {
                                                e.preventDefault();
                                                commitTagQuery();
                                            }
                                        }
                                        if (e.key === 'Backspace' && !tagQuery) {
                                            if (pendingTagNames.length > 0) {
                                                removePendingName(pendingTagNames[pendingTagNames.length - 1]);
                                            } else if ((form.tagIds || []).length > 0) {
                                                const last = form.tagIds![form.tagIds!.length - 1];
                                                removeSelectedTagId(last);
                                            }
                                        }
                                    }}
                                />
                                {tagMenuOpen && tagQuery.trim() && (
                                    <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
                                        {tagSearching && tagSuggestions.length === 0 ? (
                                            <div className="px-3 py-2 text-xs text-muted-foreground">
                                                {t.modals.tagSearching}
                                            </div>
                                        ) : tagSuggestions.filter((s) => !(form.tagIds || []).includes(s.id)).length > 0 ? (
                                            <ul className="max-h-48 overflow-y-auto py-1">
                                                {tagSuggestions
                                                    .filter((s) => !(form.tagIds || []).includes(s.id))
                                                    .map((tag) => (
                                                        <li key={tag.id}>
                                                            <button
                                                                type="button"
                                                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                                                                onMouseDown={(e) => e.preventDefault()}
                                                                onClick={() => addTagByItem(tag)}
                                                            >
                                                                <span
                                                                    className={`h-2 w-2 shrink-0 rounded-full ${tag.bg || 'bg-sky-500/40'}`}
                                                                />
                                                                <span>{tagLabel(tag)}</span>
                                                            </button>
                                                        </li>
                                                    ))}
                                            </ul>
                                        ) : (
                                            <div className="px-3 py-2 text-xs text-muted-foreground">
                                                {t.modals.tagCreateHint.replace('{name}', tagQuery.trim())}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <MultiChipAutocomplete
                            label={t.modals.project}
                            hint={t.modals.projectHint}
                            placeholder={t.modals.projectPlaceholder}
                            searchingLabel={t.modals.projectSearching}
                            createHint={(name) => t.modals.projectCreateHint.replace('{name}', name)}
                            language={language}
                            items={projects}
                            selectedIds={form.projectIds || []}
                            pendingNames={pendingProjectNames}
                            onSelectedIdsChange={(ids) => setForm((prev) => ({ ...prev, projectIds: ids }))}
                            onPendingNamesChange={setPendingProjectNames}
                            onSearch={searchProjects}
                            onCreate={async (name) => addProject({ nameTh: name, nameEn: name })}
                            onQueryChange={setProjectQueryLeftover}
                        />

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
                                        {[1, 2, 3, 5, 7].map((days) => (
                                            <SelectItem key={days} value={String(days)}>
                                                {t.modals.reminderDayOption.replace(/\{days\}/g, String(days))}
                                            </SelectItem>
                                        ))}
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
                                <span>{t.modals.notes}</span>
                                <span className="text-[10px] text-muted-foreground font-normal">{t.modals.optional}</span>
                            </Label>
                            <Textarea
                                id="notes"
                                placeholder={t.modals.notesPlaceholder}
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
