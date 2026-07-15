import { supabaseAdmin } from "@/lib/supabase/admin";

export type TipoNotificacion =
  | "aviso"
  | "salida"
  | "emprendimiento"
  | "administrativo"
  | "sistema";

export type NuevaNotificacion = {
  usuario_id: string;
  titulo: string;
  mensaje: string;
  tipo: TipoNotificacion;
  ruta?: string | null;
  entidad_tipo?: string | null;
  entidad_id?: string | null;
};

const tiposPermitidos: TipoNotificacion[] = [
  "aviso",
  "salida",
  "emprendimiento",
  "administrativo",
  "sistema",
];

function rutaInternaValida(ruta: string | null | undefined) {
  return !ruta || ruta.startsWith("/");
}

function normalizarNotificacion(
  notificacion: NuevaNotificacion
) {
  if (!tiposPermitidos.includes(notificacion.tipo)) {
    return null;
  }

  if (!rutaInternaValida(notificacion.ruta)) {
    return null;
  }

  return {
    usuario_id: notificacion.usuario_id,
    titulo: notificacion.titulo.trim(),
    mensaje: notificacion.mensaje.trim(),
    tipo: notificacion.tipo,
    ruta: notificacion.ruta ?? null,
    entidad_tipo: notificacion.entidad_tipo ?? null,
    entidad_id: notificacion.entidad_id ?? null,
  };
}

export async function crearNotificacion(
  notificacion: NuevaNotificacion
) {
  await crearNotificaciones([notificacion]);
}

export async function crearNotificaciones(
  notificaciones: NuevaNotificacion[]
) {
  try {
    const registros = notificaciones
      .map(normalizarNotificacion)
      .filter(
        (
          notificacion
        ): notificacion is NonNullable<
          ReturnType<typeof normalizarNotificacion>
        > => Boolean(notificacion)
      );

    if (registros.length === 0) {
      return;
    }

    const { error } = await supabaseAdmin
      .from("notificaciones")
      .insert(registros);

    if (error) {
      console.error(
        "No se pudieron crear notificaciones:",
        error.message
      );
    }
  } catch {
    console.error("Error inesperado al crear notificaciones.");
  }
}
