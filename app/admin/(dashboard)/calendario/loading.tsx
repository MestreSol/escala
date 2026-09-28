import { Skeleton } from "@/components/ui/Spinner";

export default function CalendarioLoading() {
  return (
    <div role="status" aria-label="Carregando calendário">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Skeleton className="mb-2 h-7 w-52" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-40" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-line bg-line">
        {Array.from({ length: 35 }, (_, i) => (
          <div key={i} className="min-h-[110px] bg-bg p-2">
            <Skeleton className="ml-auto mb-2 h-3 w-4" />
            {i % 7 === 0 || i % 7 === 4 ? <Skeleton className="h-5 w-full" /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
