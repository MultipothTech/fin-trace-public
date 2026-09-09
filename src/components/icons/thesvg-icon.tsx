'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface TheSvgIconProps {
    slug: string;
    className?: string;
    title?: string;
}

function cdnUrl(slug: string): string {
    return `https://thesvg.org/icons/${encodeURIComponent(slug)}/default.svg`;
}

/** Brand logo from thesvg.org CDN (avoids bundling 6.5k icons with Turbopack). */
export const TheSvgIcon: React.FC<TheSvgIconProps> = ({ slug, className, title }) => {
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={cdnUrl(slug)}
            alt={title || slug}
            title={title || slug}
            className={cn('inline-block shrink-0 object-contain', className)}
            loading="lazy"
            decoding="async"
        />
    );
};
