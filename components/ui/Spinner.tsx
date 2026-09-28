import clsx from "clsx";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={clsx(
        "inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent",
        className
      )}
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={clsx(
        "animate-shimmer rounded-md bg-[linear-gradient(90deg,var(--color-surface)_0%,var(--color-surface-2)_50%,var(--color-surface)_100%)] bg-[length:200%_100%]",
        className
      )}
    />
  );
}

/** Barra fina dourada indeterminada, usada em "Gerando..." e carregamentos. */
export function ProgressBar({ className }: { className?: string }) {
  return (
    <div aria-hidden className={clsx("h-0.5 w-full overflow-hidden rounded-full bg-line", className)}>
      <div className="h-full w-1/2 origin-left animate-progress rounded-full bg-accent" />
    </div>
  );
}
