import { createClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";

type UsuarioActivo = {
  id: string;
  estado: boolean;
};

type Notificacion = {
  id: number;
  usuario_id: string;
  titulo: string;
  mensaje: string;
  tipo: string;
  ruta: string | null;
  leida: boolean;
  entidad_tipo: string | null;
  entidad_id: string | null;
  created_at: string;
  read_at: string | null;
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

export async function GET(request: Request) {
  try {
    const usuario = await obtenerUsuarioActivo(request);

    if (!usuario) {
      return NextResponse.json(
        { error: "La sesion no es valida o ha vencido." },
        { status: 401 }
      );
    }

    const { data: notificaciones, error } = await supabaseAdmin
      .from("notificaciones")
      .select(
        "id, usuario_id, titulo, mensaje, tipo, ruta, leida, entidad_tipo, entidad_id, created_at, read_at"
      )
      .eq("usuario_id", usuario.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      return NextResponse.json(
        {
          error: `No se pudieron cargar las notificaciones: ${error.message}`,
        },
        { status: 400 }
      );
    }

    const { count, error: errorConteo } = await supabaseAdmin
      .from("notificaciones")
      .select("id", { count: "exact", head: true })
      .eq("usuario_id", usuario.id)
      .eq("leida", false);

    if (errorConteo) {
      return NextResponse.json(
        { error: "No se pudo contar las notificaciones." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      notificaciones:
        (notificaciones ?? []) as Notificacion[],
      noLeidas: count ?? 0,
    });
  } catch (error) {
    console.error("Error al listar notificaciones:", error);

    return NextResponse.json(
      { error: "Ocurrio un error interno." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const usuario = await obtenerUsuarioActivo(request);

    if (!usuario) {
      return NextResponse.json(
        { error: "La sesion no es valida o ha vencido." },
        { status: 401 }
      );
    }

    const { error } = await supabaseAdmin
      .from("notificaciones")
      .update({
        leida: true,
        read_at: new Date().toISOString(),
      })
      .eq("usuario_id", usuario.id)
      .eq("leida", false);

    if (error) {
      return NextResponse.json(
        {
          error: `No se pudieron actualizar las notificaciones: ${error.message}`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      mensaje: "Notificaciones marcadas como leidas.",
    });
  } catch (error) {
    console.error("Error al marcar notificaciones:", error);

    return NextResponse.json(
      { error: "Ocurrio un error interno." },
      { status: 500 }
    );
  }
}
