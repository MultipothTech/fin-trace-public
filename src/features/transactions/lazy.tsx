import dynamic from 'next/dynamic';

/**
 * Lazy-loaded Payment History / Transactions Snapshot Page Component
 */
export const LazyHistoryPage = dynamic(
    () => import('./components/history-content').then((mod) => mod.HistoryContent),
    { ssr: false }
);

export const LazyTransactionsPage = LazyHistoryPage;
