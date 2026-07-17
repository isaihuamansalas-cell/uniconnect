import type { ReactNode } from "react";

type FormFieldProps = {
  label: string;
  htmlFor?: string;
  error?: string;
  children: ReactNode;
};

export default function FormField({
  label,
  htmlFor,
  error,
  children,
}: FormFieldProps) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
      >
        {label}
      </label>

      {children}

      {error && (
        <p className="mt-1 text-sm font-medium text-red-600 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
