"use client";

import React, { useRef } from 'react';
import { Calendar as CalendarIcon, CalendarCheck } from 'lucide-react';
import { formatToThaiDate, formatLocalizedDate } from '@/lib/date/thai-date';
import { cn } from '@/lib/utils';

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
    const inputRef = useRef<HTMLInputElement>(null);

    const handleClick = () => {
        if (disabled) return;
        try {
            if (inputRef.current && 'showPicker' in HTMLInputElement.prototype) {
                inputRef.current.showPicker();
            } else {
                inputRef.current?.focus();
            }
        } catch {
            inputRef.current?.focus();
        }
    };

    const isTh = language === 'th';
    const displayValue = value
        ? formatLocalizedDate(value, language, 'medium')
        : '';
    const fullDisplay = value && isTh ? formatToThaiDate(value, 'full') : '';

    return (
        <div className="w-full space-y-1">
            <div
                onClick={handleClick}
                className={cn(
                    "relative flex items-center w-full h-9 px-3 rounded-md border border-input bg-card/60 text-sm shadow-xs cursor-pointer transition-all hover:border-primary/60 hover:bg-muted/30 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
                    disabled && "opacity-50 cursor-not-allowed pointer-events-none",
                    className
                )}
            >
                {/* Visual Icon */}
                <CalendarIcon className="w-4 h-4 text-primary shrink-0 mr-2" />

                {/* Formatted Date Display */}
                <div className="flex-1 flex items-center justify-between min-w-0 pr-2">
                    {displayValue ? (
                        <div className="flex items-center gap-2 truncate">
                            <span className="font-semibold text-foreground truncate">
                                {displayValue}
                            </span>
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

                {/* Hidden native date input for native picker accessibility & mobile support */}
                <input
                    ref={inputRef}
                    id={id}
                    type="date"
                    required={required}
                    disabled={disabled}
                    min={min}
                    max={max}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    className="sr-only"
                    tabIndex={0}
                    aria-label={placeholder || 'Date picker'}
                />

                <span className="text-[11px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/40 shrink-0 pointer-events-none">
                    เปลี่ยน
                </span>
            </div>

            {/* Subtitle with full Thai format if requested */}
            {showFullSubtitle && fullDisplay && (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground px-1">
                    <CalendarCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span className="truncate">{fullDisplay}</span>
                </div>
            )}
        </div>
    );
};
