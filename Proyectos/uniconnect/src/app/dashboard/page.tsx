"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  Car,
  FileText,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";

import { usePerfil } from "@/components/auth/PerfilProvider";
import ActividadReciente from "@/components/dashboard/ActividadReciente";
import GraficoBarras from "@/components/dashboard/GraficoBarras";
import GraficoDistribucion from "@/components/dashboard/GraficoDistribucion";
import MainLayout from "@/components/layout/MainLayout";
import { StatCard } from "@/components/ui";

type EstadisticaDashboard = {
  id: string;
  titulo: string;
  valor: number;
};

type PuntoGrafico = {
  etiqueta: string;
  valor: number;
};

type Actividad = {
  id: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  tipo: string;
  ruta: string;
};

type RespuestaDashboard = {
  rol_id: number;
  estadisticas: EstadisticaDashboard[];
  graficos: {
    salidasUltimos7Dias?: PuntoGrafico[];
    vehiculosPorTipo?: PuntoGrafico[];
    usuariosPorRol?: PuntoGrafico[];
    avisosEmprendimientos?: PuntoGrafico[];
  };
  actividad: {
    salidas?: Actividad[];
    avisos?: Actividad[];
    emprendimientos?: Actividad[];
    auditoria?: Actividad[];
  };
  errores: string[];
  error?: string;
};

const nombresRoles: Record<number, string> = {
  1: "Administrador",
  2: "Director",
  3: "Profesor",
  4: "Garita",
  5: "Estudiante",
};

export default function DashboardPage() {
  const { perfil, session, cargandoPerfil, errorPerfil } =
    usePerfil();
  const [datos, setDatos] = useState<RespuestaDashboard | null>(
    null
  );
  const [cargandoDashboard, setCargandoDashboard] = useState(false);
  const [errorDashboard, setErrorDashboard] = useState("");

  const cargarDashboard = useCallback(async () => {
    if (!session?.access_token) {
      return;
    }

    setCargandoDashboard(true);
    setErrorDashboard("");

    try {
      const respuesta = await fetch("/api/dashboard", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });
      const resultado =
        (await respuesta.json()) as RespuestaDashboard;

      if (!respuesta.ok) {
        setErrorDashboard(
          resultado.error ?? "No se pudo cargar el dashboard."
        );
        setDatos(null);
        return;
      }

      setDatos(resultado);
    } catch (errorInesperado) {
      console.error(errorInesperado);
      setErrorDashboard("No se pudo conectar con el servidor.");
    } finally {
      setCargandoDashboard(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (!cargandoPerfil && session?.access_token) {
      void cargarDashboard();
    }
  }, [cargandoPerfil, cargarDashboard, session?.access_token]);

  const estadisticas = datos?.estadisticas ?? [];
  const puedeVerGraficos = useMemo(
    () =>
      Boolean(
        datos?.graficos.salidasUltimos7Dias ||
          datos?.graficos.vehiculosPorTipo ||
          datos?.graficos.usuariosPorRol ||
          datos?.graficos.avisosEmprendimientos
      ),
    [datos]
  );

  if (cargandoPerfil) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4 dark:bg-slate-950">
        <p className="font-medium text-slate-600 dark:text-slate-300">
          Cargando tu perfil...
        </p>
      </main>
    );
  }

  return (
    <MainLayout>
      <section className="w-full min-w-0 max-w-full overflow-hidden space-y-8">
        <div className="flex min-w-0 max-w-full flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              {perfil ? nombresRoles[perfil.rol_id] : ""}
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100 sm:text-4xl">
              Bienvenido, {perfil?.nombres}
            </h1>

            <p className="mt-2 break-words text-slate-600 dark:text-slate-300">
              Panel principal de UniConnect
            </p>
          </div>

          <button
            type="button"
            onClick={() => void cargarDashboard()}
            disabled={cargandoDashboard}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:w-auto"
          >
            {cargandoDashboard ? (
              <LoaderCircle size={20} className="animate-spin" />
            ) : (
              <RefreshCw size={20} />
            )}
            Reintentar
          </button>
        </div>

        {errorPerfil && (
          <p className="rounded-lg bg-red-50 p-3 text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {errorPerfil}
          </p>
        )}

        {errorDashboard && (
          <p className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {errorDashboard}
          </p>
        )}

        {datos?.errores && datos.errores.length > 0 && (
          <div className="rounded-2xl bg-amber-50 p-4 text-sm font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            Algunos datos no pudieron cargarse:
            <ul className="mt-2 list-inside list-disc">
              {datos.errores.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {cargandoDashboard && !datos ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm dark:border dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
              <LoaderCircle size={20} className="animate-spin" />
              Cargando estadisticas...
            </div>
          </div>
        ) : (
          <>
            <div className="grid w-full min-w-0 max-w-full gap-4 sm:gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              {estadisticas.map((estadistica) => (
                <StatCard
                  key={estadistica.id}
                  title={estadistica.titulo}
                  value={String(estadistica.valor)}
                  icon={obtenerIcono(estadistica.id)}
                />
              ))}
            </div>

            {puedeVerGraficos && (
              <div className="grid w-full min-w-0 max-w-full gap-4 sm:gap-6 xl:grid-cols-2">
                {datos?.graficos.salidasUltimos7Dias && (
                  <GraficoBarras
                    titulo="Salidas ultimos 7 dias"
                    descripcion="Cantidad de salidas registradas por dia."
                    datos={datos.graficos.salidasUltimos7Dias}
                  />
                )}

                {datos?.graficos.vehiculosPorTipo && (
                  <GraficoDistribucion
                    titulo="Vehiculos por tipo"
                    descripcion="Distribucion de vehiculos activos."
                    datos={datos.graficos.vehiculosPorTipo}
                  />
                )}

                {datos?.graficos.usuariosPorRol && (
                  <GraficoDistribucion
                    titulo="Usuarios activos por rol"
                    descripcion="Usuarios activos agrupados por rol."
                    datos={datos.graficos.usuariosPorRol}
                  />
                )}

                {datos?.graficos.avisosEmprendimientos && (
                  <GraficoDistribucion
                    titulo="Avisos y emprendimientos"
                    descripcion="Comparacion de registros activos."
                    datos={datos.graficos.avisosEmprendimientos}
                  />
                )}
              </div>
            )}

            <div className="grid w-full min-w-0 max-w-full gap-4 sm:gap-6 xl:grid-cols-2">
              {datos?.actividad.salidas && (
                <ActividadReciente
                  titulo="Ultimas salidas"
                  actividades={datos.actividad.salidas}
                />
              )}

              {datos?.actividad.avisos && (
                <ActividadReciente
                  titulo="Ultimos avisos"
                  actividades={datos.actividad.avisos}
                />
              )}

              {datos?.actividad.emprendimientos && (
                <ActividadReciente
                  titulo="Ultimos emprendimientos"
                  actividades={datos.actividad.emprendimientos}
                />
              )}

              {datos?.actividad.auditoria && (
                <ActividadReciente
                  titulo="Auditoria reciente"
                  actividades={datos.actividad.auditoria}
                />
              )}
            </div>
          </>
        )}
      </section>
    </MainLayout>
  );
}

function obtenerIcono(id: string) {
  if (id === "usuarios") {
    return <Users size={38} />;
  }

  if (id === "vehiculos") {
    return <Car size={38} />;
  }

  if (id === "salidas") {
    return <ShieldCheck size={38} />;
  }

  if (id === "avisos" || id === "notificaciones") {
    return <Bell size={38} />;
  }

  if (id === "emprendimientos") {
    return <Store size={38} />;
  }

  return <FileText size={38} />;
}
