"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Calendar as CalendarIcon, CalendarCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatToThaiDate, formatLocalizedDate } from '@/lib/date/thai-date';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface ThaiDatePickerProps {
    id?: string;
    value: string; // ISO format: YYYY-MM-DD
    onChange: (value: string) => void;
    placeholder?: string;
    language?: 'th' | 'en';
    disabled?: boolean;
    className?: string;
    min?: string;
    max?: string;
    required?: boolean;
    showFullSubtitle?: boolean;
}

const WEEKDAYS_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const WEEKDAYS_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function parseISODate(iso: string): Date | null {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return isNaN(date.getTime()) ? null : date;
}

function toISODate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, delta: number): Date {
    return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function isSameDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

function clampDate(date: Date, min?: string, max?: string): boolean {
    const iso = toISODate(date);
    if (min && iso < min) return false;
    if (max && iso > max) return false;
    return true;
}

/**
 * Floating calendar popup (Popover portal) — does not push dialog layout down.
 */
export const ThaiDatePicker: React.FC<ThaiDatePickerProps> = ({
    id,
    value,
    onChange,
    placeholder,
    language = 'th',
    disabled = false,
    className,
    min,
    max,
    required = false,
    showFullSubtitle = false,
}) => {
    const isTh = language === 'th';
    const [open, setOpen] = useState(false);

    const selected = useMemo(() => parseISODate(value), [value]);
    const [viewMonth, setViewMonth] = useState<Date>(() =>
        startOfMonth(selected || new Date())
    );

    useEffect(() => {
        if (open) {
            setViewMonth(startOfMonth(selected || new Date()));
        }
    }, [open, selected]);

    const displayValue = value ? formatLocalizedDate(value, language, 'medium') : '';
    const fullDisplay = value && isTh ? formatToThaiDate(value, 'full') : '';

    const monthLabel = useMemo(() => {
        const y = viewMonth.getFullYear();
        const m = viewMonth.getMonth();
        if (isTh) {
            const thMonths = [
                'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
            ];
            return `${thMonths[m]} ${y + 543}`;
        }
        return viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }, [viewMonth, isTh]);

    const days = useMemo(() => {
        const first = startOfMonth(viewMonth);
        const startWeekday = first.getDay();
        const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
        const cells: Array<Date | null> = [];
        for (let i = 0; i < startWeekday; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) {
            cells.push(new Date(first.getFullYear(), first.getMonth(), d));
        }
        while (cells.length % 7 !== 0) cells.push(null);
        return cells;
    }, [viewMonth]);

    const weekdays = isTh ? WEEKDAYS_TH : WEEKDAYS_EN;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pickDate = (date: Date) => {
        if (!clampDate(date, min, max)) return;
        onChange(toISODate(date));
        setOpen(false);
    };

    return (
        <div className="w-full space-y-1">
            <input
                id={id}
                type="text"
                tabIndex={-1}
                readOnly
                required={required}
                value={value || ''}
                className="sr-only"
                aria-hidden
            />

            <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)} modal>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        disabled={disabled}
                        aria-haspopup="dialog"
                        aria-expanded={open}
                        className={cn(
                            'relative flex items-center w-full h-10 sm:h-9 px-3 rounded-md border border-input bg-card/60 text-sm shadow-xs transition-all text-left',
                            'hover:border-primary/60 hover:bg-muted/30 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                            open && 'border-ring ring-[3px] ring-ring/50',
                            disabled && 'opacity-50 cursor-not-allowed',
                            !disabled && 'cursor-pointer',
                            className
                        )}
                    >
                        <CalendarIcon className="w-4 h-4 text-primary shrink-0 mr-2" />

                        <div className="flex-1 flex items-center justify-between min-w-0 pr-2">
                            {displayValue ? (
                                <div className="flex items-center gap-2 truncate">
                                    <span className="font-semibold text-foreground truncate">{displayValue}</span>
                                    {isTh && (
                                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium shrink-0">
                                            พ.ศ.
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <span className="text-muted-foreground text-xs select-none">
                                    {placeholder || (isTh ? 'เลือกวันที่...' : 'Select date...')}
                                </span>
                            )}
                        </div>

                        <span className="text-[11px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/40 shrink-0">
                            {isTh ? 'เลือก' : 'Pick'}
                        </span>
                    </button>
                </PopoverTrigger>

                <PopoverContent
                    align="start"
                    side="bottom"
                    sideOffset={6}
                    collisionPadding={12}
                    className="z-[100] w-[min(18.5rem,calc(100vw-2rem))] p-3"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-muted"
                            onClick={() => setViewMonth((m) => addMonths(m, -1))}
                            aria-label={isTh ? 'เดือนก่อน' : 'Previous month'}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <div className="text-sm font-semibold text-foreground">{monthLabel}</div>
                        <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-muted"
                            onClick={() => setViewMonth((m) => addMonths(m, 1))}
                            aria-label={isTh ? 'เดือนถัดไป' : 'Next month'}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="mb-1 grid grid-cols-7 gap-1">
                        {weekdays.map((d) => (
                            <div
                                key={d}
                                className="h-7 text-center text-[10px] font-medium text-muted-foreground leading-7"
                            >
                                {d}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {days.map((date, idx) => {
                            if (!date) {
                                return <div key={`empty-${idx}`} className="h-8" />;
                            }
                            const enabled = clampDate(date, min, max);
                            const isSelected = selected ? isSameDay(date, selected) : false;
                            const isToday = isSameDay(date, today);

                            return (
                                <button
                                    key={toISODate(date)}
                                    type="button"
                                    disabled={!enabled}
                                    onClick={() => pickDate(date)}
                                    className={cn(
                                        'h-8 rounded-md text-xs font-medium transition-colors',
                                        enabled && 'hover:bg-accent hover:text-accent-foreground',
                                        !enabled && 'opacity-30 cursor-not-allowed',
                                        isSelected &&
                                            'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
                                        !isSelected && isToday && 'border border-primary/40 text-primary'
                                    )}
                                >
                                    {date.getDate()}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/60 pt-2">
                        <button
                            type="button"
                            className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                            onClick={() => pickDate(today)}
                            disabled={!clampDate(today, min, max)}
                        >
                            {isTh ? 'วันนี้' : 'Today'}
                        </button>
                        <button
                            type="button"
                            className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                            onClick={() => setOpen(false)}
                        >
                            {isTh ? 'ปิด' : 'Close'}
                        </button>
                    </div>
                </PopoverContent>
            </Popover>

            {showFullSubtitle && fullDisplay && (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground px-1">
                    <CalendarCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span className="truncate">{fullDisplay}</span>
                </div>
            )}
        </div>
    );
};
