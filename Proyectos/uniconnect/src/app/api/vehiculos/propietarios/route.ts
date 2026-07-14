import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "No has iniciado sesión." },
        { status: 401 }
      );
    }

    const token = authorization.replace("Bearer ", "").trim();

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
    } = await supabasePublico.auth.getUser(token);

    if (errorAutenticacion || !user) {
      return NextResponse.json(
        { error: "La sesión no es válida." },
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
        { error: "No tienes permiso para consultar propietarios." },
        { status: 403 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("usuarios")
      .select(
        "id, nombres, apellidos, dni, codigo_estudiante, rol_id"
      )
      .in("rol_id", [3, 5])
      .eq("estado", true)
      .order("nombres", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "No se pudieron cargar los propietarios." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      propietarios: data ?? [],
    });
  } catch (error) {
    console.error("Error al consultar propietarios:", error);

    return NextResponse.json(
      { error: "Ocurrió un error interno." },
      { status: 500 }
    );
  }
}