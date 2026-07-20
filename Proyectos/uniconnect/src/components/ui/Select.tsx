import type { SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export default function Select({
  className = "",
  ...props
}: SelectProps) {
  return (
    <select
      {...props}
      className={`
        w-full rounded-xl border border-slate-300
        bg-white px-4 py-3 text-slate-900
        [color-scheme:light] outline-none transition focus-primary focus:ring-2 focus:ring-primary/20
        [&>option]:bg-white [&>option]:text-slate-900
        disabled:cursor-not-allowed disabled:bg-slate-100
        disabled:text-slate-500
        dark:border-slate-700
        dark:bg-slate-900
        dark:text-slate-100
        dark:[color-scheme:dark]
        dark:[&>option]:bg-slate-900
        dark:[&>option]:text-slate-100
        dark:disabled:bg-slate-800
        dark:disabled:text-slate-400
        ${className}
      `}
    />
  );
}
