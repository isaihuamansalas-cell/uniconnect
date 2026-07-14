import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export default function Input({
  className = "",
  ...props
}: InputProps) {
  return (
    <input
      {...props}
      className={`
        w-full rounded-xl border border-slate-300
        bg-white px-4 py-3 text-slate-900
        outline-none transition
        placeholder:text-slate-400
        focus:border-emerald-600
        focus:ring-2 focus:ring-emerald-100
        disabled:cursor-not-allowed
        disabled:bg-slate-100
        disabled:text-slate-500
        ${className}
      `}
    />
  );
}