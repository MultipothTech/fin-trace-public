"use client";

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/providers/app-store';
import { TRANSLATIONS } from '@/config/constants';
import type { CategoryItem, CategoryInput, Language } from '@/features/subscriptions/types/subscription.types';
import {
    icons,
    Plus,
    Pencil,
    Trash2,
    Check,
    FolderKanban,
    Tag,
    Search,
} from 'lucide-react';

// Build full icon map from lucide-react
const ICON_MAP: Record<string, React.ElementType> = icons as unknown as Record<string, React.ElementType>;

// Pre-compute sorted icon name list (exclude internal/utility icons)
const ALL_ICON_NAMES = Object.keys(icons).sort();

const ICONS_PER_PAGE = 30;

const COLOR_PALETTES = [
    { name: 'Indigo', color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
    { name: 'Violet', color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
    { name: 'Blue', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    { name: 'Cyan', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
    { name: 'Emerald', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { name: 'Amber', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    { name: 'Orange', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
    { name: 'Rose', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
    { name: 'Pink', color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20' },
];

interface CategoryManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    language: Language;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
    isOpen,
    onClose,
    language,
}) => {
    const { categories, addCategory, updateCategory, deleteCategory } = useApp();
    const t = TRANSLATIONS[language] || TRANSLATIONS.th;

    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState<CategoryInput>({
        key: '',
        nameTh: '',
        nameEn: '',
        icon: 'Tag',
        color: 'text-indigo-400',
        bg: 'bg-indigo-500/10 border-indigo-500/20',
    });
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [deleteCatTarget, setDeleteCatTarget] = useState<CategoryItem | null>(null);
    const [isDeletingCat, setIsDeletingCat] = useState(false);

    // Icon picker state
    const [iconSearch, setIconSearch] = useState('');
    const [visibleCount, setVisibleCount] = useState(ICONS_PER_PAGE);
    const iconScrollRef = useRef<HTMLDivElement>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);

    // Filtered icon list based on search
    const filteredIcons = useMemo(() => {
        if (!iconSearch.trim()) return ALL_ICON_NAMES;
        const q = iconSearch.trim().toLowerCase();
        return ALL_ICON_NAMES.filter((name) => name.toLowerCase().includes(q));
    }, [iconSearch]);

    // Visible slice
    const visibleIcons = useMemo(
        () => filteredIcons.slice(0, visibleCount),
        [filteredIcons, visibleCount]
    );
    const hasMore = visibleCount < filteredIcons.length;

    // Reset visible count when search changes
    useEffect(() => {
        setVisibleCount(ICONS_PER_PAGE);
    }, [iconSearch]);

    // IntersectionObserver for infinite scroll
    const observerCallback = useCallback(
        (entries: IntersectionObserverEntry[]) => {
            if (entries[0]?.isIntersecting && hasMore) {
                setVisibleCount((prev) => prev + ICONS_PER_PAGE);
            }
        },
        [hasMore]
    );

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;
        const observer = new IntersectionObserver(observerCallback, {
            root: iconScrollRef.current,
            threshold: 0.1,
        });
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [observerCallback, isEditing]);

    const resetForm = () => {
        setIsEditing(false);
        setEditId(null);
        setForm({
            key: '',
            nameTh: '',
            nameEn: '',
            icon: 'Tag',
            color: 'text-indigo-400',
            bg: 'bg-indigo-500/10 border-indigo-500/20',
        });
        setErrorMsg('');
        setIconSearch('');
        setVisibleCount(ICONS_PER_PAGE);
    };

    const handleStartCreate = () => {
        resetForm();
        setIsEditing(true);
    };

    const handleStartEdit = (cat: CategoryItem) => {
        if (cat.isSystem) return;
        setIsEditing(true);
        setEditId(cat.id || null);
        setForm({
            key: cat.key,
            nameTh: cat.label_th,
            nameEn: cat.label_en,
            icon: cat.icon || 'Tag',
            color: cat.color || 'text-indigo-400',
            bg: cat.bg || 'bg-indigo-500/10 border-indigo-500/20',
        });
        setErrorMsg('');
    };

    const handleDeleteClick = (cat: CategoryItem) => {
        if (cat.isSystem) return;
        setDeleteCatTarget(cat);
    };

    const handleConfirmDeleteCat = async () => {
        if (!deleteCatTarget?.id) return;
        setIsDeletingCat(true);
        try {
            await deleteCategory(deleteCatTarget.id);
            if (editId === deleteCatTarget.id) resetForm();
            setDeleteCatTarget(null);
        } catch (err) {
            console.error(err);
            setErrorMsg(language === 'th' ? 'เกิดข้อผิดพลาดในการลบ' : 'Failed to delete category');
        } finally {
            setIsDeletingCat(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.nameTh.trim() && !form.nameEn.trim()) {
            setErrorMsg(language === 'th' ? 'กรุณากรอกชื่อหมวดหมู่' : 'Please provide category name');
            return;
        }

        setSubmitting(true);
        setErrorMsg('');
        try {
            const finalTh = form.nameTh.trim() || form.nameEn.trim();
            const finalEn = form.nameEn.trim() || form.nameTh.trim();
            const payload: CategoryInput = {
                key: form.key.trim() || `custom_${Date.now()}`,
                nameTh: finalTh,
                nameEn: finalEn,
                icon: form.icon,
                color: form.color,
                bg: form.bg,
            };

            if (editId) {
                await updateCategory(editId, payload);
            } else {
                await addCategory(payload);
            }
            resetForm();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to save';
            setErrorMsg(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const renderIcon = useCallback((iconName?: string, className = 'w-4 h-4') => {
        const IconComponent = (iconName && ICON_MAP[iconName]) || Tag;
        return <IconComponent className={className} />;
    }, []);

    return (
        <>
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { resetForm(); onClose(); } }}>
            <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FolderKanban className="w-5 h-5 text-indigo-400" />
                        {language === 'th' ? 'จัดการหมวดหมู่บริการ' : 'Manage Subscription Categories'}
                    </DialogTitle>
                </DialogHeader>

                {errorMsg && (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                        {errorMsg}
                    </div>
                )}

                {!isEditing ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">
                                {language === 'th' ? 'หมวดหมู่ทั้งหมด' : 'All Categories'} ({categories.length})
                            </Label>
                            <Button size="sm" onClick={handleStartCreate} className="h-8 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700">
                                <Plus className="w-3.5 h-3.5" />
                                {language === 'th' ? 'เพิ่มหมวดหมู่' : 'New Category'}
                            </Button>
                        </div>

                        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                            {categories.map((cat) => {
                                const isSys = cat.isSystem;
                                return (
                                    <div
                                        key={cat.key}
                                        className="flex items-center justify-between p-2.5 rounded-xl bg-card/60 border border-border/50 hover:border-border transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${cat.bg || 'bg-muted'} ${cat.color || 'text-foreground'}`}>
                                                {renderIcon(cat.icon)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium">
                                                    {language === 'th' ? cat.label_th : cat.label_en}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground">
                                                    {language === 'th' ? cat.label_en : cat.label_th}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            {isSys ? (
                                                <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/50">
                                                    {language === 'th' ? 'ค่าเริ่มต้น' : 'System'}
                                                </Badge>
                                            ) : (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                        onClick={() => handleStartEdit(cat)}
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                                                        onClick={() => handleDeleteClick(cat)}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="flex items-center justify-between border-b border-border/40 pb-2">
                            <span className="text-xs font-semibold text-foreground">
                                {editId ? (language === 'th' ? 'แก้ไขหมวดหมู่' : 'Edit Category') : (language === 'th' ? 'สร้างหมวดหมู่ใหม่' : 'Create Category')}
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7"
                                onClick={resetForm}
                            >
                                {t.modals.cancel}
                            </Button>
                        </div>

                        {/* Thai Name */}
                        <div className="space-y-1.5">
                            <Label htmlFor="catNameTh" className="text-xs font-medium">
                                {language === 'th' ? 'ชื่อหมวดหมู่ (ภาษาไทย)' : 'Category Name (TH)'} *
                            </Label>
                            <Input
                                id="catNameTh"
                                required
                                placeholder="เช่น คอร์สเรียนออนไลน์, ดูแลผิว, ท่องเที่ยว..."
                                value={form.nameTh}
                                onChange={(e) => setForm({ ...form, nameTh: e.target.value })}
                            />
                        </div>

                        {/* English Name */}
                        <div className="space-y-1.5">
                            <Label htmlFor="catNameEn" className="text-xs font-medium">
                                {language === 'th' ? 'ชื่อหมวดหมู่ (English)' : 'Category Name (EN)'}
                            </Label>
                            <Input
                                id="catNameEn"
                                placeholder="e.g. Online Courses, Skincare, Travel..."
                                value={form.nameEn}
                                onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                            />
                        </div>

                        {/* Icon Picker */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">
                                {language === 'th' ? 'เลือกไอคอน' : 'Select Icon'}
                                <span className="ml-1.5 text-muted-foreground font-normal">({filteredIcons.length})</span>
                            </Label>
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                <Input
                                    placeholder={language === 'th' ? 'ค้นหาไอคอน เช่น Heart, Star, Music...' : 'Search icons e.g. Heart, Star, Music...'}
                                    value={iconSearch}
                                    onChange={(e) => setIconSearch(e.target.value)}
                                    className="h-8 text-xs pl-8"
                                />
                            </div>
                            {/* Grid with infinite scroll */}
                            <div
                                ref={iconScrollRef}
                                className="grid grid-cols-5 sm:grid-cols-6 gap-1.5 p-2 rounded-xl bg-card/60 border border-border/50 max-h-48 overflow-y-auto"
                            >
                                {visibleIcons.map((iconName) => {
                                    const isSelected = form.icon === iconName;
                                    return (
                                        <button
                                            key={iconName}
                                            type="button"
                                            title={iconName}
                                            onClick={() => setForm({ ...form, icon: iconName })}
                                            className={`h-9 rounded-lg flex items-center justify-center transition-all ${
                                                isSelected
                                                    ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400/50'
                                                    : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            {renderIcon(iconName, 'w-4 h-4')}
                                        </button>
                                    );
                                })}
                                {/* Sentinel for infinite scroll */}
                                {hasMore && (
                                    <div ref={sentinelRef} className="col-span-6 h-4 flex items-center justify-center">
                                        <span className="text-[10px] text-muted-foreground animate-pulse">
                                            {language === 'th' ? 'กำลังโหลด...' : 'Loading more...'}
                                        </span>
                                    </div>
                                )}
                                {filteredIcons.length === 0 && (
                                    <div className="col-span-6 py-4 text-center text-xs text-muted-foreground">
                                        {language === 'th' ? 'ไม่พบไอคอนที่ค้นหา' : 'No icons found'}
                                    </div>
                                )}
                            </div>
                            {/* Selected icon preview */}
                            {form.icon && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{language === 'th' ? 'ไอคอนที่เลือก:' : 'Selected:'}</span>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 font-medium">
                                        {renderIcon(form.icon, 'w-3.5 h-3.5')}
                                        {form.icon}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Color Picker */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">
                                {language === 'th' ? 'เลือกชุดสี' : 'Select Color Palette'}
                            </Label>
                            <div className="flex flex-wrap gap-2">
                                {COLOR_PALETTES.map((palette) => {
                                    const isSelected = form.color === palette.color;
                                    return (
                                        <button
                                            key={palette.name}
                                            type="button"
                                            onClick={() => setForm({ ...form, color: palette.color, bg: palette.bg })}
                                            className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-all ${palette.bg} ${palette.color} ${
                                                isSelected ? 'ring-2 ring-primary ring-offset-1 ring-offset-background font-semibold' : 'opacity-80 hover:opacity-100'
                                            }`}
                                        >
                                            {isSelected && <Check className="w-3 h-3" />}
                                            {palette.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${form.bg} ${form.color}`}>
                                {renderIcon(form.icon, 'w-5 h-5')}
                            </div>
                            <div>
                                <div className="text-xs font-medium text-muted-foreground">{language === 'th' ? 'ตัวอย่างการแสดงผล' : 'Preview'}</div>
                                <div className="text-sm font-semibold">{form.nameTh || form.nameEn || (language === 'th' ? 'ชื่อหมวดหมู่' : 'Category Name')}</div>
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={resetForm} disabled={submitting}>
                                {t.modals.cancel}
                            </Button>
                            <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700">
                                {submitting ? '...' : editId ? (language === 'th' ? 'บันทึกการแก้ไข' : 'Save Changes') : (language === 'th' ? 'สร้างหมวดหมู่' : 'Create Category')}
                            </Button>
                        </DialogFooter>
                    </form>
                )}

                {!isEditing && (
                    <DialogFooter className="pt-2 border-t border-border/40">
                        <Button type="button" variant="outline" onClick={onClose} className="w-full">
                            {language === 'th' ? 'ปิด' : 'Close'}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>

        {/* Delete Category Confirmation Alert Dialog */}
        <AlertDialog
            open={!!deleteCatTarget}
            onOpenChange={(open) => !open && !isDeletingCat && setDeleteCatTarget(null)}
        >
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {language === 'th' ? 'ยืนยันการลบหมวดหมู่' : 'Delete Category'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {language === 'th'
                            ? `คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่ "${deleteCatTarget?.label_th || deleteCatTarget?.label_en || ''}"?`
                            : `Are you sure you want to delete category "${deleteCatTarget?.label_en || deleteCatTarget?.label_th || ''}"?`}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeletingCat}>
                        {language === 'th' ? 'ยกเลิก' : 'Cancel'}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirmDeleteCat}
                        disabled={isDeletingCat}
                    >
                        {isDeletingCat ? '...' : (language === 'th' ? 'ยืนยันการลบ' : 'Delete')}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    );
};
