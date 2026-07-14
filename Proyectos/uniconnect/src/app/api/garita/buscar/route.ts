import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";

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

async function validarResponsable(request: Request) {
  const usuarioAutenticado =
    await obtenerUsuarioAutenticado(request);

  if (!usuarioAutenticado) {
    return null;
  }

  const { data: responsable } = await supabaseAdmin
    .from("usuarios")
    .select("id, rol_id, estado")
    .eq("id", usuarioAutenticado.id)
    .in("rol_id", [1, 4])
    .eq("estado", true)
    .maybeSingle();

  return responsable;
}

export async function GET(request: Request) {
  try {
    const responsable = await validarResponsable(request);

    if (!responsable) {
      return NextResponse.json(
        { error: "No tienes permiso para usar el control de garita." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const busqueda = searchParams.get("busqueda")?.trim();

    if (!busqueda) {
      return NextResponse.json(
        { error: "Ingresa un DNI o codigo institucional." },
        { status: 400 }
      );
    }

    if (!/^[A-Za-z0-9_-]+$/.test(busqueda)) {
      return NextResponse.json(
        { error: "La busqueda contiene caracteres no validos." },
        { status: 400 }
      );
    }

    const { data: estudiante, error: errorEstudiante } =
      await supabaseAdmin
        .from("usuarios")
        .select(
          "id, nombres, apellidos, dni, codigo_estudiante, foto, estado, rol_id"
        )
        .eq("rol_id", 5)
        .or(`dni.eq.${busqueda},codigo_estudiante.eq.${busqueda}`)
        .maybeSingle();

    if (errorEstudiante) {
      return NextResponse.json(
        { error: "No se pudo consultar el estudiante." },
        { status: 400 }
      );
    }

    if (!estudiante) {
      return NextResponse.json(
        { error: "No se encontro un estudiante con esos datos." },
        { status: 404 }
      );
    }

    const { data: vehiculos, error: errorVehiculos } =
      await supabaseAdmin
        .from("vehiculos")
        .select(
          "id, usuario_id, placa, marca, modelo, color, tipo, foto, estado"
        )
        .eq("usuario_id", estudiante.id)
        .eq("estado", true)
        .order("placa", { ascending: true });

    if (errorVehiculos) {
      return NextResponse.json(
        { error: "No se pudieron consultar los vehiculos." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      estudiante,
      vehiculos: vehiculos ?? [],
    });
  } catch (error) {
    console.error("Error en busqueda de garita:", error);

    return NextResponse.json(
      { error: "Ocurrio un error interno." },
      { status: 500 }
    );
  }
}
