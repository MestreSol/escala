import clsx from "clsx";

/** Pequena cruz dourada com um filete — o "selo" das páginas públicas. */
export function Marca({ className }: { className?: string }) {
  return (
    <div aria-hidden className={clsx("flex items-center gap-3 text-accent", className)}>
      <span className="h-px w-8 bg-gradient-to-r from-transparent to-accent/60" />
      <span className="text-xl leading-none">✠</span>
      <span className="h-px w-8 bg-gradient-to-l from-transparent to-accent/60" />
    </div>
  );
}
