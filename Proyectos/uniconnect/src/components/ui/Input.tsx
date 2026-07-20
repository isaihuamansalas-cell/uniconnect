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
        outline-none transition focus-primary focus:ring-2 focus:ring-primary/20
        placeholder:text-slate-400
        disabled:cursor-not-allowed
        disabled:bg-slate-100
        disabled:text-slate-500
        dark:border-slate-700
        dark:bg-slate-900
        dark:text-slate-100
        dark:placeholder:text-slate-400
        dark:disabled:bg-slate-800
        dark:disabled:text-slate-400
        ${className}
      `}
    />
  );
}
