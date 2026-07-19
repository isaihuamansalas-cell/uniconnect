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
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Download,
  Eraser,
  LoaderCircle,
  Search,
} from "lucide-react";

import MainLayout from "@/components/layout/MainLayout";
import FotoUsuario from "@/components/usuarios/FotoUsuario";
import FotoVehiculo from "@/components/vehiculos/FotoVehiculo";
import { FormField, Input, Select } from "@/components/ui";
import type {
  RegistroHistorial,
  TamanoPagina,
} from "@/lib/historial/consultarHistorial";
import { supabase } from "@/lib/supabase/client";

type FiltrosFormulario = {
  fechaInicio: string;
  fechaFin: string;
  estudiante: string;
  dni: string;
  codigo: string;
  placa: string;
  responsable: string;
};

type RespuestaHistorial = {
  registros?: RegistroHistorial[];
  total?: number;
  page?: number;
  pageSize?: TamanoPagina;
  totalPages?: number;
  error?: string;
};

const filtrosVacios: FiltrosFormulario = {
  fechaInicio: "",
  fechaFin: "",
  estudiante: "",
  dni: "",
  codigo: "",
  placa: "",
  responsable: "",
};

const formatoFecha = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "medium",
  timeZone: "America/Lima",
});
const formatoHora = new Intl.DateTimeFormat("es-PE", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Lima",
});

function nombreCompleto(usuario: { nombres: string; apellidos: string } | null) {
  return usuario
    ? `${usuario.nombres} ${usuario.apellidos}`.trim()
    : "No disponible";
}

function fechaLegible(registro: RegistroHistorial) {
  if (registro.fecha) {
    const fecha = new Date(`${registro.fecha}T12:00:00-05:00`);
    if (!Number.isNaN(fecha.getTime())) return formatoFecha.format(fecha);
  }
  const fecha = new Date(registro.created_at);
  return Number.isNaN(fecha.getTime()) ? "Sin fecha" : formatoFecha.format(fecha);
}

function horaLegible(registro: RegistroHistorial) {
  if (registro.hora) return registro.hora.slice(0, 5);
  const fecha = new Date(registro.created_at);
  return Number.isNaN(fecha.getTime()) ? "Sin hora" : formatoHora.format(fecha);
}

function validarFormulario(filtros: FiltrosFormulario) {
  if (filtros.fechaInicio && filtros.fechaFin && filtros.fechaInicio > filtros.fechaFin) {
    return "La fecha inicial no puede ser posterior a la fecha final.";
  }
  if (filtros.estudiante.trim() && filtros.estudiante.trim().length < 3) {
    return "El nombre del estudiante debe tener al menos 3 caracteres.";
  }
  if (filtros.responsable.trim() && filtros.responsable.trim().length < 3) {
    return "El responsable debe tener al menos 3 caracteres.";
  }
  if (filtros.dni.trim() && !/^\d{1,8}$/.test(filtros.dni.trim())) {
    return "El DNI solo puede contener hasta 8 numeros.";
  }
  return "";
}

function construirParametros(
  filtros: FiltrosFormulario,
  pagina: number,
  pageSize: TamanoPagina,
  incluirPaginacion = true
) {
  const parametros = new URLSearchParams();
  if (incluirPaginacion) {
    parametros.set("page", String(pagina));
    parametros.set("pageSize", String(pageSize));
  }
  for (const [campo, valor] of Object.entries(filtros)) {
    const normalizado = valor.trim();
    if (normalizado) parametros.set(campo, normalizado);
  }
  return parametros;
}

export default function HistorialPage() {
  const router = useRouter();
  const abortControllerRef = useRef<AbortController | null>(null);
  const solicitudActualRef = useRef(0);
  const [filtrosEdicion, setFiltrosEdicion] =
    useState<FiltrosFormulario>(filtrosVacios);
  const [filtrosAplicados, setFiltrosAplicados] =
    useState<FiltrosFormulario>(filtrosVacios);
  const [registros, setRegistros] = useState<RegistroHistorial[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<TamanoPagina>(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [revision, setRevision] = useState(0);
  const [accessToken, setAccessToken] = useState("");
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState("");

  const cargarHistorial = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const numeroSolicitud = ++solicitudActualRef.current;
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
    setAccessToken(session.access_token);

    try {
      const parametros = construirParametros(filtrosAplicados, page, pageSize);
      const respuesta = await fetch(`/api/historial?${parametros.toString()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
        signal: controller.signal,
      });
      const resultado = (await respuesta.json()) as RespuestaHistorial;
      if (numeroSolicitud !== solicitudActualRef.current) return;

      if (!respuesta.ok) {
        setRegistros([]);
        setTotal(0);
        setTotalPages(0);
        setError(resultado.error ?? "No se pudo cargar el historial.");
        return;
      }

      setRegistros(resultado.registros ?? []);
      setTotal(resultado.total ?? 0);
      setTotalPages(resultado.totalPages ?? 0);
    } catch (errorInesperado) {
      if (errorInesperado instanceof DOMException && errorInesperado.name === "AbortError") return;
      console.error(errorInesperado);
      if (numeroSolicitud === solicitudActualRef.current) {
        setError("No se pudo conectar con el servidor.");
      }
    } finally {
      if (numeroSolicitud === solicitudActualRef.current) setCargando(false);
    }
  }, [filtrosAplicados, page, pageSize, router]);

  useEffect(() => {
    void cargarHistorial();
    return () => abortControllerRef.current?.abort();
  }, [cargarHistorial, revision]);

  function actualizarFiltro(campo: keyof FiltrosFormulario, valor: string) {
    setFiltrosEdicion((actuales) => ({ ...actuales, [campo]: valor }));
  }

  function buscar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errorValidacion = validarFormulario(filtrosEdicion);
    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }
    setPage(1);
    setFiltrosAplicados({
      ...filtrosEdicion,
      codigo: filtrosEdicion.codigo.trim().toUpperCase(),
      placa: filtrosEdicion.placa.trim().toUpperCase(),
    });
    setRevision((valor) => valor + 1);
  }

  function limpiar() {
    setFiltrosEdicion(filtrosVacios);
    setFiltrosAplicados(filtrosVacios);
    setPage(1);
    setError("");
    setRevision((valor) => valor + 1);
  }

  async function exportarCsv() {
    const errorValidacion = validarFormulario(filtrosAplicados);
    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }
    setExportando(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }
      const parametros = construirParametros(filtrosAplicados, page, pageSize, false);
      const respuesta = await fetch(`/api/historial/exportar?${parametros.toString()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      if (!respuesta.ok) {
        const resultado = (await respuesta.json()) as { error?: string };
        setError(resultado.error ?? "No se pudo exportar el historial.");
        return;
      }
      const archivo = await respuesta.blob();
      const url = URL.createObjectURL(archivo);
      const enlace = document.createElement("a");
      const disposicion = respuesta.headers.get("Content-Disposition") ?? "";
      const nombre = disposicion.match(/filename="([^"]+)"/)?.[1] ?? "historial-salidas.csv";
      enlace.href = url;
      enlace.download = nombre;
      enlace.click();
      URL.revokeObjectURL(url);
    } catch (errorInesperado) {
      console.error(errorInesperado);
      setError("No se pudo conectar con el servidor.");
    } finally {
      setExportando(false);
    }
  }

  return (
    <MainLayout>
      <section className="min-w-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Control de garita</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">
              Historial de salidas
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Consulta registros completos con filtros y paginacion segura.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void exportarCsv()}
            disabled={exportando || total === 0}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:w-auto"
          >
            {exportando ? <LoaderCircle size={20} className="animate-spin" /> : <Download size={20} />}
            {exportando ? "Exportando..." : "Exportar CSV filtrado"}
          </button>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm dark:border dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <form onSubmit={buscar} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <FormField label="Fecha inicial">
              <Input type="date" value={filtrosEdicion.fechaInicio} onChange={(e) => actualizarFiltro("fechaInicio", e.target.value)} />
            </FormField>
            <FormField label="Fecha final">
              <Input type="date" value={filtrosEdicion.fechaFin} onChange={(e) => actualizarFiltro("fechaFin", e.target.value)} />
            </FormField>
            <FormField label="Nombre del estudiante">
              <Input value={filtrosEdicion.estudiante} maxLength={80} onChange={(e) => actualizarFiltro("estudiante", e.target.value)} placeholder="Nombres o apellidos" />
            </FormField>
            <FormField label="DNI">
              <Input value={filtrosEdicion.dni} maxLength={8} inputMode="numeric" onChange={(e) => actualizarFiltro("dni", e.target.value)} placeholder="DNI exacto" />
            </FormField>
            <FormField label="Codigo institucional">
              <Input value={filtrosEdicion.codigo} maxLength={30} onChange={(e) => actualizarFiltro("codigo", e.target.value)} placeholder="Codigo exacto" className="uppercase" />
            </FormField>
            <FormField label="Placa">
              <Input value={filtrosEdicion.placa} maxLength={12} onChange={(e) => actualizarFiltro("placa", e.target.value)} placeholder="Placa exacta" className="uppercase" />
            </FormField>
            <FormField label="Responsable de Garita">
              <Input value={filtrosEdicion.responsable} maxLength={80} onChange={(e) => actualizarFiltro("responsable", e.target.value)} placeholder="Nombres o apellidos" />
            </FormField>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <button type="submit" disabled={cargando} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl btn-primary px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                {cargando ? <LoaderCircle size={20} className="animate-spin" /> : <Search size={20} />}
                Buscar
              </button>
              <button type="button" onClick={limpiar} disabled={cargando} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                <Eraser size={20} /> Limpiar
              </button>
            </div>
          </form>
        </div>

        <div aria-live="polite" aria-atomic="true">
          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              <p>{error}</p>
              <button type="button" onClick={() => setRevision((valor) => valor + 1)} className="mt-3 min-h-11 rounded-xl border border-current px-4 py-2">
                Reintentar
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm dark:border dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {total} {total === 1 ? "resultado" : "resultados"}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Pagina {totalPages === 0 ? 0 : page} de {totalPages}
              </p>
            </div>
            <div className="w-full sm:w-44">
              <FormField label="Resultados por pagina">
                <Select
                  value={pageSize}
                  disabled={cargando}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value) as TamanoPagina);
                    setPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </Select>
              </FormField>
            </div>
          </div>

          {cargando ? (
            <div className="flex min-h-48 items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
              <LoaderCircle size={22} className="animate-spin" /> Cargando historial...
            </div>
          ) : registros.length === 0 && !error ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400">
              <CalendarClock size={40} className="mx-auto text-slate-300 dark:text-slate-600" />
              <p className="mt-3">No se encontraron salidas con los filtros aplicados.</p>
            </div>
          ) : (
            <>
              <div className="mt-6 hidden max-w-full overflow-x-auto lg:block">
                <table className="w-full min-w-[1280px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      <th className="px-3 py-3 font-medium">Estudiante</th>
                      <th className="px-3 py-3 font-medium">DNI / Codigo</th>
                      <th className="px-3 py-3 font-medium">Vehiculo</th>
                      <th className="px-3 py-3 font-medium">Detalles</th>
                      <th className="px-3 py-3 font-medium">Fecha / Hora</th>
                      <th className="px-3 py-3 font-medium">Responsable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registros.map((registro) => (
                      <tr key={registro.id} className="border-b border-slate-100 align-top dark:border-slate-800">
                        <td className="px-3 py-4">
                          <div className="flex items-center gap-3">
                            {registro.estudiante && (
                              <FotoUsuario usuarioId={registro.estudiante.id} version={registro.estudiante.foto_version} accessToken={accessToken} className="h-14 w-14 shrink-0 rounded-xl object-cover" fallbackClassName="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300" iconSize={24} />
                            )}
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{nombreCompleto(registro.estudiante)}</span>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-slate-700 dark:text-slate-300">
                          <p>DNI: {registro.estudiante?.dni ?? "No disponible"}</p>
                          <p className="mt-1">Codigo: {registro.estudiante?.codigo_estudiante ?? "No registrado"}</p>
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex items-center gap-3">
                            {registro.vehiculo && (
                              <FotoVehiculo vehiculoId={registro.vehiculo.id} version={registro.vehiculo.foto_version} accessToken={accessToken} className="h-14 w-20 shrink-0 rounded-xl object-cover" fallbackClassName="flex h-14 w-20 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300" iconSize={24} />
                            )}
                            <span className="text-lg font-black uppercase text-primary">{registro.vehiculo?.placa ?? "Sin placa"}</span>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-slate-700 dark:text-slate-300">
                          <p>{registro.vehiculo?.marca ?? "Sin marca"} {registro.vehiculo?.modelo ?? ""}</p>
                          <p className="mt-1">{registro.vehiculo?.color ?? "Sin color"} · {registro.vehiculo?.tipo ?? "Sin tipo"}</p>
                        </td>
                        <td className="px-3 py-4 font-semibold text-slate-900 dark:text-slate-100">
                          <p>{fechaLegible(registro)}</p><p className="mt-1">{horaLegible(registro)}</p>
                        </td>
                        <td className="px-3 py-4 text-slate-700 dark:text-slate-300">{nombreCompleto(registro.responsable)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 grid min-w-0 gap-4 lg:hidden md:grid-cols-2">
                {registros.map((registro) => (
                  <article key={registro.id} className="min-w-0 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                    <div className="flex flex-wrap justify-center gap-3">
                      {registro.estudiante && <FotoUsuario usuarioId={registro.estudiante.id} version={registro.estudiante.foto_version} accessToken={accessToken} className="h-24 w-24 rounded-2xl object-cover" fallbackClassName="flex h-24 w-24 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300" iconSize={34} />}
                      {registro.vehiculo && <FotoVehiculo vehiculoId={registro.vehiculo.id} version={registro.vehiculo.foto_version} accessToken={accessToken} className="h-24 w-36 rounded-2xl object-cover" fallbackClassName="flex h-24 w-36 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300" iconSize={34} />}
                    </div>
                    <div className="mt-4 text-center">
                      <h2 className="break-words font-bold text-slate-900 dark:text-slate-100">{nombreCompleto(registro.estudiante)}</h2>
                      <p className="mt-1 text-2xl font-black uppercase text-primary">{registro.vehiculo?.placa ?? "Sin placa"}</p>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><dt className="text-slate-500 dark:text-slate-400">DNI</dt><dd className="break-words font-semibold text-slate-900 dark:text-slate-100">{registro.estudiante?.dni ?? "No disponible"}</dd></div>
                      <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><dt className="text-slate-500 dark:text-slate-400">Codigo</dt><dd className="break-words font-semibold text-slate-900 dark:text-slate-100">{registro.estudiante?.codigo_estudiante ?? "No registrado"}</dd></div>
                      <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><dt className="text-slate-500 dark:text-slate-400">Marca / modelo</dt><dd className="break-words font-semibold text-slate-900 dark:text-slate-100">{registro.vehiculo?.marca ?? "Sin marca"} {registro.vehiculo?.modelo ?? ""}</dd></div>
                      <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><dt className="text-slate-500 dark:text-slate-400">Color / tipo</dt><dd className="break-words font-semibold text-slate-900 dark:text-slate-100">{registro.vehiculo?.color ?? "Sin color"} · {registro.vehiculo?.tipo ?? "Sin tipo"}</dd></div>
                      <div className="col-span-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><dt className="text-slate-500 dark:text-slate-400">Fecha y hora</dt><dd className="font-semibold text-slate-900 dark:text-slate-100">{fechaLegible(registro)} · {horaLegible(registro)}</dd></div>
                      <div className="col-span-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><dt className="text-slate-500 dark:text-slate-400">Responsable de Garita</dt><dd className="break-words font-semibold text-slate-900 dark:text-slate-100">{nombreCompleto(registro.responsable)}</dd></div>
                    </dl>
                  </article>
                ))}
              </div>
            </>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={() => setPage((valor) => Math.max(1, valor - 1))} disabled={cargando || page <= 1} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 sm:w-auto"><ChevronLeft size={20} /> Anterior</button>
            <p className="text-center font-semibold text-slate-700 dark:text-slate-300">Pagina {totalPages === 0 ? 0 : page} de {totalPages}</p>
            <button type="button" onClick={() => setPage((valor) => valor + 1)} disabled={cargando || totalPages === 0 || page >= totalPages} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl btn-primary px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">Siguiente <ChevronRight size={20} /></button>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
