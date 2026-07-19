import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import {
  obtenerIp,
  obtenerUserAgent,
  registrarAuditoria,
} from "@/lib/auditoria/registrarAuditoria";
import { supabaseAdmin } from "@/lib/supabase/admin";

type ContextoRuta = {
  params: Promise<{
    id: string;
  }>;
};

const tiposPermitidos = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const tamanoMaximo = 5 * 1024 * 1024;

async function obtenerUsuarioAutenticado(request: Request) {
  const authorization =
    request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const accessToken = authorization
    .replace("Bearer ", "")
    .trim();

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

export async function GET(
  request: Request,
  contexto: ContextoRuta
) {
  try {
    const usuarioAutenticado =
      await obtenerUsuarioAutenticado(request);

    if (!usuarioAutenticado) {
      return NextResponse.json(
        { error: "No has iniciado sesiÃ³n." },
        { status: 401 }
      );
    }

    const { data: usuarioActivo } = await supabaseAdmin
      .from("usuarios")
      .select("id")
      .eq("id", usuarioAutenticado.id)
      .in("rol_id", [1, 3, 4])
      .eq("estado", true)
      .maybeSingle();

    if (!usuarioActivo) {
      return NextResponse.json(
        { error: "La sesiÃ³n no es vÃ¡lida." },
        { status: 403 }
      );
    }

    const { id } = await contexto.params;
    const vehiculoId = Number(id);

    if (!Number.isInteger(vehiculoId) || vehiculoId <= 0) {
      return NextResponse.json(
        { error: "El vehÃ­culo no es vÃ¡lido." },
        { status: 400 }
      );
    }

    const { data: vehiculo } = await supabaseAdmin
      .from("vehiculos")
      .select("id, foto")
      .eq("id", vehiculoId)
      .maybeSingle();

    if (!vehiculo) {
      return NextResponse.json(
        { error: "El vehÃ­culo no existe." },
        { status: 404 }
      );
    }

    if (!vehiculo.foto) {
      return NextResponse.json(
        { error: "El vehÃ­culo no tiene foto." },
        { status: 404 }
      );
    }

    const { data: firma, error: errorFirma } =
      await supabaseAdmin.storage
        .from("vehiculos")
        .createSignedUrl(vehiculo.foto, 60);

    if (errorFirma || !firma?.signedUrl) {
      return NextResponse.json(
        { error: "No se pudo preparar la imagen." },
        { status: 400 }
      );
    }

    const respuestaImagen = await fetch(firma.signedUrl);

    if (!respuestaImagen.ok) {
      return NextResponse.json(
        { error: "No se pudo leer la imagen." },
        { status: 400 }
      );
    }

    return new Response(respuestaImagen.body, {
      status: 200,
      headers: {
        "Content-Type":
          respuestaImagen.headers.get("Content-Type") ??
          "application/octet-stream",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(
      "Error al obtener la foto del vehÃ­culo:",
      error
    );

    return NextResponse.json(
      { error: "OcurriÃ³ un error interno." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  contexto: ContextoRuta
) {
  try {
    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "No has iniciado sesión." },
        { status: 401 }
      );
    }

    const accessToken = authorization
      .replace("Bearer ", "")
      .trim();

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
      error: errorAutenticacion,
    } = await supabasePublico.auth.getUser(accessToken);

    if (errorAutenticacion || !user) {
      return NextResponse.json(
        { error: "La sesión no es válida o ha vencido." },
        { status: 401 }
      );
    }

    const { data: responsable } = await supabaseAdmin
      .from("usuarios")
      .select("id")
      .eq("id", user.id)
      .in("rol_id", [1, 3])
      .eq("estado", true)
      .maybeSingle();

    if (!responsable) {
      return NextResponse.json(
        {
          error:
            "Solo un administrador o profesor puede subir fotos.",
        },
        { status: 403 }
      );
    }

    const { id } = await contexto.params;
    const vehiculoId = Number(id);

    if (!Number.isInteger(vehiculoId) || vehiculoId <= 0) {
      return NextResponse.json(
        { error: "El vehículo no es válido." },
        { status: 400 }
      );
    }

    const { data: vehiculo } = await supabaseAdmin
      .from("vehiculos")
      .select("id, foto")
      .eq("id", vehiculoId)
      .maybeSingle();

    if (!vehiculo) {
      return NextResponse.json(
        { error: "El vehículo no existe." },
        { status: 404 }
      );
    }

    const formulario = await request.formData();
    const archivo = formulario.get("foto");

    if (!(archivo instanceof File)) {
      return NextResponse.json(
        { error: "Selecciona una imagen." },
        { status: 400 }
      );
    }

    if (!tiposPermitidos.includes(archivo.type)) {
      return NextResponse.json(
        {
          error: "La imagen debe ser JPG, PNG o WEBP.",
        },
        { status: 400 }
      );
    }

    if (archivo.size > tamanoMaximo) {
      return NextResponse.json(
        {
          error: "La imagen no puede superar los 5 MB.",
        },
        { status: 400 }
      );
    }

    const extension =
      archivo.name.split(".").pop()?.toLowerCase() ?? "jpg";

    const rutaArchivo =
      `${vehiculoId}/${crypto.randomUUID()}.${extension}`;

    const contenido = await archivo.arrayBuffer();

    const { error: errorSubida } =
      await supabaseAdmin.storage
        .from("vehiculos")
        .upload(rutaArchivo, contenido, {
          contentType: archivo.type,
          cacheControl: "3600",
          upsert: false,
        });

    if (errorSubida) {
      return NextResponse.json(
        {
          error: `No se pudo subir la imagen: ${errorSubida.message}`,
        },
        { status: 400 }
      );
    }

    const { error: errorActualizacion } =
      await supabaseAdmin
        .from("vehiculos")
        .update({
          foto: rutaArchivo,
        })
        .eq("id", vehiculoId);

    if (errorActualizacion) {
      await supabaseAdmin.storage
        .from("vehiculos")
        .remove([rutaArchivo]);

      return NextResponse.json(
        {
          error:
            "La imagen subió, pero no pudo asociarse al vehículo.",
        },
        { status: 400 }
      );
    }

    if (vehiculo.foto) {
      await supabaseAdmin.storage
        .from("vehiculos")
        .remove([vehiculo.foto]);
    }

    await registrarAuditoria({
      usuario_id: responsable.id,
      accion: "actualizar_foto",
      modulo: "vehiculos",
      entidad_tipo: "vehiculo",
      entidad_id: String(vehiculoId),
      descripcion: "Actualizo la foto de un vehiculo.",
      datos_anteriores: { tiene_foto: Boolean(vehiculo.foto) },
      datos_nuevos: { tiene_foto: true },
      ip: obtenerIp(request),
      user_agent: obtenerUserAgent(request),
    });

    return NextResponse.json({
      mensaje: "Foto actualizada correctamente.",
      ruta: rutaArchivo,
    });
  } catch (error) {
    console.error(
      "Error al subir la foto del vehículo:",
      error
    );

    return NextResponse.json(
      { error: "Ocurrió un error interno." },
      { status: 500 }
    );
  }
}
