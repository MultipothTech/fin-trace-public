import dynamic from 'next/dynamic';

/**
 * Lazy-loaded Overview Page Component
 */
export const LazyOverviewPage = dynamic(
    () => import('./components/overview-content').then((mod) => mod.OverviewContent),
    { ssr: false }
);
