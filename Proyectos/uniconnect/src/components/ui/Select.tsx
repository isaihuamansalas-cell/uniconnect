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
        outline-none transition
        focus:border-emerald-600
        focus:ring-2 focus:ring-emerald-100
        disabled:cursor-not-allowed disabled:bg-slate-100
        ${className}
      `}
    />
  );
}