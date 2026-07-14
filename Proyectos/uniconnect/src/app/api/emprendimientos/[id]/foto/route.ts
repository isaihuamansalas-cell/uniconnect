import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";

type ContextoRuta = {
  params: Promise<{
    id: string;
  }>;
};

const bucketEmprendimientos = "emprendimientos";
const tiposPermitidos = [
  "image/jpeg",
  "image/png",
  "image/webp",
];
const tamanoMaximo = 5 * 1024 * 1024;
const rolesGestionEmprendimientos = [1, 3];

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

async function obtenerUsuarioActivo(request: Request) {
  const usuarioAutenticado =
    await obtenerUsuarioAutenticado(request);

  if (!usuarioAutenticado) {
    return null;
  }

  const { data: usuario } = await supabaseAdmin
    .from("usuarios")
    .select("id, rol_id, estado")
    .eq("id", usuarioAutenticado.id)
    .eq("estado", true)
    .maybeSingle();

  return usuario;
}

export async function GET(
  request: Request,
  contexto: ContextoRuta
) {
  try {
    const usuario = await obtenerUsuarioActivo(request);

    if (!usuario) {
      return NextResponse.json(
        { error: "La sesion no es valida o ha vencido." },
        { status: 401 }
      );
    }

    const { id } = await contexto.params;
    const emprendimientoId = Number(id);

    if (
      !Number.isInteger(emprendimientoId) ||
      emprendimientoId <= 0
    ) {
      return NextResponse.json(
        { error: "El emprendimiento no es valido." },
        { status: 400 }
      );
    }

    const { data: emprendimiento } = await supabaseAdmin
      .from("emprendimientos")
      .select("id, foto")
      .eq("id", emprendimientoId)
      .maybeSingle();

    if (!emprendimiento) {
      return NextResponse.json(
        { error: "El emprendimiento no existe." },
        { status: 404 }
      );
    }

    if (!emprendimiento.foto) {
      return NextResponse.json(
        { error: "El emprendimiento no tiene foto." },
        { status: 404 }
      );
    }

    const { data: firma, error: errorFirma } =
      await supabaseAdmin.storage
        .from(bucketEmprendimientos)
        .createSignedUrl(emprendimiento.foto, 60);

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
    console.error("Error al obtener foto de emprendimiento:", error);

    return NextResponse.json(
      { error: "Ocurrio un error interno." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  contexto: ContextoRuta
) {
  try {
    const usuario = await obtenerUsuarioActivo(request);

    if (!usuario) {
      return NextResponse.json(
        { error: "La sesion no es valida o ha vencido." },
        { status: 401 }
      );
    }

    if (
      !rolesGestionEmprendimientos.includes(Number(usuario.rol_id))
    ) {
      return NextResponse.json(
        {
          error:
            "Solo un administrador o profesor activo puede subir imagenes.",
        },
        { status: 403 }
      );
    }

    const { id } = await contexto.params;
    const emprendimientoId = Number(id);

    if (
      !Number.isInteger(emprendimientoId) ||
      emprendimientoId <= 0
    ) {
      return NextResponse.json(
        { error: "El emprendimiento no es valido." },
        { status: 400 }
      );
    }

    const { data: emprendimiento } = await supabaseAdmin
      .from("emprendimientos")
      .select("id, foto")
      .eq("id", emprendimientoId)
      .maybeSingle();

    if (!emprendimiento) {
      return NextResponse.json(
        { error: "El emprendimiento no existe." },
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
        { error: "La imagen debe ser JPG, PNG o WEBP." },
        { status: 400 }
      );
    }

    if (archivo.size > tamanoMaximo) {
      return NextResponse.json(
        { error: "La imagen no puede superar los 5 MB." },
        { status: 400 }
      );
    }

    const extension =
      archivo.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const rutaArchivo = `${emprendimientoId}/${crypto.randomUUID()}.${extension}`;
    const contenido = await archivo.arrayBuffer();

    const { error: errorSubida } =
      await supabaseAdmin.storage
        .from(bucketEmprendimientos)
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
        .from("emprendimientos")
        .update({
          foto: rutaArchivo,
          updated_at: new Date().toISOString(),
        })
        .eq("id", emprendimientoId);

    if (errorActualizacion) {
      await supabaseAdmin.storage
        .from(bucketEmprendimientos)
        .remove([rutaArchivo]);

      return NextResponse.json(
        {
          error:
            "La imagen subio, pero no pudo asociarse al emprendimiento.",
        },
        { status: 400 }
      );
    }

    if (emprendimiento.foto) {
      await supabaseAdmin.storage
        .from(bucketEmprendimientos)
        .remove([emprendimiento.foto]);
    }

    return NextResponse.json({
      mensaje: "Imagen actualizada correctamente.",
      ruta: rutaArchivo,
    });
  } catch (error) {
    console.error("Error al subir foto de emprendimiento:", error);

    return NextResponse.json(
      { error: "Ocurrio un error interno." },
      { status: 500 }
    );
  }
}
