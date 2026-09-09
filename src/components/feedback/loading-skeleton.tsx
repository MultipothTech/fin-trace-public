import React from 'react';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export interface LoadingSkeletonProps {
    className?: string;
    text?: string;
}

/**
 * คอมโพเนนต์แสดงสถานะการโหลดข้อมูล สร้างด้วย shadcn/ui Skeleton & Loader
 */
export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
    className = 'min-h-[240px]',
    text,
}) => {
    return (
        <div className={`flex flex-col items-center justify-center gap-3 w-full ${className}`}>
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            {text && <p className="text-xs text-muted-foreground animate-pulse">{text}</p>}
        </div>
    );
};

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
    return (
        <div className="space-y-3 w-full">
            {Array.from({ length: count }).map((_, i) => (
                <Skeleton
                    key={`skeleton-${i}`}
                    className="h-16 w-full rounded-xl"
                />
            ))}
        </div>
    );
};
