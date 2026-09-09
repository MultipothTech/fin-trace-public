import React from 'react';
import { Inbox, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface EmptyStateProps {
    title: string;
    description?: string;
    icon?: LucideIcon;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}

/**
 * คอมโพเนนต์แสดงผลเมื่อไม่มีข้อมูล (Empty State)
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
    title,
    description,
    icon: Icon = Inbox,
    actionLabel,
    onAction,
    className = 'py-12',
}) => {
    return (
        <div className={`flex flex-col items-center justify-center text-center p-6 rounded-xl border border-dashed border-border/60 ${className}`}>
            <div className="w-12 h-12 rounded-full bg-secondary/80 flex items-center justify-center mb-3 text-muted-foreground">
                <Icon className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-foreground mb-1">{title}</h4>
            {description && <p className="text-xs text-muted-foreground max-w-sm mb-4">{description}</p>}
            {actionLabel && onAction && (
                <Button size="sm" onClick={onAction}>
                    {actionLabel}
                </Button>
            )}
        </div>
    );
};
