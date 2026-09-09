"use client";

import React, { useMemo } from 'react';
import type { TagItem, Language } from '@/features/subscriptions/types/subscription.types';
import { UNTAGGED_COLOR, tagColorToHex } from '@/lib/tags/tag-colors';

export interface TagExpenseSlice {
    key: string;
    label: string;
    total: number;
    hex: string;
    colorClass: string;
    bgClass: string;
}

interface TagExpensePieProps {
    slices: TagExpenseSlice[];
    monthlyTotal: number;
    language: Language;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
        x: cx + r * Math.cos(rad),
        y: cy + r * Math.sin(rad),
    };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

export function buildLabeledExpenseSlices(
    entries: Array<{ id: string | null | undefined; amount: number }>,
    catalog: Array<{ id: string; nameEn: string; nameTh: string; color?: string; bg?: string }>,
    language: Language
): TagExpenseSlice[] {
    const totals = new Map<string, number>();

    for (const entry of entries) {
        const key = entry.id || '__other__';
        totals.set(key, (totals.get(key) || 0) + entry.amount);
    }

    const slices: TagExpenseSlice[] = [];

    for (const [key, total] of totals.entries()) {
        if (total <= 0) continue;

        if (key === '__other__') {
            slices.push({
                key,
                label: language === 'th' ? 'อื่นๆ' : 'Other',
                total,
                hex: UNTAGGED_COLOR.hex,
                colorClass: UNTAGGED_COLOR.color,
                bgClass: UNTAGGED_COLOR.bg,
            });
            continue;
        }

        const item = catalog.find((t) => t.id === key);
        const label = item
            ? language === 'th'
                ? item.nameTh || item.nameEn
                : item.nameEn || item.nameTh
            : language === 'th'
              ? 'อื่นๆ'
              : 'Other';

        slices.push({
            key,
            label: item ? label : language === 'th' ? 'อื่นๆ' : 'Other',
            total,
            hex: item ? tagColorToHex(item.color) : UNTAGGED_COLOR.hex,
            colorClass: item?.color || UNTAGGED_COLOR.color,
            bgClass: item?.bg || UNTAGGED_COLOR.bg,
        });
    }

    slices.sort((a, b) => {
        if (a.key === '__other__') return 1;
        if (b.key === '__other__') return -1;
        return b.total - a.total;
    });

    return slices;
}

export function buildTagExpenseSlices(
    entries: Array<{ tagId: string | null | undefined; amount: number }>,
    tags: TagItem[],
    language: Language
): TagExpenseSlice[] {
    return buildLabeledExpenseSlices(
        entries.map((e) => ({ id: e.tagId, amount: e.amount })),
        tags,
        language
    );
}

export const TagExpensePie: React.FC<TagExpensePieProps> = ({
    slices,
    monthlyTotal,
    language,
}) => {
    const size = 160;
    const cx = size / 2;
    const cy = size / 2;
    const r = 68;

    const paths = useMemo(() => {
        const sum = slices.reduce((acc, s) => acc + s.total, 0);
        if (sum <= 0) return [];

        // Single slice → full circle
        if (slices.length === 1) {
            return [
                {
                    key: slices[0].key,
                    d: `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`,
                    hex: slices[0].hex,
                },
            ];
        }

        let angle = 0;
        return slices.map((slice) => {
            const sweep = (slice.total / sum) * 360;
            const start = angle;
            const end = angle + sweep;
            angle = end;
            return {
                key: slice.key,
                d: describeArc(cx, cy, r, start, end),
                hex: slice.hex,
            };
        });
    }, [slices, cx, cy, r]);

    if (slices.length === 0) {
        return (
            <div className="text-center py-6 text-xs text-muted-foreground">
                {language === 'th' ? 'ยังไม่มีข้อมูลแท็ก' : 'No tag data yet'}
            </div>
        );
    }

    return (
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="shrink-0"
                role="img"
                aria-label={language === 'th' ? 'กราฟสัดส่วนตามแท็ก' : 'Expense by tag pie chart'}
            >
                {paths.map((p) => (
                    <path key={p.key} d={p.d} fill={p.hex} stroke="hsl(var(--card))" strokeWidth={2} />
                ))}
                <circle cx={cx} cy={cy} r={34} fill="var(--card)" />
            </svg>

            <ul className="w-full space-y-2 min-w-0">
                {slices.map((slice) => {
                    const pct = monthlyTotal > 0 ? Math.round((slice.total / monthlyTotal) * 100) : 0;
                    return (
                        <li key={slice.key} className="flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                                <span
                                    className="h-2.5 w-2.5 rounded-full shrink-0 ring-1 ring-black/5"
                                    style={{ backgroundColor: slice.hex }}
                                />
                                <span className={`truncate font-medium ${slice.colorClass}`}>
                                    {slice.label}
                                </span>
                            </div>
                            <span className="text-muted-foreground shrink-0 tabular-nums">
                                ฿{Math.round(slice.total).toLocaleString()} ({pct}%)
                            </span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};
