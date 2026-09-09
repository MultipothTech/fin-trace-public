import {
    Film,
    Bot,
    Zap,
    Gamepad2,
    Cloud,
    Music,
    Dumbbell,
    GraduationCap,
    MoreHorizontal,
    ShoppingBag,
    Coffee,
    type LucideIcon,
} from 'lucide-react';

export interface CategoryPreset {
    icon: LucideIcon;
    label_en: string;
    label_th: string;
    color: string;
    bg: string;
}

export const SUBSCRIPTION_CATEGORIES: Record<string, CategoryPreset> = {
    streaming: { icon: Film, label_en: "Streaming / Video", label_th: "วิดีโอ / สตรีมมิ่ง", color: "text-red-400", bg: "bg-red-500/10" },
    ai_software: { icon: Bot, label_en: "AI & Software", label_th: "AI & ซอฟต์แวร์", color: "text-purple-400", bg: "bg-purple-500/10" },
    music: { icon: Music, label_en: "Music / Audio", label_th: "เพลง / พอดแคสต์", color: "text-emerald-400", bg: "bg-emerald-500/10" },
    cloud: { icon: Cloud, label_en: "Cloud & Storage", label_th: "คลาวด์ / พื้นที่จัดเก็บ", color: "text-blue-400", bg: "bg-blue-500/10" },
    utilities: { icon: Zap, label_en: "Bills & Utilities", label_th: "บิล / สาธารณูปโภค", color: "text-yellow-400", bg: "bg-yellow-500/10" },
    gaming: { icon: Gamepad2, label_en: "Gaming", label_th: "เกม / คอนเทนต์", color: "text-indigo-400", bg: "bg-indigo-500/10" },
    fitness: { icon: Dumbbell, label_en: "Health & Fitness", label_th: "ฟิตเนส / สุขภาพ", color: "text-rose-400", bg: "bg-rose-500/10" },
    education: { icon: GraduationCap, label_en: "Education", label_th: "การศึกษา / คอร์ส", color: "text-cyan-400", bg: "bg-cyan-500/10" },
    shopping: { icon: ShoppingBag, label_en: "Shopping / Lifestyle", label_th: "ช้อปปิ้ง / ไลฟ์สไตล์", color: "text-pink-400", bg: "bg-pink-500/10" },
    coffee: { icon: Coffee, label_en: "Food & Beverage", label_th: "อาหาร / เครื่องดื่ม", color: "text-amber-400", bg: "bg-amber-500/10" },
    other: { icon: MoreHorizontal, label_en: "Other", label_th: "อื่นๆ", color: "text-zinc-400", bg: "bg-zinc-500/10" }
};

export const POPULAR_PRESETS = [
    { name: 'Netflix', price: 419, category: 'streaming', billingCycle: 'monthly' as const, color: '#E50914' },
    { name: 'Spotify', price: 139, category: 'music', billingCycle: 'monthly' as const, color: '#1DB954' },
    { name: 'ChatGPT Plus', price: 750, category: 'ai_software', billingCycle: 'monthly' as const, color: '#10A37F' },
    { name: 'YouTube Premium', price: 179, category: 'streaming', billingCycle: 'monthly' as const, color: '#FF0000' },
    { name: 'iCloud+ (200GB)', price: 99, category: 'cloud', billingCycle: 'monthly' as const, color: '#0071E3' },
    { name: 'Adobe Creative Cloud', price: 1250, category: 'ai_software', billingCycle: 'monthly' as const, color: '#FF0000' },
    { name: 'PlayStation Plus (6M)', price: 1350, category: 'gaming', billingCycle: 'half_yearly' as const, color: '#003791' },
    { name: 'Canva Pro', price: 1850, category: 'ai_software', billingCycle: 'yearly' as const, color: '#00C4CC' },
];

import en from '@/locales/en.json';
import th from '@/locales/th.json';

export type TranslationSchema = typeof th;

export const TRANSLATIONS: Record<'en' | 'th', TranslationSchema> = {
    en,
    th,
};

export interface WidgetLayoutItem {
    id: string;
    visible: boolean;
}

export const DEFAULT_WIDGET_ORDER: WidgetLayoutItem[] = [
    { id: 'urgent_alert_card', visible: true },
    { id: 'stats_summary', visible: true },
    { id: 'category_chart', visible: true },
    { id: 'upcoming_timeline', visible: true },
];
