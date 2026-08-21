import { AppShell } from '@/components/layout/AppShell';
import { Skeleton, CardSkeleton } from '@/components/ui/Skeleton';

export default function ReviewLoading() {
  return (
    <AppShell title="Candidate Review Queue">
      <div className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-7 w-60" />
          <Skeleton className="h-4 w-80" />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>

        {/* Candidate Card Skeleton */}
        <div className="rounded-2xl border border-border-1 bg-surface-1 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-3.5 w-24" />
              </div>
            </div>
            <Skeleton className="h-7 w-28 rounded-lg" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-surface-2/40">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
