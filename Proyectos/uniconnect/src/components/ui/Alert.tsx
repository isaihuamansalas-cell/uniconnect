import type { ReactNode } from "react";

type AlertVariant = "error" | "success" | "warning" | "info";

type AlertProps = {
  children: ReactNode;
  variant: AlertVariant;
  className?: string;
};

const estilosPorVariante: Record<AlertVariant, string> = {
  error:
    "border-red-200 bg-red-50 text-red-800 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200",
  warning:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200",
  info:
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
};

export default function Alert({
  children,
  variant,
  className = "",
}: AlertProps) {
  const esError = variant === "error";

  return (
    <div
      role={esError ? "alert" : "status"}
      aria-live={esError ? "assertive" : "polite"}
      aria-atomic="true"
      className={`rounded-xl border p-4 text-sm font-medium ${estilosPorVariante[variant]} ${className}`}
    >
      {children}
    </div>
  );
}
