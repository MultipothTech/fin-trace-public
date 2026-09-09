import React from 'react';
import {
    icons,
    MoreHorizontal,
    Tag,
} from 'lucide-react';
import { SUBSCRIPTION_CATEGORIES } from '@/config/constants';
import type { CategoryItem, Language } from '@/features/subscriptions/types/subscription.types';

export const ICON_MAP: Record<string, React.ElementType> = icons as unknown as Record<string, React.ElementType>;

export interface ResolvedCategory {
    key: string;
    label: string;
    Icon: React.ElementType;
    color: string;
    bg: string;
}

/**
 * ดึงข้อมูล Category (Icon, Color, Label, Bg) โดยอ้างอิงจาก categories ของผู้ใช้ก่อน
 * ถ้าไม่มี ให้ fallback ไปที่ SUBSCRIPTION_CATEGORIES default mapping
 */
export function resolveCategory(
    categoryKey: string | undefined,
    customCategories: CategoryItem[] = [],
    language: Language = 'th'
): ResolvedCategory {
    const key = categoryKey || 'other';

    // 1. ตรวจสอบใน Custom Categories ก่อน
    const custom = customCategories.find((c) => c.key === key);
    if (custom) {
        const IconComponent = (custom.icon && ICON_MAP[custom.icon]) || Tag;
        return {
            key: custom.key,
            label: language === 'th' ? (custom.label_th || custom.label_en) : (custom.label_en || custom.label_th),
            Icon: IconComponent,
            color: custom.color || 'text-indigo-400',
            bg: custom.bg || 'bg-indigo-500/10',
        };
    }

    // 2. Fallback ไปที่ default mapping ใน SUBSCRIPTION_CATEGORIES
    const defaultPreset = SUBSCRIPTION_CATEGORIES[key] || SUBSCRIPTION_CATEGORIES.other;
    return {
        key,
        label: language === 'th' ? defaultPreset.label_th : defaultPreset.label_en,
        Icon: defaultPreset.icon || MoreHorizontal,
        color: defaultPreset.color || 'text-zinc-400',
        bg: defaultPreset.bg || 'bg-zinc-500/10',
    };
}
