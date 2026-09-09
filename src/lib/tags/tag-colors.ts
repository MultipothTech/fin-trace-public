/** Shared tag color palettes (Tailwind class tokens + chart hex) */

export const TAG_COLOR_PALETTES = [
    {
        name: 'Sky',
        color: 'text-sky-400',
        bg: 'bg-sky-500/10 border-sky-500/20',
        hex: '#38bdf8',
    },
    {
        name: 'Indigo',
        color: 'text-indigo-400',
        bg: 'bg-indigo-500/10 border-indigo-500/20',
        hex: '#818cf8',
    },
    {
        name: 'Emerald',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/20',
        hex: '#34d399',
    },
    {
        name: 'Amber',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10 border-amber-500/20',
        hex: '#fbbf24',
    },
    {
        name: 'Rose',
        color: 'text-rose-400',
        bg: 'bg-rose-500/10 border-rose-500/20',
        hex: '#fb7185',
    },
    {
        name: 'Violet',
        color: 'text-violet-400',
        bg: 'bg-violet-500/10 border-violet-500/20',
        hex: '#a78bfa',
    },
] as const;

export const UNTAGGED_COLOR = {
    color: 'text-zinc-400',
    bg: 'bg-zinc-500/10 border-zinc-500/20',
    hex: '#a1a1aa',
} as const;

export function pickRandomTagPalette() {
    const idx = Math.floor(Math.random() * TAG_COLOR_PALETTES.length);
    const p = TAG_COLOR_PALETTES[idx];
    return { color: p.color, bg: p.bg, hex: p.hex };
}

/** Resolve chart fill hex from stored tag color class (e.g. text-sky-400) */
export function tagColorToHex(colorClass?: string | null): string {
    if (!colorClass) return TAG_COLOR_PALETTES[0].hex;
    const found = TAG_COLOR_PALETTES.find((p) => p.color === colorClass);
    if (found) return found.hex;
    // Fallback: try matching color name token inside class
    const match = colorClass.match(
        /(sky|indigo|emerald|amber|rose|violet|zinc|purple|pink|orange|cyan|teal)/i
    );
    if (match) {
        const byName = TAG_COLOR_PALETTES.find((p) =>
            p.color.toLowerCase().includes(match[1].toLowerCase())
        );
        if (byName) return byName.hex;
    }
    return TAG_COLOR_PALETTES[0].hex;
}
