"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  LoaderCircle,
  Megaphone,
  Pencil,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

import MainLayout from "@/components/layout/MainLayout";
import EditarAvisoModal, {
  type AvisoEditable,
} from "@/components/avisos/EditarAvisoModal";
import NuevoAvisoModal from "@/components/avisos/NuevoAvisoModal";
import { Input } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";

type AutorAviso = {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
};

type Aviso = {
  id: number;
  titulo: string;
  contenido: string;
  autor_id: string;
  tipo: string;
  destinatario: string;
  area_academica: string | null;
  ciclo: string | null;
  estado: boolean;
  created_at: string;
  updated_at: string | null;
  autor: AutorAviso | null;
};

type RespuestaAvisos = {
  avisos?: Aviso[];
  puedeGestionar?: boolean;
  error?: string;
};

type RespuestaApi = {
  error?: string;
  mensaje?: string;
};

const formatoFecha = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatearFecha(fechaIso: string) {
  const fecha = new Date(fechaIso);

  if (Number.isNaN(fecha.getTime())) {
    return "Sin fecha";
  }

  return formatoFecha.format(fecha);
}

function obtenerDetalleDestinatario(aviso: Aviso) {
  if (aviso.destinatario === "Area academica") {
    return aviso.area_academica ?? "Sin area";
  }

  if (aviso.destinatario === "Ciclo especifico") {
    return aviso.ciclo ?? "Sin ciclo";
  }

  return "Comunidad educativa";
}

export default function AvisosPage() {
  const router = useRouter();

  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [puedeGestionar, setPuedeGestionar] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [actualizandoId, setActualizandoId] = useState<number | null>(
    null
  );
  const [error, setError] = useState("");

  const [modalNuevoAbierto, setModalNuevoAbierto] =
    useState(false);
  const [modalEditarAbierto, setModalEditarAbierto] =
    useState(false);
  const [avisoSeleccionado, setAvisoSeleccionado] =
    useState<AvisoEditable | null>(null);

  const cargarAvisos = useCallback(async () => {
    setCargando(true);
    setError("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.replace("/login");
      return;
    }

    try {
      const respuesta = await fetch("/api/avisos", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const resultado =
        (await respuesta.json()) as RespuestaAvisos;

      if (!respuesta.ok) {
        setError(
          resultado.error ?? "No se pudieron cargar los avisos."
        );
        return;
      }

      setAvisos(resultado.avisos ?? []);
      setPuedeGestionar(resultado.puedeGestionar ?? false);
    } catch (errorInesperado) {
      console.error(errorInesperado);
      setError("No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }, [router]);

  useEffect(() => {
    cargarAvisos();
  }, [cargarAvisos]);

  const avisosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) {
      return avisos;
    }

    return avisos.filter((aviso) => {
      const autor = aviso.autor
        ? `${aviso.autor.nombres} ${aviso.autor.apellidos}`
        : "";

      return (
        aviso.titulo.toLowerCase().includes(texto) ||
        aviso.contenido.toLowerCase().includes(texto) ||
        autor.toLowerCase().includes(texto)
      );
    });
  }, [avisos, busqueda]);

  function abrirModalEditar(aviso: Aviso) {
    setAvisoSeleccionado({
      id: aviso.id,
      titulo: aviso.titulo,
      contenido: aviso.contenido,
      tipo: aviso.tipo,
      destinatario: aviso.destinatario,
      area_academica: aviso.area_academica,
      ciclo: aviso.ciclo,
      estado: aviso.estado,
    });
    setModalEditarAbierto(true);
  }

  function cerrarModalEditar() {
    setModalEditarAbierto(false);
    setAvisoSeleccionado(null);
  }

  async function cambiarEstado(aviso: Aviso) {
    setActualizandoId(aviso.id);
    setError("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.replace("/login");
      return;
    }

    try {
      const respuesta = await fetch(`/api/avisos/${aviso.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          titulo: aviso.titulo,
          contenido: aviso.contenido,
          tipo: aviso.tipo,
          destinatario: aviso.destinatario,
          area_academica: aviso.area_academica,
          ciclo: aviso.ciclo,
          estado: !aviso.estado,
        }),
      });

      const resultado = (await respuesta.json()) as RespuestaApi;

      if (!respuesta.ok) {
        setError(
          resultado.error ??
            "No se pudo cambiar el estado del aviso."
        );
        return;
      }

      await cargarAvisos();
    } catch (errorInesperado) {
      console.error(errorInesperado);
      setError("No se pudo conectar con el servidor.");
    } finally {
      setActualizandoId(null);
    }
  }

  return (
    <MainLayout>
      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">
              Comunicacion institucional
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Avisos
            </h1>

            <p className="mt-2 text-slate-600">
              Consulta y administra comunicados para estudiantes y
              personal del instituto.
            </p>
          </div>

          {puedeGestionar && (
            <button
              type="button"
              onClick={() => setModalNuevoAbierto(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white transition hover:bg-emerald-800"
            >
              <Plus size={20} />
              Nuevo aviso
            </button>
          )}
        </div>

        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <div className="relative max-w-lg">
            <Search
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <Input
              type="search"
              value={busqueda}
              onChange={(event) =>
                setBusqueda(event.target.value)
              }
              placeholder="Buscar por titulo, contenido o autor"
              className="pl-11"
            />
          </div>

          {error && (
            <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
              {error}
            </p>
          )}

          {cargando ? (
            <div className="mt-8 flex items-center gap-3 text-slate-500">
              <LoaderCircle size={20} className="animate-spin" />
              Cargando avisos...
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[1120px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-sm text-slate-500">
                    <th className="px-4 py-3 font-medium">
                      Aviso
                    </th>
                    <th className="px-4 py-3 font-medium">
                      Autor
                    </th>
                    <th className="px-4 py-3 font-medium">
                      Publicacion
                    </th>
                    <th className="px-4 py-3 font-medium">
                      Tipo
                    </th>
                    <th className="px-4 py-3 font-medium">
                      Destinatario
                    </th>
                    <th className="px-4 py-3 font-medium">
                      Estado
                    </th>
                    {puedeGestionar && (
                      <th className="px-4 py-3 font-medium">
                        Acciones
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {avisosFiltrados.map((aviso) => (
                    <tr
                      key={aviso.id}
                      className="border-b border-slate-100 transition hover:bg-slate-50"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                            <Megaphone size={22} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {aviso.titulo}
                            </p>
                            <p className="mt-1 line-clamp-2 max-w-md text-sm text-slate-500">
                              {aviso.contenido}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-800">
                          {aviso.autor
                            ? `${aviso.autor.nombres} ${aviso.autor.apellidos}`
                            : "Autor no disponible"}
                        </p>
                        <p className="text-sm text-slate-500">
                          {aviso.autor?.correo ?? "Sin correo"}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        {formatearFecha(aviso.created_at)}
                      </td>

                      <td className="px-4 py-4">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                          {aviso.tipo}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-800">
                          {aviso.destinatario}
                        </p>
                        <p className="text-sm text-slate-500">
                          {obtenerDetalleDestinatario(aviso)}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={
                            aviso.estado
                              ? "rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700"
                              : "rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700"
                          }
                        >
                          {aviso.estado ? "Activo" : "Inactivo"}
                        </span>
                      </td>

                      {puedeGestionar && (
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                abrirModalEditar(aviso)
                              }
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                            >
                              <Pencil size={17} />
                              Editar
                            </button>

                            <button
                              type="button"
                              onClick={() => cambiarEstado(aviso)}
                              disabled={actualizandoId === aviso.id}
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {actualizandoId === aviso.id ? (
                                <LoaderCircle
                                  size={17}
                                  className="animate-spin"
                                />
                              ) : aviso.estado ? (
                                <ToggleRight size={17} />
                              ) : (
                                <ToggleLeft size={17} />
                              )}
                              {aviso.estado
                                ? "Desactivar"
                                : "Activar"}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {avisosFiltrados.length === 0 && (
                <div className="py-12 text-center">
                  <Bell
                    size={38}
                    className="mx-auto text-slate-300"
                  />
                  <p className="mt-3 text-slate-500">
                    No se encontraron avisos registrados.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <NuevoAvisoModal
        abierto={modalNuevoAbierto}
        onCerrar={() => setModalNuevoAbierto(false)}
        onAvisoCreado={cargarAvisos}
      />

      <EditarAvisoModal
        abierto={modalEditarAbierto}
        aviso={avisoSeleccionado}
        onCerrar={cerrarModalEditar}
        onAvisoActualizado={cargarAvisos}
      />
    </MainLayout>
  );
}
