'use client';

import React, { useMemo } from 'react';
import { Tag } from 'lucide-react';
import { ICON_MAP } from '@/features/subscriptions/utils/category-helper';
import { TheSvgIcon } from '@/components/icons/thesvg-icon';
import { getTheSvgSlug, isTheSvgIcon } from '@/lib/icons/thesvg-utils';
import { cn } from '@/lib/utils';

export interface CategoryIconProps {
    icon?: string | null;
    className?: string;
}

/**
 * Renders either a Lucide icon or a theSVG brand logo based on icon value.
 * theSVG values use prefix `thesvg:{slug}` (e.g. thesvg:netflix).
 */
export const CategoryIcon: React.FC<CategoryIconProps> = ({ icon, className }) => {
    const theSvgSlug = useMemo(() => getTheSvgSlug(icon), [icon]);

    if (theSvgSlug) {
        return <TheSvgIcon slug={theSvgSlug} className={className} />;
    }

    if (isTheSvgIcon(icon)) {
        return <Tag className={cn(className)} />;
    }

    const LucideIcon = (icon && ICON_MAP[icon]) || Tag;
    return <LucideIcon className={className} />;
};
