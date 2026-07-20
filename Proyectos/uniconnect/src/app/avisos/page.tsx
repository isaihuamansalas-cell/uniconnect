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
import { Input, Paginacion, type TamanoPaginaComun } from "@/components/ui";
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
  total?: number;
  totalPages?: number;
  error?: string;
};

type FiltrosAvisos = {
  titulo: string;
  contenido: string;
  autor: string;
  tipo: string;
  destinatario: string;
  estado: string;
};

const filtrosVacios: FiltrosAvisos = {
  titulo: "", contenido: "", autor: "", tipo: "", destinatario: "", estado: "todos",
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
  const abortControllerRef = useRef<AbortController | null>(null);
  const solicitudActualRef = useRef(0);
  const [filtrosEdicion, setFiltrosEdicion] = useState<FiltrosAvisos>(filtrosVacios);
  const [filtrosAplicados, setFiltrosAplicados] = useState<FiltrosAvisos>(filtrosVacios);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<TamanoPaginaComun>(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
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
      const respuesta = await fetch(`/api/avisos?${parametros.toString()}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
        signal: controlador.signal,
      });

      const resultado =
        (await respuesta.json()) as RespuestaAvisos;

      if (controlador.signal.aborted || solicitud !== solicitudActualRef.current) return;
      if (!respuesta.ok) {
        setError(
          resultado.error ?? "No se pudieron cargar los avisos."
        );
        return;
      }

      setAvisos(resultado.avisos ?? []);
      setPuedeGestionar(resultado.puedeGestionar ?? false);
      setTotal(resultado.total ?? 0);
      setTotalPages(resultado.totalPages ?? 0);
      if ((resultado.avisos ?? []).length === 0 && page > 1) {
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
    void cargarAvisos();
    return () => abortControllerRef.current?.abort();
  }, [cargarAvisos]);

  function buscar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setFiltrosAplicados(filtrosEdicion);
  }

  function limpiarFiltros() {
    setFiltrosEdicion(filtrosVacios);
    setFiltrosAplicados(filtrosVacios);
    setPage(1);
  }

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
            <p className="text-sm font-medium text-primary">
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
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl btn-primary px-5 py-3 font-semibold text-white transition sm:w-auto"
            >
              <Plus size={20} />
              Nuevo aviso
            </button>
          )}
        </div>

        <div className="mt-8 rounded-2xl bg-white p-4 shadow-sm sm:p-6">
          <form onSubmit={buscar} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="relative">
            <Search
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <Input
              type="search"
              value={filtrosEdicion.titulo}
              onChange={(event) => setFiltrosEdicion((actual) => ({ ...actual, titulo: event.target.value }))}
              placeholder="Titulo"
              className="pl-11"
            />
          </div>
          <Input value={filtrosEdicion.contenido} onChange={(event) => setFiltrosEdicion((a) => ({...a, contenido: event.target.value}))} placeholder="Contenido" />
          <Input value={filtrosEdicion.autor} onChange={(event) => setFiltrosEdicion((a) => ({...a, autor: event.target.value}))} placeholder="Autor" />
          <Input value={filtrosEdicion.tipo} onChange={(event) => setFiltrosEdicion((a) => ({...a, tipo: event.target.value}))} placeholder="Tipo" />
          <select value={filtrosEdicion.destinatario} onChange={(event) => setFiltrosEdicion((a) => ({...a, destinatario: event.target.value}))} className="h-12 rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
            <option value="">Todos los destinatarios</option><option value="Todos">Todos</option><option value="Area academica">Area academica</option><option value="Ciclo especifico">Ciclo especifico</option>
          </select>
          <select value={filtrosEdicion.estado} onChange={(event) => setFiltrosEdicion((a) => ({...a, estado: event.target.value}))} className="h-12 rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
            <option value="todos">Todos los estados</option><option value="activo">Activos</option><option value="inactivo">Inactivos</option>
          </select>
          <div className="flex gap-2 md:col-span-2 xl:col-span-3">
            <button type="submit" className="btn-primary rounded-xl px-5 py-3 font-semibold">Buscar</button>
            <button type="button" onClick={limpiarFiltros} className="rounded-xl border border-slate-300 px-5 py-3 font-semibold dark:border-slate-700 dark:text-slate-200">Limpiar</button>
          </div>
          </form>

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
            <div className="mt-6 max-w-full overflow-x-auto">
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
                  {avisos.map((aviso) => (
                    <tr
                      key={aviso.id}
                      className="border-b border-slate-100 transition hover:bg-slate-50"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
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
                              ? "rounded-full bg-primary-soft px-3 py-1 text-sm font-medium text-primary"
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

              {avisos.length === 0 && (
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
          {!cargando && (
            <div className="mt-5"><Paginacion page={page} pageSize={pageSize} total={total} totalPages={totalPages} onPageChange={setPage} onPageSizeChange={(tamano) => { setPageSize(tamano); setPage(1); }} /></div>
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
