import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import {
  ConfiguracionInstitucional,
  configuracionPorDefecto,
  normalizarConfiguracion,
} from "@/lib/configuracion/defaults";
import {
  obtenerIp,
  obtenerUserAgent,
  registrarAuditoria,
} from "@/lib/auditoria/registrarAuditoria";
import { supabaseAdmin } from "@/lib/supabase/admin";

type UsuarioActivo = {
  id: string;
  rol_id: number;
  estado: boolean;
};

type DatosConfiguracion = {
  nombre_sistema?: string;
  nombre_institucion?: string;
  correo_institucional?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  color_principal?: string;
  color_secundario?: string;
};

async function obtenerUsuarioAutenticado(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const accessToken = authorization.replace("Bearer ", "").trim();

  const supabasePublico = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabasePublico.auth.getUser(accessToken);

  if (error || !user) {
    return null;
  }

  return user;
}

async function obtenerAdministradorActivo(request: Request) {
  const usuarioAutenticado =
    await obtenerUsuarioAutenticado(request);

  if (!usuarioAutenticado) {
    return null;
  }

  const { data: usuario } = await supabaseAdmin
    .from("usuarios")
    .select("id, rol_id, estado")
    .eq("id", usuarioAutenticado.id)
    .eq("rol_id", 1)
    .eq("estado", true)
    .maybeSingle();

  return usuario as UsuarioActivo | null;
}

function validarColor(color: string | undefined, nombre: string) {
  if (!color || !/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return `${nombre} debe tener formato hexadecimal #RRGGBB.`;
  }

  return "";
}

function validarDatos(body: DatosConfiguracion):
  | { datos: DatosConfiguracion }
  | { error: string } {
  const nombreSistema = body.nombre_sistema?.trim();
  const nombreInstitucion = body.nombre_institucion?.trim();
  const correoInstitucional =
    body.correo_institucional?.trim().toLowerCase() || null;
  const telefono = body.telefono?.trim() || null;
  const direccion = body.direccion?.trim() || null;
  const colorPrincipal = body.color_principal?.trim();
  const colorSecundario = body.color_secundario?.trim();

  if (!nombreSistema || nombreSistema.length < 3) {
    return {
      error: "El nombre del sistema debe tener al menos 3 caracteres.",
    };
  }

  if (!nombreInstitucion || nombreInstitucion.length < 3) {
    return {
      error:
        "El nombre de la institucion debe tener al menos 3 caracteres.",
    };
  }

  if (
    correoInstitucional &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoInstitucional)
  ) {
    return { error: "Ingresa un correo institucional valido." };
  }

  const errorColorPrincipal = validarColor(
    colorPrincipal,
    "El color principal"
  );

  if (errorColorPrincipal) {
    return { error: errorColorPrincipal };
  }

  const errorColorSecundario = validarColor(
    colorSecundario,
    "El color secundario"
  );

  if (errorColorSecundario) {
    return { error: errorColorSecundario };
  }

  return {
    datos: {
      nombre_sistema: nombreSistema,
      nombre_institucion: nombreInstitucion,
      correo_institucional: correoInstitucional,
      telefono,
      direccion,
      color_principal: colorPrincipal,
      color_secundario: colorSecundario,
    },
  };
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("configuracion")
      .select(
        "id, nombre_sistema, nombre_institucion, correo_institucional, telefono, direccion, logo_path, color_principal, color_secundario, updated_at, updated_by"
      )
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({
        configuracion: configuracionPorDefecto,
      });
    }

    return NextResponse.json({
      configuracion: normalizarConfiguracion(
        data as ConfiguracionInstitucional
      ),
    });
  } catch (error) {
    console.error("Error al cargar configuracion:", error);

    return NextResponse.json({
      configuracion: configuracionPorDefecto,
    });
  }
}

export async function PATCH(request: Request) {
  try {
    const administrador = await obtenerAdministradorActivo(request);

    if (!administrador) {
      return NextResponse.json(
        { error: "Solo un administrador activo puede editar la configuracion." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as DatosConfiguracion;
    const validacion = validarDatos(body);

    if ("error" in validacion) {
      return NextResponse.json(
        { error: validacion.error },
        { status: 400 }
      );
    }

    const { data: configuracionAnterior } = await supabaseAdmin
      .from("configuracion")
      .select(
        "id, nombre_sistema, nombre_institucion, correo_institucional, telefono, direccion, logo_path, color_principal, color_secundario, updated_at, updated_by"
      )
      .eq("id", 1)
      .maybeSingle();

    const { data, error } = await supabaseAdmin
      .from("configuracion")
      .update({
        ...validacion.datos,
        updated_at: new Date().toISOString(),
        updated_by: administrador.id,
      })
      .eq("id", 1)
      .select(
        "id, nombre_sistema, nombre_institucion, correo_institucional, telefono, direccion, logo_path, color_principal, color_secundario, updated_at, updated_by"
      )
      .single();

    if (error) {
      return NextResponse.json(
        {
          error: `No se pudo actualizar la configuracion: ${error.message}`,
        },
        { status: 400 }
      );
    }

    await registrarAuditoria({
      usuario_id: administrador.id,
      accion: "actualizar_configuracion",
      modulo: "configuracion",
      entidad_tipo: "configuracion",
      entidad_id: "1",
      descripcion: "Actualizo la configuracion institucional.",
      datos_anteriores: configuracionAnterior
        ? (configuracionAnterior as ConfiguracionInstitucional)
        : null,
      datos_nuevos: data as ConfiguracionInstitucional,
      ip: obtenerIp(request),
      user_agent: obtenerUserAgent(request),
    });

    return NextResponse.json({
      mensaje: "Configuracion actualizada correctamente.",
      configuracion: normalizarConfiguracion(
        data as ConfiguracionInstitucional
      ),
    });
  } catch (error) {
    console.error("Error al actualizar configuracion:", error);

    return NextResponse.json(
      { error: "Ocurrio un error interno." },
      { status: 500 }
    );
  }
}
