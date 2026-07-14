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
  CalendarClock,
  Car,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import MainLayout from "@/components/layout/MainLayout";
import { FormField, Input } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";

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

type RespuestaHistorial = {
  salidas?: Salida[];
  error?: string;
};

const formatoFechaHora = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatearFecha(registro: Salida) {
  const fecha = new Date(registro.created_at);

  if (!Number.isNaN(fecha.getTime())) {
    return formatoFechaHora.format(fecha);
  }

  if (registro.fecha && registro.hora) {
    return `${registro.fecha} ${registro.hora}`;
  }

  return registro.fecha ?? "Sin fecha";
}

export default function HistorialPage() {
  const router = useRouter();

  const [salidas, setSalidas] = useState<Salida[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargarHistorial = useCallback(async () => {
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
      const respuesta = await fetch("/api/garita/salidas", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const resultado =
        (await respuesta.json()) as RespuestaHistorial;

      if (!respuesta.ok) {
        setError(
          resultado.error ?? "No se pudo cargar el historial."
        );
        return;
      }

      setSalidas(resultado.salidas ?? []);
    } catch (errorInesperado) {
      console.error(errorInesperado);
      setError("No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }, [router]);

  useEffect(() => {
    cargarHistorial();
  }, [cargarHistorial]);

  const salidasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) {
      return salidas;
    }

    return salidas.filter((salida) => {
      const estudiante = salida.estudiante
        ? `${salida.estudiante.nombres} ${salida.estudiante.apellidos} ${salida.estudiante.dni} ${
            salida.estudiante.codigo_estudiante ?? ""
          }`
        : "";
      const garita = salida.garita
        ? `${salida.garita.nombres} ${salida.garita.apellidos}`
        : "";
      const vehiculo = salida.vehiculo
        ? `${salida.vehiculo.placa} ${salida.vehiculo.marca ?? ""} ${
            salida.vehiculo.modelo ?? ""
          } ${salida.vehiculo.color} ${salida.vehiculo.tipo}`
        : "";

      return `${estudiante} ${garita} ${vehiculo}`
        .toLowerCase()
        .includes(texto);
    });
  }, [busqueda, salidas]);

  function buscarEnHistorial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <MainLayout>
      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">
              Control de garita
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Historial de salidas
            </h1>

            <p className="mt-2 text-slate-600">
              Revisa las ultimas salidas autorizadas por garita.
            </p>
          </div>

          <button
            type="button"
            onClick={cargarHistorial}
            disabled={cargando}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cargando ? (
              <LoaderCircle size={20} className="animate-spin" />
            ) : (
              <RefreshCw size={20} />
            )}
            Actualizar
          </button>
        </div>

        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <form
            onSubmit={buscarEnHistorial}
            className="max-w-xl"
          >
            <FormField label="Buscar registro">
              <div className="relative">
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
                  placeholder="Placa, estudiante, DNI o responsable"
                  className="pl-11"
                />
              </div>
            </FormField>
          </form>

          {error && (
            <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
              {error}
            </p>
          )}

          {cargando ? (
            <div className="mt-8 flex items-center gap-3 text-slate-500">
              <LoaderCircle size={20} className="animate-spin" />
              Cargando historial...
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-sm text-slate-500">
                    <th className="px-4 py-3 font-medium">
                      Fecha
                    </th>
                    <th className="px-4 py-3 font-medium">
                      Estudiante
                    </th>
                    <th className="px-4 py-3 font-medium">
                      Vehiculo
                    </th>
                    <th className="px-4 py-3 font-medium">
                      Responsable
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {salidasFiltradas.map((salida) => (
                    <tr
                      key={salida.id}
                      className="border-b border-slate-100 transition hover:bg-slate-50"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                            <CalendarClock size={20} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {formatearFecha(salida)}
                            </p>
                            <p className="text-sm text-slate-500">
                              Registro #{salida.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <UserRound size={20} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {salida.estudiante
                                ? `${salida.estudiante.nombres} ${salida.estudiante.apellidos}`
                                : "Estudiante no disponible"}
                            </p>
                            <p className="text-sm text-slate-500">
                              DNI:{" "}
                              {salida.estudiante?.dni ??
                                "No registrado"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <Car size={20} />
                          </div>
                          <div>
                            <p className="font-semibold uppercase text-slate-900">
                              {salida.vehiculo?.placa ??
                                "Sin placa"}
                            </p>
                            <p className="text-sm text-slate-500">
                              {salida.vehiculo
                                ? `${salida.vehiculo.marca ?? "Sin marca"} ${
                                    salida.vehiculo.modelo ?? ""
                                  } - ${salida.vehiculo.color}`
                                : "Vehiculo no disponible"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <ShieldCheck size={20} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {salida.garita
                                ? `${salida.garita.nombres} ${salida.garita.apellidos}`
                                : "Responsable no disponible"}
                            </p>
                            <p className="text-sm text-slate-500">
                              Garita
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {salidasFiltradas.length === 0 && (
                <div className="py-12 text-center">
                  <CalendarClock
                    size={38}
                    className="mx-auto text-slate-300"
                  />
                  <p className="mt-3 text-slate-500">
                    No se encontraron salidas registradas.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </MainLayout>
  );
}
