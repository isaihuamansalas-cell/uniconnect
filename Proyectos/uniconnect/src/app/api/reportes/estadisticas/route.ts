import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";

type UsuarioActivo = {
  id: string;
  rol_id: number;
  estado: boolean;
};

type Estadisticas = {
  usuariosActivos: number;
  vehiculosActivos: number;
  salidasHoy: number;
  avisosActivos: number;
  emprendimientosActivos: number;
};

const rolesPermitidos = [1, 2, 3];

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

  return usuario as UsuarioActivo | null;
}

async function contarActivos(tabla: string) {
  const { count, error } = await supabaseAdmin
    .from(tabla)
    .select("id", { count: "exact", head: true })
    .eq("estado", true);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

function obtenerRangoHoy() {
  const ahora = new Date();
  const inicio = new Date(ahora);
  inicio.setHours(0, 0, 0, 0);

  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 1);

  return {
    inicio: inicio.toISOString(),
    fin: fin.toISOString(),
  };
}

async function contarSalidasHoy() {
  const { inicio, fin } = obtenerRangoHoy();

  const { count, error } = await supabaseAdmin
    .from("salidas")
    .select("id", { count: "exact", head: true })
    .gte("created_at", inicio)
    .lt("created_at", fin);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
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

    if (!rolesPermitidos.includes(Number(usuario.rol_id))) {
      return NextResponse.json(
        { error: "No tienes permiso para ver reportes." },
        { status: 403 }
      );
    }

    const [
      usuariosActivos,
      vehiculosActivos,
      salidasHoy,
      avisosActivos,
      emprendimientosActivos,
    ] = await Promise.all([
      contarActivos("usuarios"),
      contarActivos("vehiculos"),
      contarSalidasHoy(),
      contarActivos("avisos"),
      contarActivos("emprendimientos"),
    ]);

    const estadisticas: Estadisticas = {
      usuariosActivos,
      vehiculosActivos,
      salidasHoy,
      avisosActivos,
      emprendimientosActivos,
    };

    return NextResponse.json({
      estadisticas,
      rol_id: usuario.rol_id,
    });
  } catch (error) {
    console.error("Error al cargar estadisticas:", error);

    return NextResponse.json(
      { error: "Ocurrio un error interno." },
      { status: 500 }
    );
  }
}
