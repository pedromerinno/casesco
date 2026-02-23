import { Skeleton } from "@/components/ui/skeleton";

type AdminPageSkeletonProps = {
  /** Número de blocos/cards no skeleton (default 2) */
  blocks?: number;
};

export function AdminPageSkeleton({ blocks = 2 }: AdminPageSkeletonProps) {
  return (
    <section className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-72 max-w-full" />
      </div>

      {Array.from({ length: blocks }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-6 md:p-7">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-4 w-64 max-w-full" />
          <div className="mt-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-3/4 max-w-xs" />
          </div>
        </div>
      ))}
    </section>
  );
}
