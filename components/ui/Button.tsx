import { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent-hover",
  secondary: "border border-line bg-surface-2 text-fg hover:border-line-strong hover:bg-line",
  danger: "border border-danger/40 text-danger hover:bg-danger hover:text-bg",
  ghost: "text-muted hover:bg-surface-2 hover:text-fg",
};

export const buttonClasses = (variant: ButtonVariant = "primary", className?: string) =>
  clsx(
    "inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-all duration-150 active:scale-[.98] disabled:pointer-events-none disabled:opacity-50",
    VARIANT_CLASSES[variant],
    className
  );

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return <button className={buttonClasses(variant, className)} {...props} />;
}
