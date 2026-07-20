"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarDays,
  Car,
  Download,
  FileDown,
  LoaderCircle,
  Printer,
  Search,
  Store,
  Users,
} from "lucide-react";

import { useConfiguracion } from "@/components/configuracion/ConfiguracionProvider";
import MainLayout from "@/components/layout/MainLayout";
import { FormField, Input, Paginacion, StatCard, type TamanoPaginaComun } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";

type Estadisticas = {
  usuariosActivos: number;
  vehiculosActivos: number;
  salidasHoy: number;
  avisosActivos: number;
  emprendimientosActivos: number;
};

type UsuarioResumen = {
  id: string;
  nombres: string;
  apellidos: string;
  dni: string;
  codigo_estudiante: string | null;
};

type VehiculoResumen = {
  id: number;
  placa: string;
  marca: string | null;
  modelo: string | null;
  color: string;
  tipo: string;
};

type Salida = {
  id: number;
  vehiculo_id: number;
  estudiante_id: string;
  garita_id: string;
  fecha: string | null;
  hora: string | null;
  created_at: string;
  estudiante: UsuarioResumen | null;
  garita: UsuarioResumen | null;
  vehiculo: VehiculoResumen | null;
};

type RespuestaEstadisticas = {
  estadisticas?: Estadisticas;
  rol_id?: number;
  error?: string;
};

type RespuestaSalidas = {
  salidas?: Salida[];
  rol_id?: number;
  total?: number;
  totalPages?: number;
  error?: string;
};

type Filtros = {
  fechaInicio: string;
  fechaFin: string;
  dni: string;
  codigo: string;
  placa: string;
};

const estadisticasVacias: Estadisticas = {
  usuariosActivos: 0,
  vehiculosActivos: 0,
  salidasHoy: 0,
  avisosActivos: 0,
  emprendimientosActivos: 0,
};

const nombresRoles: Record<number, string> = {
  1: "Administrador",
  2: "Director",
  3: "Profesor",
  4: "Garita",
  5: "Estudiante",
};

const formatoFecha = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "medium",
});

const formatoHora = new Intl.DateTimeFormat("es-PE", {
  timeStyle: "short",
});

function obtenerFecha(registro: Salida) {
  if (registro.fecha) {
    return registro.fecha;
  }

  const fecha = new Date(registro.created_at);

  if (Number.isNaN(fecha.getTime())) {
    return "Sin fecha";
  }

  return formatoFecha.format(fecha);
}

function obtenerHora(registro: Salida) {
  if (registro.hora) {
    return registro.hora;
  }

  const fecha = new Date(registro.created_at);

  if (Number.isNaN(fecha.getTime())) {
    return "Sin hora";
  }

  return formatoHora.format(fecha);
}

function obtenerNombre(usuario: UsuarioResumen | null) {
  if (!usuario) {
    return "No disponible";
  }

  return `${usuario.nombres} ${usuario.apellidos}`.trim();
}

function obtenerVehiculo(vehiculo: VehiculoResumen | null) {
  if (!vehiculo) {
    return "No disponible";
  }

  return `${vehiculo.marca ?? "Sin marca"} ${
    vehiculo.modelo ?? ""
  } ${vehiculo.color} ${vehiculo.tipo}`.trim();
}

function validarFiltros(filtros: Filtros) {
  if (
    filtros.fechaInicio &&
    filtros.fechaFin &&
    filtros.fechaInicio > filtros.fechaFin
  ) {
    return "La fecha inicial no puede ser mayor que la fecha final.";
  }

  if (filtros.dni && !/^\d{1,8}$/.test(filtros.dni)) {
    return "El DNI solo puede contener hasta 8 numeros.";
  }

  if (
    filtros.codigo &&
    !/^[A-Za-z0-9_-]{1,30}$/.test(filtros.codigo)
  ) {
    return "El codigo contiene caracteres no validos.";
  }

  if (
    filtros.placa &&
    !/^[A-Za-z0-9-]{1,12}$/.test(filtros.placa)
  ) {
    return "La placa contiene caracteres no validos.";
  }

  return "";
}

export default function ReportesPage() {
  const router = useRouter();
  const { configuracion } = useConfiguracion();

  const [estadisticas, setEstadisticas] =
    useState<Estadisticas>(estadisticasVacias);
  const [salidas, setSalidas] = useState<Salida[]>([]);
  const [rolId, setRolId] = useState<number | null>(null);
  const filtrosIniciales: Filtros = {
    fechaInicio: "",
    fechaFin: "",
    dni: "",
    codigo: "",
    placa: "",
  };
  const [filtros, setFiltros] = useState<Filtros>(filtrosIniciales);
  const [filtrosAplicados, setFiltrosAplicados] = useState<Filtros>(filtrosIniciales);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<TamanoPaginaComun>(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [cargandoSalidas, setCargandoSalidas] = useState(false);
  const [error, setError] = useState("");
  const [errorSalidas, setErrorSalidas] = useState("");
  const [exportando, setExportando] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const solicitudActualRef = useRef(0);

  const puedeVerEstadisticas =
    rolId === 1 || rolId === 2 || rolId === 3;
  const puedeVerSalidas =
    rolId === 1 || rolId === 2 || rolId === 4;

  const construirParametros = useCallback((incluirPaginacion = true) => {
    const parametros = new URLSearchParams();
    if (incluirPaginacion) {
      parametros.set("page", String(page));
      parametros.set("pageSize", String(pageSize));
    }

    if (filtrosAplicados.fechaInicio) {
      parametros.set("fechaInicio", filtrosAplicados.fechaInicio);
    }

    if (filtrosAplicados.fechaFin) {
      parametros.set("fechaFin", filtrosAplicados.fechaFin);
    }

    if (filtrosAplicados.dni.trim()) {
      parametros.set("dni", filtrosAplicados.dni.trim());
    }

    if (filtrosAplicados.codigo.trim()) {
      parametros.set("codigo", filtrosAplicados.codigo.trim());
    }

    if (filtrosAplicados.placa.trim()) {
      parametros.set("placa", filtrosAplicados.placa.trim().toUpperCase());
    }

    return parametros.toString();
  }, [filtrosAplicados, page, pageSize]);

  const cargarSalidas = useCallback(async () => {
    const errorValidacion = validarFiltros(filtrosAplicados);

    if (errorValidacion) {
      setErrorSalidas(errorValidacion);
      return;
    }

    setCargandoSalidas(true);
    setErrorSalidas("");
    abortControllerRef.current?.abort();
    const controlador = new AbortController();
    abortControllerRef.current = controlador;
    const solicitud = ++solicitudActualRef.current;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.replace("/login");
      setCargandoSalidas(false);
      return;
    }

    const parametros = construirParametros();
    const url = parametros
      ? `/api/reportes/salidas?${parametros}`
      : "/api/reportes/salidas";

    try {
      const respuesta = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
        signal: controlador.signal,
      });

      const resultado = (await respuesta.json()) as RespuestaSalidas;
      if (controlador.signal.aborted || solicitud !== solicitudActualRef.current) return;

      if (!respuesta.ok) {
        setErrorSalidas(
          resultado.error ?? "No se pudieron cargar las salidas."
        );
        setSalidas([]);
        setTotal(0);
        setTotalPages(0);

        if (respuesta.status === 403 && resultado.rol_id) {
          setRolId(resultado.rol_id);
        }

        return;
      }

      setRolId(resultado.rol_id ?? null);
      setSalidas(resultado.salidas ?? []);
      setTotal(resultado.total ?? 0);
      setTotalPages(resultado.totalPages ?? 0);
      if ((resultado.salidas ?? []).length === 0 && page > 1) setPage(Math.max(1, resultado.totalPages ?? page - 1));
    } catch (errorInesperado) {
      if (errorInesperado instanceof DOMException && errorInesperado.name === "AbortError") return;
      console.error(errorInesperado);
      setErrorSalidas("No se pudo conectar con el servidor.");
    } finally {
      if (solicitud === solicitudActualRef.current) setCargandoSalidas(false);
    }
  }, [construirParametros, filtrosAplicados, page, router]);

  const cargarReportes = useCallback(async () => {
    setCargando(true);
    setError("");
    setErrorSalidas("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.replace("/login");
      return;
    }

    try {
      const respuestaEstadisticas = await fetch(
        "/api/reportes/estadisticas",
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        }
      );

      const resultadoEstadisticas =
        (await respuestaEstadisticas.json()) as RespuestaEstadisticas;

      if (respuestaEstadisticas.ok) {
        setEstadisticas(
          resultadoEstadisticas.estadisticas ?? estadisticasVacias
        );
        setRolId(resultadoEstadisticas.rol_id ?? null);
      } else if (respuestaEstadisticas.status !== 403) {
        setError(
          resultadoEstadisticas.error ??
            "No se pudieron cargar las estadisticas."
        );
      }

      const respuestaSalidas = await fetch("/api/reportes/salidas", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const resultadoSalidas =
        (await respuestaSalidas.json()) as RespuestaSalidas;

      if (respuestaSalidas.ok) {
        setSalidas(resultadoSalidas.salidas ?? []);
        setRolId(resultadoSalidas.rol_id ?? null);
      } else if (
        respuestaSalidas.status === 403 &&
        !respuestaEstadisticas.ok
      ) {
        setError(
          resultadoSalidas.error ??
            resultadoEstadisticas.error ??
            "No tienes permiso para ver reportes."
        );
      } else if (respuestaSalidas.status !== 403) {
        setErrorSalidas(
          resultadoSalidas.error ??
            "No se pudieron cargar las salidas."
        );
      }
    } catch (errorInesperado) {
      console.error(errorInesperado);
      setError("No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }, [router]);

  useEffect(() => {
    void cargarReportes();
  }, [cargarReportes]);

  useEffect(() => {
    if (!cargando) void cargarSalidas();
    return () => abortControllerRef.current?.abort();
  }, [cargando, cargarSalidas]);

  function actualizarFiltro(campo: keyof Filtros, valor: string) {
    setFiltros((filtrosActuales) => ({
      ...filtrosActuales,
      [campo]: valor,
    }));
  }

  function buscarSalidas(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errorValidacion = validarFiltros(filtros);
    if (errorValidacion) { setErrorSalidas(errorValidacion); return; }
    setPage(1);
    setFiltrosAplicados({ ...filtros, codigo: filtros.codigo.trim().toUpperCase(), placa: filtros.placa.trim().toUpperCase() });
  }

  async function exportarCsv() {
    setExportando(true); setErrorSalidas("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const parametros = construirParametros(false);
      const respuesta = await fetch(`/api/reportes/salidas/exportar?${parametros.toString()}`, { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
      if (!respuesta.ok) {
        const resultado = (await respuesta.json()) as { error?: string };
        setErrorSalidas(resultado.error ?? "No se pudo exportar el reporte."); return;
      }
      const archivo = await respuesta.blob();
      const url = URL.createObjectURL(archivo); const enlace = document.createElement("a");
      enlace.href = url; enlace.download = `reporte-salidas-${new Date().toISOString().slice(0, 10)}.csv`; enlace.click(); URL.revokeObjectURL(url);
    } catch { setErrorSalidas("No se pudo exportar el reporte."); }
    finally { setExportando(false); }
  }

  function imprimirReporte() {
    window.print();
  }

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-950">
        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
          <LoaderCircle size={22} className="animate-spin" />
          Cargando reportes...
        </div>
      </main>
    );
  }

  return (
    <MainLayout>
      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <div>
            <p className="text-sm font-medium text-primary">
              Administracion
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">
              Reportes
            </h1>

            <p className="mt-2 text-slate-600 dark:text-slate-300">
              {rolId
                ? `${nombresRoles[rolId] ?? "Usuario"} activo`
                : "Consulta estadisticas y salidas autorizadas."}
            </p>
          </div>
        </div>

        {error && (
          <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300 print:hidden">
            {error}
          </p>
        )}

        {puedeVerEstadisticas && (
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-5 print:hidden">
            <StatCard
              title="Usuarios activos"
              value={String(estadisticas.usuariosActivos)}
              icon={<Users size={36} />}
            />
            <StatCard
              title="Vehiculos activos"
              value={String(estadisticas.vehiculosActivos)}
              icon={<Car size={36} />}
            />
            <StatCard
              title="Salidas del dia"
              value={String(estadisticas.salidasHoy)}
              icon={<CalendarDays size={36} />}
            />
            <StatCard
              title="Avisos activos"
              value={String(estadisticas.avisosActivos)}
              icon={<Bell size={36} />}
            />
            <StatCard
              title="Emprendimientos activos"
              value={String(estadisticas.emprendimientosActivos)}
              icon={<Store size={36} />}
            />
          </div>
        )}

        {rolId === 3 && (
          <div className="mt-8 rounded-2xl bg-white p-4 shadow-sm dark:border dark:border-slate-800 dark:bg-slate-900 print:hidden sm:p-6">
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              Acceso limitado
            </p>
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              Tu rol puede ver estadisticas generales, pero no datos
              sensibles ni detalle de salidas.
            </p>
          </div>
        )}

        {puedeVerSalidas && (
          <div className="mt-8 rounded-2xl bg-white p-4 shadow-sm dark:border dark:border-slate-800 dark:bg-slate-900 print:bg-white print:shadow-none sm:p-6">
            <div className="print:hidden">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Historial operativo de salidas
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Filtra por fecha, DNI, codigo institucional o placa.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={exportarCsv}
                    disabled={total === 0 || exportando}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {exportando ? <LoaderCircle size={18} className="animate-spin" /> : <Download size={18} />}
                    {exportando ? "Exportando..." : "Excel CSV"}
                  </button>

                  <button
                    type="button"
                    onClick={imprimirReporte}
                    disabled={salidas.length === 0}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Printer size={18} />
                    PDF
                  </button>
                </div>
              </div>

              <form
                onSubmit={buscarSalidas}
                className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6"
              >
                <FormField label="Fecha inicial">
                  <Input
                    type="date"
                    value={filtros.fechaInicio}
                    onChange={(event) =>
                      actualizarFiltro(
                        "fechaInicio",
                        event.target.value
                      )
                    }
                  />
                </FormField>

                <FormField label="Fecha final">
                  <Input
                    type="date"
                    value={filtros.fechaFin}
                    onChange={(event) =>
                      actualizarFiltro("fechaFin", event.target.value)
                    }
                  />
                </FormField>

                <FormField label="DNI">
                  <Input
                    value={filtros.dni}
                    onChange={(event) =>
                      actualizarFiltro("dni", event.target.value)
                    }
                    inputMode="numeric"
                    placeholder="DNI"
                  />
                </FormField>

                <FormField label="Codigo">
                  <Input
                    value={filtros.codigo}
                    onChange={(event) =>
                      actualizarFiltro("codigo", event.target.value)
                    }
                    placeholder="Codigo"
                  />
                </FormField>

                <FormField label="Placa">
                  <Input
                    value={filtros.placa}
                    onChange={(event) =>
                      actualizarFiltro("placa", event.target.value)
                    }
                    placeholder="ABC123"
                    className="uppercase"
                  />
                </FormField>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={cargandoSalidas}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl btn-primary px-5 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {cargandoSalidas ? (
                      <LoaderCircle
                        size={20}
                        className="animate-spin"
                      />
                    ) : (
                      <Search size={20} />
                    )}
                    Buscar
                  </button>
                </div>
              </form>

              {errorSalidas && (
                <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
                  {errorSalidas}
                </p>
              )}
            </div>

            <div className="hidden print:mb-6 print:block">
              <h1 className="text-2xl font-bold text-slate-900">
                Reporte de salidas
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                {configuracion.nombre_sistema} -{" "}
                {new Date().toLocaleDateString("es-PE")}
              </p>
            </div>

            {cargandoSalidas ? (
              <div className="mt-8 flex items-center gap-3 text-slate-500 dark:text-slate-400 print:hidden">
                <LoaderCircle size={20} className="animate-spin" />
                Cargando salidas...
              </div>
            ) : (
              <div className="mt-6 max-w-full overflow-x-auto">
                <table className="w-full min-w-[1180px] text-left text-sm print:min-w-0 print:text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      <th className="px-4 py-3 font-medium">Fecha</th>
                      <th className="px-4 py-3 font-medium">Hora</th>
                      <th className="px-4 py-3 font-medium">
                        Estudiante
                      </th>
                      <th className="px-4 py-3 font-medium">DNI</th>
                      <th className="px-4 py-3 font-medium">
                        Codigo
                      </th>
                      <th className="px-4 py-3 font-medium">
                        Vehiculo
                      </th>
                      <th className="px-4 py-3 font-medium">Placa</th>
                      <th className="px-4 py-3 font-medium">
                        Garita responsable
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {salidas.map((salida) => (
                      <tr
                        key={salida.id}
                        className="border-b border-slate-100 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                      >
                        <td className="px-4 py-4">
                          {obtenerFecha(salida)}
                        </td>
                        <td className="px-4 py-4">
                          {obtenerHora(salida)}
                        </td>
                        <td className="px-4 py-4 font-medium text-slate-900 dark:text-slate-100">
                          {obtenerNombre(salida.estudiante)}
                        </td>
                        <td className="px-4 py-4 text-slate-700 dark:text-slate-300">
                          {salida.estudiante?.dni ?? "No disponible"}
                        </td>
                        <td className="px-4 py-4 text-slate-700 dark:text-slate-300">
                          {salida.estudiante?.codigo_estudiante ??
                            "No registrado"}
                        </td>
                        <td className="px-4 py-4 text-slate-700 dark:text-slate-300">
                          {obtenerVehiculo(salida.vehiculo)}
                        </td>
                        <td className="px-4 py-4 font-semibold uppercase text-slate-900 dark:text-slate-100">
                          {salida.vehiculo?.placa ?? "Sin placa"}
                        </td>
                        <td className="px-4 py-4 text-slate-700 dark:text-slate-300">
                          {obtenerNombre(salida.garita)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {salidas.length === 0 && (
                  <div className="py-12 text-center print:hidden">
                    <FileDown
                      size={38}
                      className="mx-auto text-slate-300 dark:text-slate-600"
                    />
                    <p className="mt-3 text-slate-500 dark:text-slate-400">
                      No se encontraron salidas con los filtros
                      aplicados.
                    </p>
                  </div>
                )}
                <div className="mt-5 print:hidden">
                  <Paginacion page={page} pageSize={pageSize} total={total} totalPages={totalPages} cargando={cargandoSalidas} onPageChange={setPage} onPageSizeChange={(tamano) => { setPageSize(tamano); setPage(1); }} />
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </MainLayout>
  );
}
