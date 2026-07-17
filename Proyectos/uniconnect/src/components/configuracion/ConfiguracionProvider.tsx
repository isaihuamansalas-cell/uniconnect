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

const formatoHexadecimal = /^#[0-9A-Fa-f]{6}$/;

function normalizarColorHexadecimal(
  color: string,
  colorPorDefecto: string
) {
  const colorNormalizado = color.trim();

  if (!formatoHexadecimal.test(colorNormalizado)) {
    return colorPorDefecto;
  }

  return colorNormalizado;
}

function obtenerConfiguracionConColoresValidos(
  configuracion: ConfiguracionInstitucional
): ConfiguracionInstitucional {
  return {
    ...configuracion,
    color_principal: normalizarColorHexadecimal(
      configuracion.color_principal,
      configuracionPorDefecto.color_principal
    ),
    color_secundario: normalizarColorHexadecimal(
      configuracion.color_secundario,
      configuracionPorDefecto.color_secundario
    ),
  };
}

function aplicarVariablesDeColor(
  configuracion: ConfiguracionInstitucional
) {
  document.documentElement.style.setProperty(
    "--color-primary",
    configuracion.color_principal
  );
  document.documentElement.style.setProperty(
    "--color-secondary",
    configuracion.color_secundario
  );
}

export function ConfiguracionProvider({ children }: Props) {
  const [configuracion, setConfiguracion] =
    useState<ConfiguracionInstitucional>(() =>
      obtenerConfiguracionConColoresValidos(configuracionPorDefecto)
    );
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
        const configuracionSegura =
          obtenerConfiguracionConColoresValidos(configuracionPorDefecto);
        aplicarVariablesDeColor(configuracionSegura);
        setConfiguracion(configuracionSegura);
        return;
      }

      const configuracionNormalizada = obtenerConfiguracionConColoresValidos(
        normalizarConfiguracion(
          resultado.configuracion ?? configuracionPorDefecto
        )
      );
      aplicarVariablesDeColor(configuracionNormalizada);
      setConfiguracion(configuracionNormalizada);
    } catch (errorInesperado) {
      console.error(errorInesperado);
      setError("No se pudo conectar con la configuracion.");
      const configuracionSegura =
        obtenerConfiguracionConColoresValidos(configuracionPorDefecto);
      aplicarVariablesDeColor(configuracionSegura);
      setConfiguracion(configuracionSegura);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    recargarConfiguracion();
  }, [recargarConfiguracion]);

  useEffect(() => {
    aplicarVariablesDeColor(configuracion);
  }, [configuracion]);

  const actualizarConfiguracionLocal = useCallback(
    (configuracionActualizada: ConfiguracionInstitucional) => {
      const configuracionNormalizada = obtenerConfiguracionConColoresValidos(
        normalizarConfiguracion(configuracionActualizada)
      );
      aplicarVariablesDeColor(configuracionNormalizada);
      setConfiguracion(configuracionNormalizada);
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
