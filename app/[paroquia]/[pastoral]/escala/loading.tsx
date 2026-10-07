import { Skeleton } from "@/components/ui/Spinner";

export default function EscalaLoading() {
  return (
    <div role="status" aria-label="Carregando escala" className="min-h-screen bg-bg px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-56" />
        </div>
        <Skeleton className="mx-auto mb-10 h-10 max-w-md" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
