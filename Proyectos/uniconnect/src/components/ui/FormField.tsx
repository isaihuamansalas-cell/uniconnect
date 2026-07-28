import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";
import Input from "./Input";
import Select from "./Select";

type FormFieldProps = {
  label: string;
  htmlFor?: string;
  error?: string;
  helpText?: string;
  children: ReactNode;
};

type ControlCompatibleProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
};

function esControlCompatible(
  elemento: ReactElement<ControlCompatibleProps>
) {
  return (
    (typeof elemento.type === "string" &&
      ["input", "select", "textarea"].includes(elemento.type)) ||
    elemento.type === Input ||
    elemento.type === Select
  );
}

export default function FormField({
  label,
  htmlFor,
  error,
  helpText,
  children,
}: FormFieldProps) {
  const idGenerado = useId();
  const hijoUnico = Children.count(children) === 1
    ? Children.only(children)
    : null;
  const elemento = isValidElement<ControlCompatibleProps>(hijoUnico)
    ? hijoUnico
    : null;
  const controlCompatible = elemento && esControlCompatible(elemento)
    ? elemento
    : null;
  const controlId =
    htmlFor ?? controlCompatible?.props.id ?? `campo-${idGenerado}`;
  const ayudaId = helpText ? `${controlId}-ayuda` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const descripcionIds = [
    controlCompatible?.props["aria-describedby"],
    ayudaId,
    errorId,
  ].filter(Boolean).join(" ") || undefined;
  const contenido = controlCompatible
    ? cloneElement(controlCompatible, {
        id: controlId,
        "aria-describedby": descripcionIds,
        "aria-invalid": error ? true : controlCompatible.props["aria-invalid"],
      })
    : children;

  return (
    <div>
      <label
        htmlFor={controlCompatible || htmlFor ? controlId : undefined}
        className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
      >
        {label}
      </label>

      {contenido}

      {helpText && (
        <p id={ayudaId} className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {helpText}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-1 text-sm font-medium text-red-700 dark:text-red-200"
        >
          {error}
        </p>
      )}
    </div>
  );
}
