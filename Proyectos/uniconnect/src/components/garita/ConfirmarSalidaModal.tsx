"use client";

import { useRef } from "react";
import { AlertTriangle, LoaderCircle } from "lucide-react";

import Modal from "@/components/ui/Modal";
import FotoUsuario from "@/components/usuarios/FotoUsuario";
import type { EstudianteGarita, VehiculoGarita } from "./types";

type ConfirmarSalidaModalProps = {
  abierto: boolean;
  estudiante: EstudianteGarita;
  vehiculo: VehiculoGarita;
  accessToken: string;
  fechaHora: Date;
  registrando: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
};

const formatoFecha = new Intl.DateTimeFormat("es-PE", { dateStyle: "long" });
const formatoHora = new Intl.DateTimeFormat("es-PE", {
  hour: "2-digit",
  minute: "2-digit",
});

export default function ConfirmarSalidaModal({
  abierto,
  estudiante,
  vehiculo,
  accessToken,
  fechaHora,
  registrando,
  onCancelar,
  onConfirmar,
}: ConfirmarSalidaModalProps) {
  const confirmarRef = useRef<HTMLButtonElement>(null);
  const bloqueado = !estudiante.estado || !vehiculo.estado;

  return (
    <Modal
      abierto={abierto}
      titulo="Confirmar salida"
      descripcion="Revisa los datos antes de registrar la salida."
      onCerrar={onCancelar}
      impedirCerrar={registrando}
      focoInicialRef={confirmarRef}
    >
      <div className="flex flex-col items-center text-center">
        <FotoUsuario
          usuarioId={estudiante.id}
          version={estudiante.foto_version}
          accessToken={accessToken}
          className="h-32 w-32 rounded-2xl object-cover sm:h-36 sm:w-36"
          fallbackClassName="flex h-32 w-32 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300 sm:h-36 sm:w-36"
          iconSize={48}
        />
        <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-slate-100">
          {estudiante.nombres} {estudiante.apellidos}
        </h3>
        <p className="mt-1 text-2xl font-black uppercase tracking-wide text-primary">
          {vehiculo.placa}
        </p>
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-3 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-800 sm:grid-cols-2">
        <div>
          <dt className="text-slate-500 dark:text-slate-400">Fecha</dt>
          <dd className="font-semibold text-slate-900 dark:text-slate-100">
            {formatoFecha.format(fechaHora)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500 dark:text-slate-400">Hora aproximada</dt>
          <dd className="font-semibold text-slate-900 dark:text-slate-100">
            {formatoHora.format(fechaHora)}
          </dd>
        </div>
      </dl>

      {(!estudiante.estado || !vehiculo.estado) && (
        <div className="mt-4 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-left text-sm font-semibold text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          <AlertTriangle className="shrink-0" size={20} />
          <p>
            {!estudiante.estado && "El estudiante esta inactivo. "}
            {!vehiculo.estado && "El vehiculo esta inactivo. "}
            No se puede confirmar esta salida.
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancelar}
          disabled={registrando}
          className="min-h-12 rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Cancelar
        </button>
        <button
          ref={confirmarRef}
          type="button"
          onClick={onConfirmar}
          disabled={registrando || bloqueado}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl btn-primary px-5 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {registrando && <LoaderCircle size={20} className="animate-spin" />}
          {registrando ? "Registrando..." : "Confirmar salida"}
        </button>
      </div>
    </Modal>
  );
}
