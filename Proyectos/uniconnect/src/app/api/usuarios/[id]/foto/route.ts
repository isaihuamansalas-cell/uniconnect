import { createClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";

type ContextoRuta = {
  params: Promise<{ id: string }>;
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
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const {
    data: { user },
    error,
  } = await supabasePublico.auth.getUser(accessToken);

  return error ? null : user;
}

export async function GET(request: Request, contexto: ContextoRuta) {
  try {
    const usuarioAutenticado = await obtenerUsuarioAutenticado(request);

    if (!usuarioAutenticado) {
      return NextResponse.json(
        { error: "La sesion no es valida o ha vencido." },
        { status: 401 }
      );
    }

    const { data: responsable } = await supabaseAdmin
      .from("usuarios")
      .select("id")
      .eq("id", usuarioAutenticado.id)
      .in("rol_id", [1, 4])
      .eq("estado", true)
      .maybeSingle();

    if (!responsable) {
      return NextResponse.json(
        { error: "No tienes permiso para consultar esta fotografia." },
        { status: 403 }
      );
    }

    const { id } = await contexto.params;
    const { data: estudiante } = await supabaseAdmin
      .from("usuarios")
      .select("id, foto")
      .eq("id", id)
      .eq("rol_id", 5)
      .maybeSingle();

    if (!estudiante) {
      return NextResponse.json(
        { error: "El estudiante no existe." },
        { status: 404 }
      );
    }

    if (!estudiante.foto) {
      return NextResponse.json(
        { error: "El estudiante no tiene fotografia." },
        { status: 404 }
      );
    }

    const { data: firma, error: errorFirma } = await supabaseAdmin.storage
      .from("usuarios")
      .createSignedUrl(estudiante.foto, 60);

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
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Error al obtener la foto del estudiante:", error);
    return NextResponse.json(
      { error: "Ocurrio un error interno." },
      { status: 500 }
    );
  }
}
