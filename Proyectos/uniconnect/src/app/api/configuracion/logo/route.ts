import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import {
  ConfiguracionInstitucional,
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

const bucketInstitucion = "institucion";
const maximoBytes = 2 * 1024 * 1024;
const tiposPermitidos = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
];
const extensionesPorTipo: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
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

function obtenerUrlPublica(path: string) {
  const { data } = supabaseAdmin.storage
    .from(bucketInstitucion)
    .getPublicUrl(path);

  return data.publicUrl;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");

  if (!path) {
    return NextResponse.json(
      { error: "No se recibio la ruta del logo." },
      { status: 400 }
    );
  }

  return NextResponse.redirect(obtenerUrlPublica(path));
}

export async function POST(request: Request) {
  try {
    const administrador = await obtenerAdministradorActivo(request);

    if (!administrador) {
      return NextResponse.json(
        { error: "Solo un administrador activo puede subir el logo." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const archivo = formData.get("logo");

    if (!(archivo instanceof File)) {
      return NextResponse.json(
        { error: "Selecciona una imagen valida." },
        { status: 400 }
      );
    }

    if (!tiposPermitidos.includes(archivo.type)) {
      return NextResponse.json(
        {
          error:
            "El logo debe ser JPG, PNG, WEBP o SVG.",
        },
        { status: 400 }
      );
    }

    if (archivo.size > maximoBytes) {
      return NextResponse.json(
        { error: "El logo no debe superar los 2 MB." },
        { status: 400 }
      );
    }

    const extension = extensionesPorTipo[archivo.type];
    const path = `logos/logo-${Date.now()}.${extension}`;
    const buffer = await archivo.arrayBuffer();

    const { data: configuracionAnterior } = await supabaseAdmin
      .from("configuracion")
      .select(
        "id, nombre_sistema, nombre_institucion, correo_institucional, telefono, direccion, logo_path, color_principal, color_secundario, updated_at, updated_by"
      )
      .eq("id", 1)
      .maybeSingle();

    const { error: errorSubida } = await supabaseAdmin.storage
      .from(bucketInstitucion)
      .upload(path, buffer, {
        contentType: archivo.type,
        upsert: true,
        cacheControl: "3600",
      });

    if (errorSubida) {
      return NextResponse.json(
        {
          error: `No se pudo subir el logo: ${errorSubida.message}`,
        },
        { status: 400 }
      );
    }

    const { data, error: errorActualizacion } = await supabaseAdmin
      .from("configuracion")
      .update({
        logo_path: path,
        updated_at: new Date().toISOString(),
        updated_by: administrador.id,
      })
      .eq("id", 1)
      .select(
        "id, nombre_sistema, nombre_institucion, correo_institucional, telefono, direccion, logo_path, color_principal, color_secundario, updated_at, updated_by"
      )
      .single();

    if (errorActualizacion) {
      return NextResponse.json(
        {
          error: `No se pudo guardar el logo: ${errorActualizacion.message}`,
        },
        { status: 400 }
      );
    }

    await registrarAuditoria({
      usuario_id: administrador.id,
      accion: "cambiar_logo",
      modulo: "configuracion",
      entidad_tipo: "configuracion",
      entidad_id: "1",
      descripcion: "Cambio el logo institucional.",
      datos_anteriores: configuracionAnterior
        ? {
            tenia_logo: Boolean(
              (configuracionAnterior as ConfiguracionInstitucional)
                .logo_path
            ),
          }
        : null,
      datos_nuevos: { logo_actualizado: true },
      ip: obtenerIp(request),
      user_agent: obtenerUserAgent(request),
    });

    return NextResponse.json({
      mensaje: "Logo actualizado correctamente.",
      logoUrl: obtenerUrlPublica(path),
      configuracion: normalizarConfiguracion(
        data as ConfiguracionInstitucional
      ),
    });
  } catch (error) {
    console.error("Error al subir logo institucional:", error);

    return NextResponse.json(
      { error: "Ocurrio un error interno." },
      { status: 500 }
    );
  }
}
