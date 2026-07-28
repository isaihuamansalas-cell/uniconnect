import { LoaderCircle } from "lucide-react";
import Skeleton from "./Skeleton";

type LoadingVariant = "page" | "section" | "list" | "inline";

interface LoadingStateProps {
  variant?: LoadingVariant;
  message?: string;
  className?: string;
}

const variantClasses: Record<LoadingVariant, string> = {
  page: "min-h-screen",
  section: "min-h-52",
  list: "min-h-64",
  inline: "min-h-11",
};

export default function LoadingState({
  variant = "section",
  message = "Cargando...",
  className = "",
}: LoadingStateProps) {
  if (variant === "list") {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className={`flex flex-col justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 ${variantClasses[variant]} ${className}`}
      >
        <span className="sr-only">{message}</span>
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0 dark:border-slate-700"
          >
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`flex items-center justify-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-300 ${variantClasses[variant]} ${className}`}
    >
      <LoaderCircle
        aria-hidden="true"
        className={`${variant === "inline" ? "h-4 w-4" : "h-5 w-5"} animate-spin text-primary motion-reduce:animate-none`}
      />
      <span>{message}</span>
    </div>
  );
}
