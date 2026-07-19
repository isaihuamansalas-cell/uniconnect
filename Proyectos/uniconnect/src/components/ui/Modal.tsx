"use client";

import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { X } from "lucide-react";

type ModalProps = {
  abierto: boolean;
  titulo: string;
  descripcion?: string;
  children: ReactNode;
  onCerrar: () => void;
  impedirCerrar?: boolean;
  focoInicialRef?: RefObject<HTMLElement | null>;
};

export default function Modal({
  abierto,
  titulo,
  descripcion,
  children,
  onCerrar,
  impedirCerrar = false,
  focoInicialRef,
}: ModalProps) {
  const tituloId = useId();
  const descripcionId = useId();
  const dialogoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;

    const elementoAnterior = document.activeElement;
    const temporizador = window.setTimeout(() => {
      focoInicialRef?.current?.focus();
      if (!focoInicialRef?.current) dialogoRef.current?.focus();
    }, 0);

    function manejarTecla(event: KeyboardEvent) {
      if (event.key === "Escape" && !impedirCerrar) onCerrar();
    }

    document.addEventListener("keydown", manejarTecla);
    return () => {
      window.clearTimeout(temporizador);
      document.removeEventListener("keydown", manejarTecla);
      if (elementoAnterior instanceof HTMLElement) elementoAnterior.focus();
    };
  }, [abierto, focoInicialRef, impedirCerrar, onCerrar]);

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4"
      onMouseDown={() => {
        if (!impedirCerrar) onCerrar();
      }}
    >
      <div
        ref={dialogoRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={descripcion ? descripcionId : undefined}
        tabIndex={-1}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <h2 id={tituloId} className="text-lg font-bold text-slate-900 dark:text-slate-100 sm:text-xl">
              {titulo}
            </h2>

            {descripcion && (
              <p id={descripcionId} className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {descripcion}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onCerrar}
            disabled={impedirCerrar}
            aria-label="Cerrar ventana"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <X size={22} />
          </button>
        </header>

        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
