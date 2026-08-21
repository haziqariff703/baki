import { AppShell } from '@/components/layout/AppShell';
import { Skeleton, CardSkeleton, TableRowsSkeleton } from '@/components/ui/Skeleton';

export default function DashboardLoading() {
  return (
    <AppShell title="Dashboard">
      <div className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-44" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-28 rounded-xl" />
            <Skeleton className="h-9 w-32 rounded-xl" />
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>

        {/* 2 Big Visual Cards (Spending Trend & Category Donut) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-border-1 bg-surface-1 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>

          <div className="rounded-2xl border border-border-1 bg-surface-1 p-6 space-y-4">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-56 w-full rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-3/4" />
            </div>
          </div>
        </div>

        {/* Active Subscriptions Ledger Skeleton */}
        <TableRowsSkeleton rows={5} />
      </div>
    </AppShell>
  );
}
