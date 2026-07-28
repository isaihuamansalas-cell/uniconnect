"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
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

const selectorEnfocable = [
  "a[href]",
  "area[href]",
  "button",
  "input",
  "select",
  "textarea",
  "iframe",
  "audio[controls]",
  "video[controls]",
  "[contenteditable='true']",
  "[tabindex]",
].join(",");

function obtenerElementosEnfocables(
  dialogo: HTMLElement
): HTMLElement[] {
  return Array.from(
    dialogo.querySelectorAll<HTMLElement>(selectorEnfocable)
  ).filter((elemento) => {
    if (
      elemento.matches(
        "[disabled], [hidden], [aria-hidden='true'], [tabindex='-1']"
      ) ||
      elemento.closest("[hidden], [aria-hidden='true']")
    ) {
      return false;
    }

    const estilos = window.getComputedStyle(elemento);
    return (
      estilos.display !== "none" &&
      estilos.visibility !== "hidden" &&
      elemento.getClientRects().length > 0
    );
  });
}

export default function Modal({
  abierto,
  titulo,
  descripcion,
  children,
  onCerrar,
  impedirCerrar = false,
  focoInicialRef,
}: ModalProps) {
  const [montado, setMontado] = useState(false);
  const tituloId = useId();
  const descripcionId = useId();
  const portalRef = useRef<HTMLDivElement>(null);
  const dialogoRef = useRef<HTMLDivElement>(null);
  const onCerrarRef = useRef(onCerrar);
  const impedirCerrarRef = useRef(impedirCerrar);
  const focoInicialRefInterna = useRef(focoInicialRef);

  onCerrarRef.current = onCerrar;
  impedirCerrarRef.current = impedirCerrar;
  focoInicialRefInterna.current = focoInicialRef;

  useEffect(() => {
    setMontado(true);
  }, []);

  useEffect(() => {
    if (!abierto || !montado) return;

    const elementoAnterior = document.activeElement;
    const overflowAnterior = document.body.style.overflow;
    const portal = portalRef.current;
    const hermanosRestaurables: {
      elemento: HTMLElement;
      inert: boolean;
      ariaHidden: string | null;
    }[] = [];

    document.body.style.overflow = "hidden";

    try {
      if (portal) {
        Array.from(document.body.children).forEach((hijo) => {
          if (!(hijo instanceof HTMLElement) || hijo === portal) return;

          hermanosRestaurables.push({
            elemento: hijo,
            inert: hijo.inert,
            ariaHidden: hijo.getAttribute("aria-hidden"),
          });
          hijo.inert = true;
          hijo.setAttribute("aria-hidden", "true");
        });
      }
    } catch {
      hermanosRestaurables.forEach(({ elemento, inert, ariaHidden }) => {
        elemento.inert = inert;
        if (ariaHidden === null) elemento.removeAttribute("aria-hidden");
        else elemento.setAttribute("aria-hidden", ariaHidden);
      });
      hermanosRestaurables.length = 0;
    }

    const temporizador = window.setTimeout(() => {
      const focoInicial = focoInicialRefInterna.current?.current;
      const dialogo = dialogoRef.current;
      if (!dialogo) return;

      if (focoInicial && dialogo.contains(focoInicial)) {
        focoInicial.focus();
        return;
      }

      dialogo.focus();
    }, 0);

    function manejarTecla(event: KeyboardEvent) {
      if (event.key === "Escape" && !impedirCerrarRef.current) {
        onCerrarRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const dialogo = dialogoRef.current;
      if (!dialogo) return;

      const enfocables = obtenerElementosEnfocables(dialogo);
      if (enfocables.length === 0) {
        event.preventDefault();
        dialogo.focus();
        return;
      }

      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      const focoActual = document.activeElement;

      if (!dialogo.contains(focoActual) || focoActual === dialogo) {
        event.preventDefault();
        (event.shiftKey ? ultimo : primero).focus();
      } else if (event.shiftKey && focoActual === primero) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && focoActual === ultimo) {
        event.preventDefault();
        primero.focus();
      }
    }

    document.addEventListener("keydown", manejarTecla);
    return () => {
      window.clearTimeout(temporizador);
      document.removeEventListener("keydown", manejarTecla);
      document.body.style.overflow = overflowAnterior;
      hermanosRestaurables.forEach(({ elemento, inert, ariaHidden }) => {
        elemento.inert = inert;
        if (ariaHidden === null) elemento.removeAttribute("aria-hidden");
        else elemento.setAttribute("aria-hidden", ariaHidden);
      });
      if (elementoAnterior instanceof HTMLElement) elementoAnterior.focus();
    };
  }, [abierto, montado]);

  if (!abierto || !montado) return null;

  return createPortal(
    <div
      ref={portalRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4"
      onMouseDown={() => {
        if (!impedirCerrarRef.current) onCerrarRef.current();
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
            onClick={() => onCerrarRef.current()}
            disabled={impedirCerrar}
            tabIndex={impedirCerrar ? -1 : undefined}
            aria-label="Cerrar ventana"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <X size={22} />
          </button>
        </header>

        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}
