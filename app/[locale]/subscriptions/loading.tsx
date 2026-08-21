import { AppShell } from '@/components/layout/AppShell';
import { Skeleton, TableRowsSkeleton } from '@/components/ui/Skeleton';

export default function SubscriptionsLoading() {
  return (
    <AppShell title="Subscriptions">
      <div className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>

        {/* Toolbar Skeleton (Search & Filters) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl border border-border-1 bg-surface-1">
          <Skeleton className="h-9 w-full sm:w-72 rounded-xl" />
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Skeleton className="h-9 w-24 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
            <Skeleton className="h-9 w-24 rounded-xl" />
          </div>
        </div>

        {/* Subscriptions Table Skeleton */}
        <TableRowsSkeleton rows={6} />
      </div>
    </AppShell>
  );
}
