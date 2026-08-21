import { AppShell } from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/Skeleton';

export default function ImportsLoading() {
  return (
    <AppShell title="Statement Imports">
      <div className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>

        {/* Upload Dropzone Skeleton */}
        <div className="rounded-2xl border-2 border-dashed border-border-2 bg-surface-1/50 p-12 flex flex-col items-center justify-center space-y-4 text-center">
          <Skeleton className="w-14 h-14 rounded-2xl" />
          <Skeleton className="h-5 w-60" />
          <Skeleton className="h-4 w-80" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>

        {/* Recent Imports History Skeleton */}
        <div className="rounded-2xl border border-border-1 bg-surface-1 p-5 space-y-4">
          <Skeleton className="h-5 w-44" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3.5 rounded-xl bg-surface-2/40">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-lg" />
                  <div className="space-y-1">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-2.5 w-20" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
