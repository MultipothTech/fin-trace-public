import dynamic from 'next/dynamic';

/**
 * Lazy-loaded Landing Page Component
 */
export const LazyLandingPage = dynamic(
    () => import('./components/landing-content').then((mod) => mod.LandingContent),
    { ssr: false }
);
