"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Circle } from "lucide-react";

type Notificacion = {
  id: number;
  titulo: string;
  mensaje: string;
  tipo: string;
  ruta: string | null;
  leida: boolean;
  entidad_tipo: string | null;
  entidad_id: string | null;
  created_at: string;
  read_at: string | null;
};

type RespuestaNotificaciones = {
  notificaciones?: Notificacion[];
  noLeidas?: number;
  error?: string;
};

type NotificacionesPanelProps = {
  accessToken: string;
};

export default function NotificacionesPanel({
  accessToken,
}: NotificacionesPanelProps) {
  const router = useRouter();
  const contenedorRef = useRef<HTMLDivElement | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [notificaciones, setNotificaciones] = useState<
    Notificacion[]
  >([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState("");

  const cargarNotificaciones = useCallback(async () => {
    if (!accessToken) {
      setNotificaciones([]);
      setNoLeidas(0);
      setError("");
      return;
    }

    setCargando(true);

    try {
      const respuesta = await fetch("/api/notificaciones", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });

      const resultado =
        (await respuesta.json()) as RespuestaNotificaciones;

      if (!respuesta.ok) {
        setError(
          resultado.error ??
            "No se pudieron cargar las notificaciones."
        );
        return;
      }

      setNotificaciones(resultado.notificaciones ?? []);
      setNoLeidas(resultado.noLeidas ?? 0);
      setError("");
    } catch (errorInesperado) {
      console.error(
        "Error al cargar notificaciones:",
        errorInesperado
      );
      setError("No se pudieron cargar las notificaciones.");
    } finally {
      setCargando(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      setNotificaciones([]);
      setNoLeidas(0);
      setAbierto(false);
      return;
    }

    void cargarNotificaciones();

    const intervalo = window.setInterval(() => {
      void cargarNotificaciones();
    }, 45000);

    return () => {
      window.clearInterval(intervalo);
    };
  }, [accessToken, cargarNotificaciones]);

  useEffect(() => {
    if (!abierto) {
      return;
    }

    function cerrarConEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAbierto(false);
      }
    }

    function cerrarConClickFuera(event: MouseEvent) {
      if (
        contenedorRef.current &&
        !contenedorRef.current.contains(event.target as Node)
      ) {
        setAbierto(false);
      }
    }

    window.addEventListener("keydown", cerrarConEscape);
    window.addEventListener("mousedown", cerrarConClickFuera);

    return () => {
      window.removeEventListener("keydown", cerrarConEscape);
      window.removeEventListener("mousedown", cerrarConClickFuera);
    };
  }, [abierto]);

  async function marcarUna(notificacion: Notificacion) {
    if (!accessToken) {
      return;
    }

    setActualizando(true);

    if (!notificacion.leida) {
      const respuesta = await fetch(
        `/api/notificaciones/${notificacion.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (respuesta.ok) {
        await cargarNotificaciones();
      }
    }

    setActualizando(false);
    setAbierto(false);

    if (notificacion.ruta?.startsWith("/")) {
      router.push(notificacion.ruta);
    }
  }

  async function marcarTodas() {
    if (!accessToken || noLeidas === 0) {
      return;
    }

    setActualizando(true);

    const respuesta = await fetch("/api/notificaciones", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (respuesta.ok) {
      await cargarNotificaciones();
    }

    setActualizando(false);
  }

  return (
    <div ref={contenedorRef} className="relative">
      <button
        type="button"
        aria-label={
          noLeidas > 0
            ? `Ver notificaciones, ${noLeidas} no leidas`
            : "Ver notificaciones"
        }
        aria-haspopup="dialog"
        aria-expanded={abierto}
        onClick={() => setAbierto((valor) => !valor)}
        className="focus-primary relative rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 focus:outline-none dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <Bell size={21} />
        {noLeidas > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-center text-[11px] font-bold leading-none text-white">
            {noLeidas > 99 ? "99+" : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div
          role="dialog"
          aria-label="Centro de notificaciones"
          className="fixed inset-x-3 top-20 z-50 max-h-[75vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:absolute sm:inset-auto sm:right-0 sm:top-12 sm:w-96"
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-slate-100">
                Notificaciones
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {noLeidas} sin leer
              </p>
            </div>

            <button
              type="button"
              onClick={marcarTodas}
              disabled={actualizando || noLeidas === 0}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCheck size={17} />
              Marcar todas
            </button>
          </div>

          <div className="max-h-[calc(75vh-72px)] overflow-y-auto">
            {error && (
              <p className="m-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </p>
            )}

            {!error && cargando && notificaciones.length === 0 && (
              <p className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                Cargando notificaciones...
              </p>
            )}

            {!error && !cargando && notificaciones.length === 0 && (
              <p className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                No tienes notificaciones.
              </p>
            )}

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {notificaciones.map((notificacion) => (
                <button
                  key={notificacion.id}
                  type="button"
                  onClick={() => void marcarUna(notificacion)}
                  disabled={actualizando}
                  className="flex w-full gap-3 px-4 py-4 text-left transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none disabled:cursor-wait dark:hover:bg-slate-800 dark:focus:bg-slate-800"
                >
                  <span
                    className={
                      notificacion.leida
                        ? "mt-1 text-slate-300 dark:text-slate-600"
                        : "mt-1 text-primary"
                    }
                    aria-hidden="true"
                  >
                    <Circle
                      size={10}
                      fill={
                        notificacion.leida
                          ? "currentColor"
                          : "currentColor"
                      }
                    />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {notificacion.titulo}
                      </span>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {notificacion.tipo}
                      </span>
                    </span>

                    <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">
                      {notificacion.mensaje}
                    </span>

                    <span className="mt-2 block text-xs text-slate-400 dark:text-slate-500">
                      {formatearFecha(notificacion.created_at)}
                      {" · "}
                      {notificacion.leida ? "Leida" : "No leida"}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatearFecha(fecha: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(fecha));
}
