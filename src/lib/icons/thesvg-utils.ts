import { THESVG_SLUGS } from '@/lib/icons/thesvg-slugs';

export const THESVG_PREFIX = 'thesvg:';

/** Popular brand logos for empty-search picker (subscription-related). */
export const THESVG_POPULAR_SLUGS = [
    'netflix',
    'spotify',
    'youtube',
    'github',
    'openai',
    'google',
    'apple',
    'microsoft',
    'adobe',
    'discord',
    'slack',
    'notion',
    'figma',
    'cloudflare',
    'amazon',
    'disneyplus',
    'hbo',
    'twitch',
    'dropbox',
    'icloud',
    'canva',
    'zoom',
    'linkedin',
    'instagram',
    'facebook',
    'x',
    'tiktok',
    'steam',
    'playstation',
    'xbox',
    'nintendo',
    'vercel',
    'supabase',
    'stripe',
    'paypal',
].filter((slug) => THESVG_SLUGS.includes(slug));

export function isTheSvgIcon(icon?: string | null): boolean {
    return typeof icon === 'string' && icon.startsWith(THESVG_PREFIX);
}

export function toTheSvgIconValue(slug: string): string {
    return `${THESVG_PREFIX}${slug}`;
}

export function getTheSvgSlug(icon?: string | null): string | null {
    if (!isTheSvgIcon(icon)) return null;
    return icon!.slice(THESVG_PREFIX.length);
}

export function searchTheSvgSlugs(query: string, limit = 60): string[] {
    const q = query.trim().toLowerCase();
    if (!q) return THESVG_POPULAR_SLUGS.slice(0, limit);

    const starts: string[] = [];
    const includes: string[] = [];
    for (const slug of THESVG_SLUGS) {
        if (slug.startsWith(q)) starts.push(slug);
        else if (slug.includes(q)) includes.push(slug);
        if (starts.length + includes.length >= limit * 2) break;
    }
    return [...starts, ...includes].slice(0, limit);
}
