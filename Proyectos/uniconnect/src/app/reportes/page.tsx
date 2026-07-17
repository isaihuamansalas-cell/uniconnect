"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
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
import { FormField, Input, StatCard } from "@/components/ui";
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

function escaparCsv(valor: string | number | null | undefined) {
  const texto = String(valor ?? "");
  return `"${texto.replace(/"/g, '""')}"`;
}

function crearNombreArchivo() {
  const fecha = new Date().toISOString().slice(0, 10);
  return `reporte-salidas-${fecha}.csv`;
}

export default function ReportesPage() {
  const router = useRouter();
  const { configuracion } = useConfiguracion();

  const [estadisticas, setEstadisticas] =
    useState<Estadisticas>(estadisticasVacias);
  const [salidas, setSalidas] = useState<Salida[]>([]);
  const [rolId, setRolId] = useState<number | null>(null);
  const [filtros, setFiltros] = useState<Filtros>({
    fechaInicio: "",
    fechaFin: "",
    dni: "",
    codigo: "",
    placa: "",
  });
  const [cargando, setCargando] = useState(true);
  const [cargandoSalidas, setCargandoSalidas] = useState(false);
  const [error, setError] = useState("");
  const [errorSalidas, setErrorSalidas] = useState("");

  const puedeVerEstadisticas =
    rolId === 1 || rolId === 2 || rolId === 3;
  const puedeVerSalidas =
    rolId === 1 || rolId === 2 || rolId === 4;

  const construirParametros = useCallback(() => {
    const parametros = new URLSearchParams();

    if (filtros.fechaInicio) {
      parametros.set("fechaInicio", filtros.fechaInicio);
    }

    if (filtros.fechaFin) {
      parametros.set("fechaFin", filtros.fechaFin);
    }

    if (filtros.dni.trim()) {
      parametros.set("dni", filtros.dni.trim());
    }

    if (filtros.codigo.trim()) {
      parametros.set("codigo", filtros.codigo.trim());
    }

    if (filtros.placa.trim()) {
      parametros.set("placa", filtros.placa.trim().toUpperCase());
    }

    return parametros.toString();
  }, [filtros]);

  const cargarSalidas = useCallback(async () => {
    const errorValidacion = validarFiltros(filtros);

    if (errorValidacion) {
      setErrorSalidas(errorValidacion);
      return;
    }

    setCargandoSalidas(true);
    setErrorSalidas("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.replace("/login");
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
      });

      const resultado = (await respuesta.json()) as RespuestaSalidas;

      if (!respuesta.ok) {
        setErrorSalidas(
          resultado.error ?? "No se pudieron cargar las salidas."
        );
        setSalidas([]);

        if (respuesta.status === 403 && resultado.rol_id) {
          setRolId(resultado.rol_id);
        }

        return;
      }

      setRolId(resultado.rol_id ?? null);
      setSalidas(resultado.salidas ?? []);
    } catch (errorInesperado) {
      console.error(errorInesperado);
      setErrorSalidas("No se pudo conectar con el servidor.");
    } finally {
      setCargandoSalidas(false);
    }
  }, [construirParametros, filtros, router]);

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
    cargarReportes();
  }, [cargarReportes]);

  const filasExportacion = useMemo(
    () =>
      salidas.map((salida) => [
        obtenerFecha(salida),
        obtenerHora(salida),
        obtenerNombre(salida.estudiante),
        salida.estudiante?.dni ?? "",
        salida.estudiante?.codigo_estudiante ?? "",
        obtenerVehiculo(salida.vehiculo),
        salida.vehiculo?.placa ?? "",
        obtenerNombre(salida.garita),
      ]),
    [salidas]
  );

  function actualizarFiltro(campo: keyof Filtros, valor: string) {
    setFiltros((filtrosActuales) => ({
      ...filtrosActuales,
      [campo]: valor,
    }));
  }

  function buscarSalidas(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    cargarSalidas();
  }

  function exportarCsv() {
    const encabezados = [
      "Fecha",
      "Hora",
      "Estudiante",
      "DNI",
      "Codigo",
      "Vehiculo",
      "Placa",
      "Garita responsable",
    ];
    const contenido = [
      encabezados.map(escaparCsv).join(","),
      ...filasExportacion.map((fila) =>
        fila.map(escaparCsv).join(",")
      ),
    ].join("\r\n");
    const blob = new Blob([`\uFEFF${contenido}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");

    enlace.href = url;
    enlace.download = crearNombreArchivo();
    enlace.click();
    URL.revokeObjectURL(url);
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
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
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
                    disabled={salidas.length === 0}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Download size={18} />
                    Excel CSV
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
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
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
              </div>
            )}
          </div>
        )}
      </section>
    </MainLayout>
  );
}
