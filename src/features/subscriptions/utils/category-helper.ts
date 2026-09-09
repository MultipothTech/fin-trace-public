'use client';

import React, { createElement } from 'react';
import {
    icons,
    MoreHorizontal,
    Tag,
} from 'lucide-react';
import { SUBSCRIPTION_CATEGORIES } from '@/config/constants';
import type { CategoryItem, Language } from '@/features/subscriptions/types/subscription.types';
import { getTheSvgSlug } from '@/lib/icons/thesvg-utils';
import { TheSvgIcon } from '@/components/icons/thesvg-icon';

export const ICON_MAP: Record<string, React.ElementType> = icons as unknown as Record<string, React.ElementType>;

export interface ResolvedCategory {
    key: string;
    label: string;
    Icon: React.ElementType;
    color: string;
    bg: string;
    iconName?: string;
}

const theSvgComponentCache = new Map<string, React.ElementType>();

function getTheSvgComponent(slug: string): React.ElementType {
    let Comp = theSvgComponentCache.get(slug);
    if (!Comp) {
        const Cached: React.FC<{ className?: string }> = ({ className }) =>
            createElement(TheSvgIcon, { slug, className });
        Cached.displayName = `TheSvg(${slug})`;
        Comp = Cached;
        theSvgComponentCache.set(slug, Comp);
    }
    return Comp;
}

function resolveIconComponent(iconName?: string): React.ElementType {
    const slug = getTheSvgSlug(iconName);
    if (slug) return getTheSvgComponent(slug);
    if (iconName && ICON_MAP[iconName]) return ICON_MAP[iconName];
    return Tag;
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

    const custom = customCategories.find((c) => c.key === key);
    if (custom) {
        return {
            key: custom.key,
            label: language === 'th' ? (custom.label_th || custom.label_en) : (custom.label_en || custom.label_th),
            Icon: resolveIconComponent(custom.icon),
            color: custom.color || 'text-indigo-400',
            bg: custom.bg || 'bg-indigo-500/10',
            iconName: custom.icon,
        };
    }

    const defaultPreset = SUBSCRIPTION_CATEGORIES[key] || SUBSCRIPTION_CATEGORIES.other;
    return {
        key,
        label: language === 'th' ? defaultPreset.label_th : defaultPreset.label_en,
        Icon: defaultPreset.icon || MoreHorizontal,
        color: defaultPreset.color || 'text-zinc-400',
        bg: defaultPreset.bg || 'bg-zinc-500/10',
    };
}
