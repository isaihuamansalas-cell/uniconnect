import { supabaseAdmin } from "@/lib/supabase/admin";

export type AccionAuditoria =
  | "crear"
  | "editar"
  | "activar"
  | "desactivar"
  | "cambiar_rol"
  | "registrar"
  | "actualizar_configuracion"
  | "cambiar_logo"
  | "actualizar_telefono"
  | "actualizar_foto"
  | "cambiar_password";

export type ModuloAuditoria =
  | "usuarios"
  | "vehiculos"
  | "salidas"
  | "avisos"
  | "emprendimientos"
  | "configuracion"
  | "perfil";

export type DatosAuditoria =
  | string
  | number
  | boolean
  | null
  | DatosAuditoria[]
  | { [key: string]: DatosAuditoria };

export type RegistrarAuditoriaParams = {
  usuario_id: string;
  accion: AccionAuditoria;
  modulo: ModuloAuditoria;
  entidad_tipo: string;
  entidad_id?: string | null;
  descripcion: string;
  datos_anteriores?: DatosAuditoria;
  datos_nuevos?: DatosAuditoria;
  ip?: string | null;
  user_agent?: string | null;
};

const clavesSensibles = [
  "password",
  "contrasena",
  "contraseña",
  "token",
  "access_token",
  "refresh_token",
  "secret",
  "secret_key",
  "supabase_secret_key",
  "key",
  "signedurl",
  "signed_url",
  "archivo",
  "file",
  "buffer",
  "contenido",
];

export function sanitizarDatos(
  datos: DatosAuditoria | undefined
): DatosAuditoria | null {
  if (datos === undefined) {
    return null;
  }

  if (datos === null || typeof datos !== "object") {
    return datos;
  }

  if (Array.isArray(datos)) {
    return datos.map((item) => sanitizarDatos(item));
  }

  return Object.fromEntries(
    Object.entries(datos).map(([clave, valor]) => {
      const claveNormalizada = clave.toLowerCase();
      const esSensible = clavesSensibles.some((sensible) =>
        claveNormalizada.includes(sensible)
      );

      if (esSensible) {
        return [clave, "[REMOVIDO]"];
      }

      return [clave, sanitizarDatos(valor)];
    })
  );
}

export function obtenerIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  );
}

export function obtenerUserAgent(request: Request) {
  return request.headers.get("user-agent");
}

export async function registrarAuditoria({
  usuario_id,
  accion,
  modulo,
  entidad_tipo,
  entidad_id = null,
  descripcion,
  datos_anteriores,
  datos_nuevos,
  ip = null,
  user_agent = null,
}: RegistrarAuditoriaParams) {
  try {
    const { error } = await supabaseAdmin
      .from("auditoria")
      .insert({
        usuario_id,
        accion,
        modulo,
        entidad_tipo,
        entidad_id,
        descripcion,
        datos_anteriores: sanitizarDatos(datos_anteriores),
        datos_nuevos: sanitizarDatos(datos_nuevos),
        ip,
        user_agent,
      });

    if (error) {
      console.error("No se pudo registrar auditoria:", error.message);
    }
  } catch {
    console.error("Error inesperado al registrar auditoria.");
  }
}
