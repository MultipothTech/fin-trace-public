import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface MobileNavButtonProps {
    active: boolean;
    onClick: () => void;
    icon: LucideIcon;
    label: string;
    highlight?: boolean;
}

/**
 * ปุ่มเมนู Navigation สำหรับ Mobile Bottom Bar
 */
export const MobileNavButton = React.memo(({ active, onClick, icon: Icon, label, highlight }: MobileNavButtonProps) => (
    <button
        type="button"
        onClick={onClick}
        className={`flex flex-col items-center justify-center gap-1 w-full py-1 transition-colors ${
            active ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
        }`}
    >
        <div
            className={`p-1.5 rounded-xl transition-all ${
                highlight
                    ? 'bg-gradient-to-tr from-amber-500/20 via-zinc-100 to-zinc-50 border border-amber-500/30 text-amber-600 dark:from-amber-500/20 dark:via-zinc-800 dark:to-zinc-950 dark:border-amber-500/30 dark:text-amber-400 shadow-sm'
                    : active
                    ? 'bg-primary/15 text-primary'
                    : ''
            }`}
        >
            <Icon className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-medium tracking-tight truncate w-full text-center px-0.5">{label}</span>
    </button>
));

MobileNavButton.displayName = 'MobileNavButton';
