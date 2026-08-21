import { AppShell } from '@/components/layout/AppShell';
import { Skeleton, CardSkeleton } from '@/components/ui/Skeleton';

export default function NotificationsLoading() {
  return (
    <AppShell title="Notifications & Reminders">
      <div className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>

        {/* Timeline List Skeleton */}
        <div className="rounded-2xl border border-border-1 bg-surface-1 p-6 space-y-4">
          <Skeleton className="h-5 w-48" />
          <div className="space-y-3 pt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-surface-2/40">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
