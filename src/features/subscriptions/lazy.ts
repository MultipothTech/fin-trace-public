import { lazy } from 'react';

export const LazySubscriptionsPage = lazy(() =>
    import('./components/subscriptions-content').then((m) => ({ default: m.SubscriptionsContent }))
);
