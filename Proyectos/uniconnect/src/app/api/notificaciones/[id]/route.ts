import { createClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { respuestaErrorApi } from "@/lib/api/respuestas";

import { supabaseAdmin } from "@/lib/supabase/admin";

type UsuarioActivo = {
  id: string;
  estado: boolean;
};

type ContextoRuta = {
  params: Promise<{
    id: string;
  }>;
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

async function obtenerUsuarioActivo(request: Request) {
  const usuarioAutenticado =
    await obtenerUsuarioAutenticado(request);

  if (!usuarioAutenticado) {
    return null;
  }

  const { data: usuario } = await supabaseAdmin
    .from("usuarios")
    .select("id, estado")
    .eq("id", usuarioAutenticado.id)
    .eq("estado", true)
    .maybeSingle();

  return usuario as UsuarioActivo | null;
}

export async function PATCH(
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
    const notificacionId = Number(id);

    if (
      !Number.isInteger(notificacionId) ||
      notificacionId <= 0
    ) {
      return NextResponse.json(
        { error: "La notificacion no es valida." },
        { status: 400 }
      );
    }

    const { data: notificacion, error } = await supabaseAdmin
      .from("notificaciones")
      .update({
        leida: true,
        read_at: new Date().toISOString(),
      })
      .eq("id", notificacionId)
      .eq("usuario_id", usuario.id)
      .select(
        "id, usuario_id, titulo, mensaje, tipo, ruta, leida, entidad_tipo, entidad_id, created_at, read_at"
      )
      .maybeSingle();

    if (error) {
      return respuestaErrorApi("actualizar notificacion", error);
    }

    if (!notificacion) {
      return NextResponse.json(
        { error: "La notificacion no existe." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      mensaje: "Notificacion marcada como leida.",
      notificacion,
    });
  } catch (error) {
    console.error("Error al marcar la notificacion:", error);

    return NextResponse.json(
      { error: "Ocurrio un error interno." },
      { status: 500 }
    );
  }
}
