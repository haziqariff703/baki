import { AppShell } from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/Skeleton';

export default function SettingsLoading() {
  return (
    <AppShell title="Settings">
      <div className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>

        {/* Profile Card Skeleton */}
        <div className="rounded-2xl border border-border-1 bg-surface-1 p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3.5 w-56" />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border-1">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
