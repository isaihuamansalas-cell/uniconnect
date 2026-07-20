import { createClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { respuestaErrorApi } from "@/lib/api/respuestas";

import {
  obtenerIp,
  obtenerUserAgent,
  registrarAuditoria,
} from "@/lib/auditoria/registrarAuditoria";
import { supabaseAdmin } from "@/lib/supabase/admin";

type PerfilFoto = {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  dni: string;
  codigo_estudiante: string | null;
  telefono: string | null;
  foto: string | null;
  rol_id: number;
  estado: boolean;
};

const bucketUsuarios = "usuarios";
const tiposPermitidos = [
  "image/jpeg",
  "image/png",
  "image/webp",
];
const extensionesPorTipo: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const tamanoMaximo = 2 * 1024 * 1024;

async function obtenerUsuarioAutenticado(
  request: Request
): Promise<User | null> {
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

async function obtenerPerfilActivo(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("usuarios")
    .select(
      "id, nombres, apellidos, correo, dni, codigo_estudiante, telefono, foto, rol_id, estado"
    )
    .eq("id", userId)
    .eq("estado", true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as PerfilFoto;
}

function crearPerfilRespuesta(perfil: PerfilFoto) {
  return {
    id: perfil.id,
    nombres: perfil.nombres,
    apellidos: perfil.apellidos,
    correo: perfil.correo,
    dni: perfil.dni,
    codigo_estudiante: perfil.codigo_estudiante,
    telefono: perfil.telefono,
    rol_id: perfil.rol_id,
    estado: perfil.estado,
    tiene_foto: Boolean(perfil.foto),
    foto_version: perfil.foto ? String(Date.now()) : "",
  };
}

export async function GET(request: Request) {
  try {
    const usuarioAutenticado =
      await obtenerUsuarioAutenticado(request);

    if (!usuarioAutenticado) {
      return NextResponse.json(
        { error: "La sesion no es valida o ha vencido." },
        { status: 401 }
      );
    }

    const perfil = await obtenerPerfilActivo(usuarioAutenticado.id);

    if (!perfil) {
      return NextResponse.json(
        { error: "Tu usuario no existe o esta inactivo." },
        { status: 403 }
      );
    }

    if (!perfil.foto) {
      return NextResponse.json(
        { error: "El perfil no tiene foto." },
        { status: 404 }
      );
    }

    const { data: firma, error: errorFirma } =
      await supabaseAdmin.storage
        .from(bucketUsuarios)
        .createSignedUrl(perfil.foto, 60);

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
    console.error("Error al obtener la foto del perfil:", error);

    return NextResponse.json(
      { error: "Ocurrio un error interno." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const usuarioAutenticado =
      await obtenerUsuarioAutenticado(request);

    if (!usuarioAutenticado) {
      return NextResponse.json(
        { error: "La sesion no es valida o ha vencido." },
        { status: 401 }
      );
    }

    const perfil = await obtenerPerfilActivo(usuarioAutenticado.id);

    if (!perfil) {
      return NextResponse.json(
        { error: "Tu usuario no existe o esta inactivo." },
        { status: 403 }
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
        { error: "La imagen no puede superar los 2 MB." },
        { status: 400 }
      );
    }

    const extension = extensionesPorTipo[archivo.type];
    const rutaArchivo =
      `${usuarioAutenticado.id}/${crypto.randomUUID()}.${extension}`;
    const contenido = await archivo.arrayBuffer();

    const { error: errorSubida } = await supabaseAdmin.storage
      .from(bucketUsuarios)
      .upload(rutaArchivo, contenido, {
        contentType: archivo.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (errorSubida) {
      return respuestaErrorApi("subir foto de perfil", errorSubida, "No se pudo guardar el registro.");
    }

    const { data: perfilActualizado, error: errorActualizacion } =
      await supabaseAdmin
        .from("usuarios")
        .update({
          foto: rutaArchivo,
        })
        .eq("id", usuarioAutenticado.id)
        .eq("estado", true)
        .select(
          "id, nombres, apellidos, correo, dni, codigo_estudiante, telefono, foto, rol_id, estado"
        )
        .single();

    if (errorActualizacion) {
      await supabaseAdmin.storage
        .from(bucketUsuarios)
        .remove([rutaArchivo]);

      return NextResponse.json(
        {
          error:
            "La imagen subio, pero no pudo asociarse al perfil.",
        },
        { status: 400 }
      );
    }

    if (perfil.foto) {
      await supabaseAdmin.storage
        .from(bucketUsuarios)
        .remove([perfil.foto]);
    }

    await registrarAuditoria({
      usuario_id: usuarioAutenticado.id,
      accion: "actualizar_foto",
      modulo: "perfil",
      entidad_tipo: "usuario",
      entidad_id: usuarioAutenticado.id,
      descripcion: "Actualizo su foto de perfil.",
      datos_anteriores: { tiene_foto: Boolean(perfil.foto) },
      datos_nuevos: { tiene_foto: true },
      ip: obtenerIp(request),
      user_agent: obtenerUserAgent(request),
    });

    return NextResponse.json({
      mensaje: "Foto actualizada correctamente.",
      perfil: crearPerfilRespuesta(
        perfilActualizado as PerfilFoto
      ),
    });
  } catch (error) {
    console.error("Error al subir la foto del perfil:", error);

    return NextResponse.json(
      { error: "Ocurrio un error interno." },
      { status: 500 }
    );
  }
}
