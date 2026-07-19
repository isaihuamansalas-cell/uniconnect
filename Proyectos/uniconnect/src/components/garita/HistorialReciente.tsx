"use client";

import { CalendarClock, LoaderCircle, RefreshCw } from "lucide-react";

import FotoUsuario from "@/components/usuarios/FotoUsuario";
import type { SalidaReciente } from "./types";

type HistorialRecienteProps = {
  salidas: SalidaReciente[];
  accessToken: string;
  cargando: boolean;
  error: string;
  onActualizar: () => void;
};

const formatoFecha = new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" });
const formatoHora = new Intl.DateTimeFormat("es-PE", {
  hour: "2-digit",
  minute: "2-digit",
});

function fechaRegistro(salida: SalidaReciente) {
  const fecha = new Date(salida.created_at);
  if (!Number.isNaN(fecha.getTime())) return fecha;
  return null;
}

export default function HistorialReciente({
  salidas,
  accessToken,
  cargando,
  error,
  onActualizar,
}: HistorialRecienteProps) {
  return (
    <section className="mt-8 rounded-2xl bg-white p-4 shadow-sm dark:border dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Ultimas 5 salidas del dia
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Registros operativos mas recientes de Garita.
          </p>
        </div>
        <button
          type="button"
          onClick={onActualizar}
          disabled={cargando}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl btn-primary px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {cargando ? (
            <LoaderCircle size={20} className="animate-spin" />
          ) : (
            <RefreshCw size={20} />
          )}
          Actualizar
        </button>
      </div>

      <div aria-live="polite">
        {error && (
          <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        )}
        {!cargando && !error && salidas.length === 0 && (
          <div className="mt-6 rounded-xl bg-slate-50 p-8 text-center text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <CalendarClock className="mx-auto" size={34} />
            <p className="mt-3">Todavia no hay salidas registradas hoy.</p>
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {salidas.map((salida) => {
          const fecha = fechaRegistro(salida);
          return (
            <article
              key={salida.id}
              className="flex min-w-0 items-center gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700"
            >
              {salida.estudiante ? (
                <FotoUsuario
                  usuarioId={salida.estudiante.id}
                  version={salida.estudiante.foto_version}
                  accessToken={accessToken}
                  className="h-16 w-16 shrink-0 rounded-xl object-cover sm:h-20 sm:w-20"
                  fallbackClassName="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300 sm:h-20 sm:w-20"
                  iconSize={28}
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 sm:h-20 sm:w-20">
                  <CalendarClock size={28} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="break-words font-bold text-slate-900 dark:text-slate-100">
                  {salida.estudiante
                    ? `${salida.estudiante.nombres} ${salida.estudiante.apellidos}`
                    : "Estudiante no disponible"}
                </p>
                <p className="mt-1 text-lg font-black uppercase text-primary">
                  {salida.vehiculo?.placa ?? "Sin placa"}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {fecha
                    ? `${formatoFecha.format(fecha)} · ${formatoHora.format(fecha)}`
                    : `${salida.fecha ?? "Sin fecha"} ${salida.hora ?? ""}`}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
