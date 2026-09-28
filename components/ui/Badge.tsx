import { ReactNode } from "react";
import clsx from "clsx";

type BadgeProps = {
  children: ReactNode;
  color?: "gray" | "green" | "red" | "yellow" | "blue";
};

const COLOR_CLASSES: Record<NonNullable<BadgeProps["color"]>, string> = {
  gray: "bg-surface-2 text-muted ring-line",
  green: "bg-ok-soft text-ok ring-ok/20",
  red: "bg-danger-soft text-danger ring-danger/20",
  yellow: "bg-warn-soft text-warn ring-warn/20",
  blue: "bg-accent-soft text-accent ring-accent/20",
};

export function Badge({ children, color = "gray" }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide ring-1 ring-inset",
        COLOR_CLASSES[color]
      )}
    >
      {children}
    </span>
  );
}
