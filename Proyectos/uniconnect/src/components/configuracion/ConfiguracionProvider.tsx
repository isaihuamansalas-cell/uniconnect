"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ConfiguracionInstitucional,
  configuracionPorDefecto,
  normalizarConfiguracion,
} from "@/lib/configuracion/defaults";

type RespuestaConfiguracion = {
  configuracion?: ConfiguracionInstitucional;
  error?: string;
};

type ConfiguracionContexto = {
  configuracion: ConfiguracionInstitucional;
  cargando: boolean;
  error: string;
  recargarConfiguracion: () => Promise<void>;
  actualizarConfiguracionLocal: (
    configuracion: ConfiguracionInstitucional
  ) => void;
};

const ConfiguracionContext =
  createContext<ConfiguracionContexto | null>(null);

type Props = {
  children: ReactNode;
};

export function ConfiguracionProvider({ children }: Props) {
  const [configuracion, setConfiguracion] =
    useState<ConfiguracionInstitucional>(configuracionPorDefecto);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const recargarConfiguracion = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const respuesta = await fetch("/api/configuracion", {
        cache: "no-store",
      });
      const resultado =
        (await respuesta.json()) as RespuestaConfiguracion;

      if (!respuesta.ok) {
        setError(resultado.error ?? "No se pudo cargar la configuracion.");
        setConfiguracion(configuracionPorDefecto);
        return;
      }

      setConfiguracion(
        normalizarConfiguracion(
          resultado.configuracion ?? configuracionPorDefecto
        )
      );
    } catch (errorInesperado) {
      console.error(errorInesperado);
      setError("No se pudo conectar con la configuracion.");
      setConfiguracion(configuracionPorDefecto);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    recargarConfiguracion();
  }, [recargarConfiguracion]);

  const actualizarConfiguracionLocal = useCallback(
    (configuracionActualizada: ConfiguracionInstitucional) => {
      setConfiguracion(normalizarConfiguracion(configuracionActualizada));
    },
    []
  );

  const valor = useMemo<ConfiguracionContexto>(
    () => ({
      configuracion,
      cargando,
      error,
      recargarConfiguracion,
      actualizarConfiguracionLocal,
    }),
    [
      actualizarConfiguracionLocal,
      cargando,
      configuracion,
      error,
      recargarConfiguracion,
    ]
  );

  return (
    <ConfiguracionContext.Provider value={valor}>
      {children}
    </ConfiguracionContext.Provider>
  );
}

export function useConfiguracion() {
  const contexto = useContext(ConfiguracionContext);

  if (!contexto) {
    throw new Error(
      "useConfiguracion debe usarse dentro de ConfiguracionProvider."
    );
  }

  return contexto;
}
