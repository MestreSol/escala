"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const ativo = href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={clsx(
        "group relative flex shrink-0 items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors",
        ativo ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface hover:text-fg"
      )}
    >
      <span
        aria-hidden
        className={clsx(
          "absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent transition-opacity max-md:hidden",
          ativo ? "opacity-100" : "opacity-0"
        )}
      />
      {label}
      <PendingDot />
    </Link>
  );
}

function PendingDot() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={clsx("size-1.5 rounded-full bg-accent", pending ? "animate-pulse-soft" : "opacity-0")}
    />
  );
}
