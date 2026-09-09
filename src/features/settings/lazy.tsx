import dynamic from 'next/dynamic';

/**
 * Lazy-loaded Settings Page Component
 */
export const LazySettingsPage = dynamic(
    () => import('./components/settings-content').then((mod) => mod.SettingsContent),
    { ssr: false }
);
