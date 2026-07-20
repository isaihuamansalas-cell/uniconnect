import { createClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { respuestaErrorApi } from "@/lib/api/respuestas";

import {
  obtenerIp,
  obtenerUserAgent,
  registrarAuditoria,
} from "@/lib/auditoria/registrarAuditoria";
import { supabaseAdmin } from "@/lib/supabase/admin";

type PerfilRegistro = {
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

type PerfilRespuesta = Omit<PerfilRegistro, "foto"> & {
  tiene_foto: boolean;
  foto_version: string;
};

type ActualizacionPerfil = {
  telefono?: string | null;
};

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

function crearPerfilRespuesta(
  perfil: PerfilRegistro
): PerfilRespuesta {
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

  return data as PerfilRegistro;
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

    return NextResponse.json({
      perfil: crearPerfilRespuesta(perfil),
    });
  } catch (error) {
    console.error("Error al consultar el perfil:", error);

    return NextResponse.json(
      { error: "Ocurrio un error interno." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const usuarioAutenticado =
      await obtenerUsuarioAutenticado(request);

    if (!usuarioAutenticado) {
      return NextResponse.json(
        { error: "La sesion no es valida o ha vencido." },
        { status: 401 }
      );
    }

    const perfilActual = await obtenerPerfilActivo(
      usuarioAutenticado.id
    );

    if (!perfilActual) {
      return NextResponse.json(
        { error: "Tu usuario no existe o esta inactivo." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as ActualizacionPerfil;
    const telefono = body.telefono?.trim() || null;

    if (telefono && !/^\d{6,15}$/.test(telefono)) {
      return NextResponse.json(
        {
          error:
            "El telefono debe contener solo numeros y tener entre 6 y 15 digitos.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("usuarios")
      .update({
        telefono,
      })
      .eq("id", usuarioAutenticado.id)
      .eq("estado", true)
      .select(
        "id, nombres, apellidos, correo, dni, codigo_estudiante, telefono, foto, rol_id, estado"
      )
      .single();

    if (error) {
      return respuestaErrorApi("actualizar perfil", error, "No se pudo guardar el registro.");
    }

    if (perfilActual.telefono !== telefono) {
      await registrarAuditoria({
        usuario_id: usuarioAutenticado.id,
        accion: "actualizar_telefono",
        modulo: "perfil",
        entidad_tipo: "usuario",
        entidad_id: usuarioAutenticado.id,
        descripcion: "Actualizo su telefono de perfil.",
        datos_anteriores: { telefono: perfilActual.telefono },
        datos_nuevos: { telefono },
        ip: obtenerIp(request),
        user_agent: obtenerUserAgent(request),
      });
    }

    return NextResponse.json({
      mensaje: "Perfil actualizado correctamente.",
      perfil: crearPerfilRespuesta(data as PerfilRegistro),
    });
  } catch (error) {
    console.error("Error al actualizar el perfil:", error);

    return NextResponse.json(
      { error: "Ocurrio un error interno." },
      { status: 500 }
    );
  }
}
