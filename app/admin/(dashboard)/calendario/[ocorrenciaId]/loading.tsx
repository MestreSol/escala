import { Skeleton } from "@/components/ui/Spinner";

export default function OcorrenciaLoading() {
  return (
    <div role="status" aria-label="Carregando missa" className="max-w-3xl">
      <Skeleton className="mb-6 h-4 w-36" />
      <Skeleton className="mb-2 h-7 w-64" />
      <Skeleton className="mb-8 h-4 w-48" />
      <div className="space-y-2">
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    </div>
  );
}
