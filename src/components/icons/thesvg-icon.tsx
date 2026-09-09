'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export interface TheSvgIconProps {
    slug: string;
    className?: string;
    title?: string;
}

const svgCache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

async function fetchTheSvg(slug: string): Promise<string> {
    const cached = svgCache.get(slug);
    if (cached) return cached;

    const pending = inflight.get(slug);
    if (pending) return pending;

    const promise = fetch(`/api/thesvg/${encodeURIComponent(slug)}`)
        .then(async (res) => {
            if (!res.ok) return '';
            const data = (await res.json()) as { svg?: string };
            const svg = data.svg || '';
            if (svg) svgCache.set(slug, svg);
            return svg;
        })
        .catch(() => '')
        .finally(() => {
            inflight.delete(slug);
        });

    inflight.set(slug, promise);
    return promise;
}

export const TheSvgIcon: React.FC<TheSvgIconProps> = ({ slug, className, title }) => {
    const [svg, setSvg] = useState<string>(() => svgCache.get(slug) || '');

    useEffect(() => {
        let alive = true;
        const cached = svgCache.get(slug);
        if (cached) {
            setSvg(cached);
            return;
        }
        setSvg('');
        fetchTheSvg(slug).then((html) => {
            if (alive) setSvg(html);
        });
        return () => {
            alive = false;
        };
    }, [slug]);

    if (!svg) {
        return (
            <span
                className={cn('inline-block shrink-0 rounded-sm bg-muted/60 animate-pulse', className)}
                aria-hidden
            />
        );
    }

    return (
        <span
            role="img"
            aria-label={title || slug}
            title={title || slug}
            className={cn(
                'inline-flex shrink-0 items-center justify-center overflow-hidden [&>svg]:h-full [&>svg]:w-full',
                className
            )}
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
};
