"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Store,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

import MainLayout from "@/components/layout/MainLayout";
import EditarEmprendimientoModal, {
  type EmprendimientoEditable,
} from "@/components/emprendimientos/EditarEmprendimientoModal";
import FotoEmprendimiento from "@/components/emprendimientos/FotoEmprendimiento";
import NuevoEmprendimientoModal from "@/components/emprendimientos/NuevoEmprendimientoModal";
import { Input } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";

type AutorEmprendimiento = {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
};

type Emprendimiento = {
  id: number;
  titulo: string;
  descripcion: string;
  autor_id: string;
  foto: string | null;
  estado: boolean;
  created_at: string;
  updated_at: string | null;
  autor: AutorEmprendimiento | null;
};

type RespuestaEmprendimientos = {
  emprendimientos?: Emprendimiento[];
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

export default function EmprendimientosPage() {
  const router = useRouter();

  const [emprendimientos, setEmprendimientos] = useState<
    Emprendimiento[]
  >([]);
  const [puedeGestionar, setPuedeGestionar] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [actualizandoId, setActualizandoId] = useState<
    number | null
  >(null);
  const [error, setError] = useState("");

  const [modalNuevoAbierto, setModalNuevoAbierto] =
    useState(false);
  const [modalEditarAbierto, setModalEditarAbierto] =
    useState(false);
  const [
    emprendimientoSeleccionado,
    setEmprendimientoSeleccionado,
  ] = useState<EmprendimientoEditable | null>(null);

  const cargarEmprendimientos = useCallback(async () => {
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
      const respuesta = await fetch("/api/emprendimientos", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const resultado =
        (await respuesta.json()) as RespuestaEmprendimientos;

      if (!respuesta.ok) {
        setError(
          resultado.error ??
            "No se pudieron cargar los emprendimientos."
        );
        return;
      }

      setEmprendimientos(resultado.emprendimientos ?? []);
      setPuedeGestionar(resultado.puedeGestionar ?? false);
    } catch (errorInesperado) {
      console.error(errorInesperado);
      setError("No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }, [router]);

  useEffect(() => {
    cargarEmprendimientos();
  }, [cargarEmprendimientos]);

  const emprendimientosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) {
      return emprendimientos;
    }

    return emprendimientos.filter((emprendimiento) => {
      const autor = emprendimiento.autor
        ? `${emprendimiento.autor.nombres} ${emprendimiento.autor.apellidos}`
        : "";

      return (
        emprendimiento.titulo.toLowerCase().includes(texto) ||
        autor.toLowerCase().includes(texto)
      );
    });
  }, [busqueda, emprendimientos]);

  function abrirModalEditar(emprendimiento: Emprendimiento) {
    setEmprendimientoSeleccionado({
      id: emprendimiento.id,
      titulo: emprendimiento.titulo,
      descripcion: emprendimiento.descripcion,
      foto: emprendimiento.foto,
      estado: emprendimiento.estado,
    });
    setModalEditarAbierto(true);
  }

  function cerrarModalEditar() {
    setModalEditarAbierto(false);
    setEmprendimientoSeleccionado(null);
  }

  async function cambiarEstado(
    emprendimiento: Emprendimiento
  ) {
    setActualizandoId(emprendimiento.id);
    setError("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.replace("/login");
      return;
    }

    try {
      const respuesta = await fetch(
        `/api/emprendimientos/${emprendimiento.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            titulo: emprendimiento.titulo,
            descripcion: emprendimiento.descripcion,
            estado: !emprendimiento.estado,
          }),
        }
      );

      const resultado = (await respuesta.json()) as RespuestaApi;

      if (!respuesta.ok) {
        setError(
          resultado.error ??
            "No se pudo cambiar el estado del emprendimiento."
        );
        return;
      }

      await cargarEmprendimientos();
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
              Comunidad emprendedora
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Emprendimientos
            </h1>

            <p className="mt-2 text-slate-600">
              Consulta y administra publicaciones de productos y
              servicios de la comunidad educativa.
            </p>
          </div>

          {puedeGestionar && (
            <button
              type="button"
              onClick={() => setModalNuevoAbierto(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white transition hover:bg-emerald-800"
            >
              <Plus size={20} />
              Nuevo emprendimiento
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
              placeholder="Buscar por titulo o autor"
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
              Cargando emprendimientos...
            </div>
          ) : (
            <div className="mt-6">
              {emprendimientosFiltrados.length === 0 ? (
                <div className="py-12 text-center">
                  <Store
                    size={38}
                    className="mx-auto text-slate-300"
                  />
                  <p className="mt-3 text-slate-500">
                    No se encontraron emprendimientos registrados.
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {emprendimientosFiltrados.map(
                    (emprendimiento) => (
                      <article
                        key={emprendimiento.id}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-emerald-200 hover:shadow-md"
                      >
                        <div className="aspect-[16/10] bg-slate-100">
                          {emprendimiento.foto ? (
                            <FotoEmprendimiento
                              emprendimientoId={emprendimiento.id}
                              version={`${emprendimiento.foto}-${emprendimiento.updated_at ?? ""}`}
                              className="h-full w-full object-cover"
                              fallbackClassName="flex h-full w-full items-center justify-center bg-slate-100 text-slate-500"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-500">
                              <Store size={38} />
                            </div>
                          )}
                        </div>

                        <div className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h2 className="line-clamp-2 text-lg font-bold text-slate-900">
                                {emprendimiento.titulo}
                              </h2>

                              <p className="mt-2 line-clamp-3 text-sm text-slate-600">
                                {emprendimiento.descripcion}
                              </p>
                            </div>

                            <span
                              className={
                                emprendimiento.estado
                                  ? "shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700"
                                  : "shrink-0 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700"
                              }
                            >
                              {emprendimiento.estado
                                ? "Activo"
                                : "Inactivo"}
                            </span>
                          </div>

                          <div className="mt-5 border-t border-slate-100 pt-4 text-sm">
                            <p className="font-medium text-slate-800">
                              {emprendimiento.autor
                                ? `${emprendimiento.autor.nombres} ${emprendimiento.autor.apellidos}`
                                : "Autor no disponible"}
                            </p>

                            <p className="mt-1 text-slate-500">
                              {formatearFecha(
                                emprendimiento.created_at
                              )}
                            </p>
                          </div>

                          {puedeGestionar && (
                            <div className="mt-5 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  abrirModalEditar(emprendimiento)
                                }
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                              >
                                <Pencil size={17} />
                                Editar
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  cambiarEstado(emprendimiento)
                                }
                                disabled={
                                  actualizandoId ===
                                  emprendimiento.id
                                }
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {actualizandoId ===
                                emprendimiento.id ? (
                                  <LoaderCircle
                                    size={17}
                                    className="animate-spin"
                                  />
                                ) : emprendimiento.estado ? (
                                  <ToggleRight size={17} />
                                ) : (
                                  <ToggleLeft size={17} />
                                )}
                                {emprendimiento.estado
                                  ? "Desactivar"
                                  : "Activar"}
                              </button>
                            </div>
                          )}
                        </div>
                      </article>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <NuevoEmprendimientoModal
        abierto={modalNuevoAbierto}
        onCerrar={() => setModalNuevoAbierto(false)}
        onEmprendimientoCreado={cargarEmprendimientos}
      />

      <EditarEmprendimientoModal
        abierto={modalEditarAbierto}
        emprendimiento={emprendimientoSeleccionado}
        onCerrar={cerrarModalEditar}
        onEmprendimientoActualizado={cargarEmprendimientos}
      />
    </MainLayout>
  );
}
