"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface ChipItem {
    id: string;
    nameEn: string;
    nameTh: string;
    color?: string;
    bg?: string;
}

interface MultiChipAutocompleteProps {
    label: string;
    hint?: string;
    placeholder: string;
    searchingLabel: string;
    createHint: (name: string) => string;
    language: 'th' | 'en';
    items: ChipItem[];
    selectedIds: string[];
    pendingNames: string[];
    onSelectedIdsChange: (ids: string[]) => void;
    onPendingNamesChange: (names: string[]) => void;
    onSearch: (q: string) => Promise<ChipItem[]>;
    onCreate: (name: string) => Promise<ChipItem>;
    onQueryChange?: (q: string) => void;
}

export const MultiChipAutocomplete: React.FC<MultiChipAutocompleteProps> = ({
    label,
    hint,
    placeholder,
    searchingLabel,
    createHint,
    language,
    items,
    selectedIds,
    pendingNames,
    onSelectedIdsChange,
    onPendingNamesChange,
    onSearch,
    onQueryChange,
}) => {
    const isTh = language === 'th';
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<ChipItem[]>([]);
    const [menuOpen, setMenuOpen] = useState(false);
    const [searching, setSearching] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);
    const seq = useRef(0);

    const labelOf = (item: ChipItem) =>
        (isTh ? item.nameTh : item.nameEn) || item.nameEn || item.nameTh;

    const selectedItems = items.filter((i) => selectedIds.includes(i.id));

    const isNameTaken = (name: string, extraPending: string[] = pendingNames) => {
        const q = name.trim().toLowerCase();
        if (!q) return true;
        if (extraPending.some((n) => n.toLowerCase() === q)) return true;
        return selectedItems.some(
            (t) => t.nameEn.toLowerCase() === q || t.nameTh.toLowerCase() === q
        );
    };

    const findExact = (name: string, list: ChipItem[] = items) => {
        const q = name.trim().toLowerCase();
        return list.find(
            (t) => t.nameEn.toLowerCase() === q || t.nameTh.toLowerCase() === q
        );
    };

    const commitNames = (names: string[]) => {
        const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
        if (!unique.length) return;
        const addIds: string[] = [];
        const addPending: string[] = [];
        for (const name of unique) {
            if (isNameTaken(name, [...pendingNames, ...addPending])) continue;
            const existing = findExact(name) || findExact(name, suggestions);
            if (existing) {
                if (!selectedIds.includes(existing.id) && !addIds.includes(existing.id)) {
                    addIds.push(existing.id);
                }
            } else {
                addPending.push(name);
            }
        }
        if (addIds.length) {
            onSelectedIdsChange([...selectedIds, ...addIds.filter((id) => !selectedIds.includes(id))]);
        }
        if (addPending.length) {
            onPendingNamesChange([...pendingNames, ...addPending]);
        }
        setQuery('');
        onQueryChange?.('');
        setMenuOpen(false);
    };

    useEffect(() => {
        const q = query.trim();
        if (!q) {
            setSuggestions([]);
            setSearching(false);
            return;
        }
        const n = ++seq.current;
        setSearching(true);
        const timer = window.setTimeout(async () => {
            try {
                const results = await onSearch(q);
                if (n === seq.current) setSuggestions(results);
            } catch {
                if (n === seq.current) {
                    const lower = q.toLowerCase();
                    setSuggestions(
                        items.filter(
                            (t) =>
                                t.nameEn.toLowerCase().includes(lower) ||
                                t.nameTh.toLowerCase().includes(lower)
                        )
                    );
                }
            } finally {
                if (n === seq.current) setSearching(false);
            }
        }, 250);
        return () => window.clearTimeout(timer);
    }, [query, items, onSearch]);

    useEffect(() => {
        if (!menuOpen) return;
        const onPointerDown = (e: PointerEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('pointerdown', onPointerDown);
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [menuOpen]);

    return (
        <div className="space-y-1.5" ref={wrapRef}>
            <Label className="text-xs font-medium">
                {label}
                {hint ? (
                    <span className="ml-1.5 font-normal text-muted-foreground">({hint})</span>
                ) : null}
            </Label>

            {(selectedItems.length > 0 || pendingNames.length > 0) && (
                <div className="flex flex-wrap gap-1.5">
                    {selectedItems.map((item) => (
                        <span
                            key={item.id}
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs ${item.bg || 'bg-sky-500/10 border-sky-500/20'} ${item.color || 'text-sky-400'}`}
                        >
                            {labelOf(item)}
                            <button
                                type="button"
                                className="opacity-70 hover:opacity-100"
                                onClick={() =>
                                    onSelectedIdsChange(selectedIds.filter((id) => id !== item.id))
                                }
                            >
                                ×
                            </button>
                        </span>
                    ))}
                    {pendingNames.map((name) => (
                        <span
                            key={`pending-${name}`}
                            className="inline-flex items-center gap-1 rounded-md border border-dashed border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400"
                        >
                            {name}
                            <button
                                type="button"
                                className="opacity-70 hover:opacity-100"
                                onClick={() =>
                                    onPendingNamesChange(pendingNames.filter((n) => n !== name))
                                }
                            >
                                ×
                            </button>
                        </span>
                    ))}
                </div>
            )}

            <div className="relative">
                <Input
                    autoComplete="off"
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => {
                        const value = e.target.value;
                        if (value.includes(',')) {
                            const parts = value.split(',');
                            const completed = parts.slice(0, -1).map((p) => p.trim()).filter(Boolean);
                            const rest = parts[parts.length - 1] ?? '';
                            if (completed.length) commitNames(completed);
                            setQuery(rest);
                            setMenuOpen(Boolean(rest.trim()));
                            return;
                        }
                        setQuery(value);
                        onQueryChange?.(value);
                        setMenuOpen(Boolean(value.trim()));
                    }}
                    onFocus={() => {
                        if (query.trim()) setMenuOpen(true);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                            setMenuOpen(false);
                            return;
                        }
                        if ((e.key === 'Enter' || e.key === 'Tab') && query.trim()) {
                            e.preventDefault();
                            commitNames([query]);
                            onQueryChange?.('');
                        }
                        if (e.key === 'Backspace' && !query) {
                            if (pendingNames.length) {
                                onPendingNamesChange(pendingNames.slice(0, -1));
                            } else if (selectedIds.length) {
                                onSelectedIdsChange(selectedIds.slice(0, -1));
                            }
                        }
                    }}
                />
                {menuOpen && query.trim() && (
                    <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
                        {searching && suggestions.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-muted-foreground">{searchingLabel}</div>
                        ) : suggestions.filter((s) => !selectedIds.includes(s.id)).length > 0 ? (
                            <ul className="max-h-48 overflow-y-auto py-1">
                                {suggestions
                                    .filter((s) => !selectedIds.includes(s.id))
                                    .map((item) => (
                                        <li key={item.id}>
                                            <button
                                                type="button"
                                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => {
                                                    if (!selectedIds.includes(item.id)) {
                                                        onSelectedIdsChange([...selectedIds, item.id]);
                                                    }
                                                    setQuery('');
                                                    onQueryChange?.('');
                                                    setMenuOpen(false);
                                                }}
                                            >
                                                <span
                                                    className={`h-2 w-2 shrink-0 rounded-full ${item.bg || 'bg-sky-500/40'}`}
                                                />
                                                <span>{labelOf(item)}</span>
                                            </button>
                                        </li>
                                    ))}
                            </ul>
                        ) : (
                            <div className="px-3 py-2 text-xs text-muted-foreground">
                                {createHint(query.trim())}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

/** Resolve pending names into created ids on save */
export async function resolvePendingChipNames(
    pendingNames: string[],
    leftoverQuery: string,
    selectedIds: string[],
    items: ChipItem[],
    createFn: (name: string) => Promise<ChipItem>
): Promise<string[]> {
    const names = [
        ...pendingNames,
        ...(leftoverQuery.trim() ? [leftoverQuery.trim()] : []),
    ];
    const resolved = [...selectedIds];
    for (const name of names) {
        const q = name.toLowerCase();
        const existing = items.find(
            (t) => t.nameEn.toLowerCase() === q || t.nameTh.toLowerCase() === q
        );
        if (existing) {
            if (!resolved.includes(existing.id)) resolved.push(existing.id);
            continue;
        }
        const created = await createFn(name);
        if (!resolved.includes(created.id)) resolved.push(created.id);
    }
    return resolved;
}
