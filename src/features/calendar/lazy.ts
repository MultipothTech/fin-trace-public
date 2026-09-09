import { lazy } from 'react';

export const LazyCalendarPage = lazy(() =>
    import('./components/calendar-content').then((m) => ({ default: m.CalendarContent }))
);
