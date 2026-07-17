"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";

import { Modal } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";

type VehiculoEliminable = {
  id: number;
  placa: string;
  marca: string | null;
  modelo: string | null;
  color: string;
  tipo: string;
};

type EliminarVehiculoModalProps = {
  abierto: boolean;
  vehiculo: VehiculoEliminable | null;
  onCerrar: () => void;
  onVehiculoEliminado: () => void;
};

type RespuestaEliminar = {
  mensaje?: string;
  error?: string;
  relaciones?: {
    descripcion: string;
    cantidad: number;
  }[];
};

const confirmacionRequerida = "ELIMINAR VEHICULO";

export default function EliminarVehiculoModal({
  abierto,
  vehiculo,
  onCerrar,
  onVehiculoEliminado,
}: EliminarVehiculoModalProps) {
  const [confirmacion, setConfirmacion] = useState("");
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    if (!abierto) {
      return;
    }

    setConfirmacion("");
    setError("");
    setMensaje("");
    setEliminando(false);
  }, [abierto, vehiculo?.id]);

  async function eliminarVehiculo() {
    if (!vehiculo || confirmacion !== confirmacionRequerida) {
      return;
    }

    setEliminando(true);
    setError("");
    setMensaje("");

    const {
      data: { session },
      error: errorSesion,
    } = await supabase.auth.getSession();

    if (errorSesion || !session) {
      setError("Tu sesion termino. Vuelve a iniciar sesion.");
      setEliminando(false);
      return;
    }

    try {
      const respuesta = await fetch(`/api/vehiculos/${vehiculo.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const resultado = (await respuesta.json()) as RespuestaEliminar;

      if (!respuesta.ok) {
        const detalleRelaciones = resultado.relaciones
          ?.map(
            (relacion) =>
              `${relacion.descripcion}: ${relacion.cantidad}`
          )
          .join("; ");

        setError(
          detalleRelaciones
            ? `${resultado.error ?? "No se pudo eliminar el vehiculo."} (${detalleRelaciones})`
            : resultado.error ?? "No se pudo eliminar el vehiculo."
        );
        setEliminando(false);
        return;
      }

      setMensaje(resultado.mensaje ?? "Vehiculo eliminado.");
      onVehiculoEliminado();

      window.setTimeout(() => {
        setEliminando(false);
        onCerrar();
      }, 800);
    } catch (errorInesperado) {
      console.error(errorInesperado);
      setError("No se pudo conectar con el servidor.");
      setEliminando(false);
    }
  }

  return (
    <Modal
      abierto={abierto}
      titulo="Eliminar vehiculo"
      descripcion="Esta accion elimina definitivamente el vehiculo."
      onCerrar={() => {
        if (!eliminando) {
          onCerrar();
        }
      }}
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          <p className="font-semibold">
            Esta accion no se puede deshacer.
          </p>
          <p className="mt-2 text-sm">
            Si el vehiculo tiene salidas registradas, la eliminacion
            sera bloqueada y debera desactivarse.
          </p>
        </div>

        {vehiculo && (
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <p className="font-semibold uppercase text-slate-900 dark:text-slate-100">
              {vehiculo.placa}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {vehiculo.marca ?? "Sin marca"} {vehiculo.modelo ?? ""} -{" "}
              {vehiculo.color} - {vehiculo.tipo}
            </p>
          </div>
        )}

        <label
          htmlFor="confirmar-eliminar-vehiculo"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Escribe {confirmacionRequerida} para confirmar
        </label>
        <input
          id="confirmar-eliminar-vehiculo"
          value={confirmacion}
          onChange={(event) => setConfirmacion(event.target.value)}
          disabled={eliminando}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />

        {error && (
          <p className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        {mensaje && (
          <p className="rounded-xl bg-primary-soft p-4 text-sm font-medium text-primary">
            {mensaje}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 dark:border-slate-700 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCerrar}
            disabled={eliminando}
            className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={() => void eliminarVehiculo()}
            disabled={
              eliminando || confirmacion !== confirmacionRequerida
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-3 font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {eliminando ? (
              <LoaderCircle size={20} className="animate-spin" />
            ) : (
              <Trash2 size={20} />
            )}
            {eliminando ? "Eliminando..." : "Eliminar vehiculo"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
