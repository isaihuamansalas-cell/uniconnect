export type ConfiguracionInstitucional = {
  id: number;
  nombre_sistema: string;
  nombre_institucion: string;
  correo_institucional: string | null;
  telefono: string | null;
  direccion: string | null;
  logo_path: string | null;
  color_principal: string;
  color_secundario: string;
  updated_at: string;
  updated_by: string | null;
};

export const configuracionPorDefecto: ConfiguracionInstitucional = {
  id: 1,
  nombre_sistema: "UniConnect",
  nombre_institucion: "Instituto Superior Tecnologico Suiza",
  correo_institucional: "correo@suiza.edu.pe",
  telefono: null,
  direccion: null,
  logo_path: null,
  color_principal: "#047857",
  color_secundario: "#0f172a",
  updated_at: new Date(0).toISOString(),
  updated_by: null,
};

export function normalizarConfiguracion(
  configuracion: Partial<ConfiguracionInstitucional> | null
): ConfiguracionInstitucional {
  return {
    ...configuracionPorDefecto,
    ...configuracion,
    id: 1,
    nombre_sistema:
      configuracion?.nombre_sistema?.trim() ||
      configuracionPorDefecto.nombre_sistema,
    nombre_institucion:
      configuracion?.nombre_institucion?.trim() ||
      configuracionPorDefecto.nombre_institucion,
    color_principal:
      configuracion?.color_principal?.trim() ||
      configuracionPorDefecto.color_principal,
    color_secundario:
      configuracion?.color_secundario?.trim() ||
      configuracionPorDefecto.color_secundario,
  };
}

export function obtenerUrlLogo(logoPath: string | null) {
  if (!logoPath) {
    return null;
  }

  if (
    logoPath.startsWith("http://") ||
    logoPath.startsWith("https://") ||
    logoPath.startsWith("/")
  ) {
    return logoPath;
  }

  return `/api/configuracion/logo?path=${encodeURIComponent(logoPath)}`;
}
