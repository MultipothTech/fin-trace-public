import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface NavButtonProps {
    active: boolean;
    onClick: () => void;
    icon: LucideIcon;
    label: string;
}

/**
 * ปุ่มเมนู Navigation สำหรับ Desktop Sidebar
 */
export const NavButton = React.memo(({ active, onClick, icon: Icon, label }: NavButtonProps) => (
    <button
        type="button"
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
            active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
        }`}
    >
        <Icon className={`w-4 h-4 ${active ? 'text-primary-foreground' : ''}`} />
        {label}
    </button>
));

NavButton.displayName = 'NavButton';
