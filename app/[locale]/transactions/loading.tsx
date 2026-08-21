import { AppShell } from '@/components/layout/AppShell';
import { Skeleton, TableRowsSkeleton } from '@/components/ui/Skeleton';

export default function TransactionsLoading() {
  return (
    <AppShell title="Transactions">
      <div className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>

        {/* Toolbar Skeleton */}
        <div className="flex items-center justify-between p-3 rounded-2xl border border-border-1 bg-surface-1">
          <Skeleton className="h-9 w-72 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>

        {/* Table Rows Skeleton */}
        <TableRowsSkeleton rows={7} />
      </div>
    </AppShell>
  );
}
