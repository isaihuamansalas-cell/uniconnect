"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
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
import { Input, Paginacion, type TamanoPaginaComun } from "@/components/ui";
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
  total?: number;
  totalPages?: number;
  error?: string;
};

type FiltrosEmprendimientos = { titulo: string; autor: string; estado: string };
const filtrosVacios: FiltrosEmprendimientos = { titulo: "", autor: "", estado: "todos" };

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
  const abortControllerRef = useRef<AbortController | null>(null);
  const solicitudActualRef = useRef(0);
  const [filtrosEdicion, setFiltrosEdicion] = useState<FiltrosEmprendimientos>(filtrosVacios);
  const [filtrosAplicados, setFiltrosAplicados] = useState<FiltrosEmprendimientos>(filtrosVacios);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<TamanoPaginaComun>(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
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
    abortControllerRef.current?.abort();
    const controlador = new AbortController();
    abortControllerRef.current = controlador;
    const solicitud = ++solicitudActualRef.current;
    setCargando(true);
    setError("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.replace("/login");
      setCargando(false);
      return;
    }

    try {
      const parametros = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      Object.entries(filtrosAplicados).forEach(([campo, valor]) => {
        if (valor && valor !== "todos") parametros.set(campo, valor.trim());
      });
      const respuesta = await fetch(`/api/emprendimientos?${parametros.toString()}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
        signal: controlador.signal,
      });

      const resultado =
        (await respuesta.json()) as RespuestaEmprendimientos;

      if (controlador.signal.aborted || solicitud !== solicitudActualRef.current) return;
      if (!respuesta.ok) {
        setError(
          resultado.error ??
            "No se pudieron cargar los emprendimientos."
        );
        return;
      }

      setEmprendimientos(resultado.emprendimientos ?? []);
      setPuedeGestionar(resultado.puedeGestionar ?? false);
      setTotal(resultado.total ?? 0);
      setTotalPages(resultado.totalPages ?? 0);
      if ((resultado.emprendimientos ?? []).length === 0 && page > 1) {
        setPage(Math.max(1, resultado.totalPages ?? page - 1));
      }
    } catch (errorInesperado) {
      if (errorInesperado instanceof DOMException && errorInesperado.name === "AbortError") return;
      console.error(errorInesperado);
      setError("No se pudo conectar con el servidor.");
    } finally {
      if (solicitud === solicitudActualRef.current) setCargando(false);
    }
  }, [filtrosAplicados, page, pageSize, router]);

  useEffect(() => {
    void cargarEmprendimientos();
    return () => abortControllerRef.current?.abort();
  }, [cargarEmprendimientos]);

  function buscar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPage(1); setFiltrosAplicados(filtrosEdicion);
  }
  function limpiarFiltros() {
    setFiltrosEdicion(filtrosVacios); setFiltrosAplicados(filtrosVacios); setPage(1);
  }

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
            <p className="text-sm font-medium text-primary">
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
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl btn-primary px-5 py-3 font-semibold text-white transition sm:w-auto"
            >
              <Plus size={20} />
              Nuevo emprendimiento
            </button>
          )}
        </div>

        <div className="mt-8 rounded-2xl bg-white p-4 shadow-sm sm:p-6">
          <form onSubmit={buscar} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="relative">
            <Search
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <Input
              type="search"
              value={filtrosEdicion.titulo}
              onChange={(event) => setFiltrosEdicion((a) => ({...a, titulo: event.target.value}))}
              placeholder="Titulo"
              className="pl-11"
            />
          </div>
          <Input value={filtrosEdicion.autor} onChange={(event) => setFiltrosEdicion((a) => ({...a, autor: event.target.value}))} placeholder="Autor" />
          <select value={filtrosEdicion.estado} onChange={(event) => setFiltrosEdicion((a) => ({...a, estado: event.target.value}))} className="h-12 rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"><option value="todos">Todos los estados</option><option value="activo">Activos</option><option value="inactivo">Inactivos</option></select>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-3"><button type="submit" className="btn-primary rounded-xl px-5 py-3 font-semibold">Buscar</button><button type="button" onClick={limpiarFiltros} className="rounded-xl border border-slate-300 px-5 py-3 font-semibold dark:border-slate-700 dark:text-slate-200">Limpiar</button></div>
          </form>

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
              {emprendimientos.length === 0 ? (
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
                  {emprendimientos.map(
                    (emprendimiento) => (
                      <article
                        key={emprendimiento.id}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-primary hover:shadow-md"
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
                                  ? "shrink-0 rounded-full bg-primary-soft px-3 py-1 text-sm font-medium text-primary"
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
          {!cargando && <div className="mt-5"><Paginacion page={page} pageSize={pageSize} total={total} totalPages={totalPages} onPageChange={setPage} onPageSizeChange={(tamano) => { setPageSize(tamano); setPage(1); }} /></div>}
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
