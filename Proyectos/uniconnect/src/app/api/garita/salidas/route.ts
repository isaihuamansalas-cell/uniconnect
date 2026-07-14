import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";

type NuevaSalida = {
  vehiculo_id?: number;
  estudiante_id?: string;
};

type SalidaBase = {
  id: number;
  vehiculo_id: number;
  estudiante_id: string;
  garita_id: string;
  fecha: string | null;
  hora: string | null;
  created_at: string;
};

type UsuarioResumen = {
  id: string;
  nombres: string;
  apellidos: string;
  dni: string;
  codigo_estudiante: string | null;
};

type VehiculoResumen = {
  id: number;
  placa: string;
  marca: string | null;
  modelo: string | null;
  color: string;
  tipo: string;
};

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

async function validarResponsable(
  request: Request,
  rolesPermitidos: number[]
) {
  const usuarioAutenticado =
    await obtenerUsuarioAutenticado(request);

  if (!usuarioAutenticado) {
    return null;
  }

  const { data: responsable } = await supabaseAdmin
    .from("usuarios")
    .select("id, rol_id, estado")
    .eq("id", usuarioAutenticado.id)
    .in("rol_id", rolesPermitidos)
    .eq("estado", true)
    .maybeSingle();

  return responsable;
}

export async function GET(request: Request) {
  try {
    const responsable = await validarResponsable(
      request,
      [1, 2, 4]
    );

    if (!responsable) {
      return NextResponse.json(
        { error: "No tienes permiso para ver el historial." },
        { status: 403 }
      );
    }

    const { data: salidas, error: errorSalidas } =
      await supabaseAdmin
        .from("salidas")
        .select(
          "id, vehiculo_id, estudiante_id, garita_id, fecha, hora, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(100);

    if (errorSalidas) {
      return NextResponse.json(
        {
          error: `No se pudo cargar el historial: ${errorSalidas.message}`,
        },
        { status: 400 }
      );
    }

    const registros = (salidas ?? []) as SalidaBase[];
    const idsUsuarios = Array.from(
      new Set(
        registros.flatMap((salida) => [
          salida.estudiante_id,
          salida.garita_id,
        ])
      )
    );
    const idsVehiculos = Array.from(
      new Set(registros.map((salida) => salida.vehiculo_id))
    );

    const { data: usuarios, error: errorUsuarios } =
      idsUsuarios.length > 0
        ? await supabaseAdmin
            .from("usuarios")
            .select(
              "id, nombres, apellidos, dni, codigo_estudiante"
            )
            .in("id", idsUsuarios)
        : { data: [], error: null };

    if (errorUsuarios) {
      return NextResponse.json(
        { error: "No se pudieron cargar los usuarios." },
        { status: 400 }
      );
    }

    const { data: vehiculos, error: errorVehiculos } =
      idsVehiculos.length > 0
        ? await supabaseAdmin
            .from("vehiculos")
            .select("id, placa, marca, modelo, color, tipo")
            .in("id", idsVehiculos)
        : { data: [], error: null };

    if (errorVehiculos) {
      return NextResponse.json(
        { error: "No se pudieron cargar los vehiculos." },
        { status: 400 }
      );
    }

    const usuariosPorId = new Map(
      ((usuarios ?? []) as UsuarioResumen[]).map((usuario) => [
        usuario.id,
        usuario,
      ])
    );
    const vehiculosPorId = new Map(
      ((vehiculos ?? []) as VehiculoResumen[]).map((vehiculo) => [
        vehiculo.id,
        vehiculo,
      ])
    );

    return NextResponse.json({
      salidas: registros.map((salida) => ({
        ...salida,
        estudiante:
          usuariosPorId.get(salida.estudiante_id) ?? null,
        garita: usuariosPorId.get(salida.garita_id) ?? null,
        vehiculo:
          vehiculosPorId.get(salida.vehiculo_id) ?? null,
      })),
    });
  } catch (error) {
    console.error("Error al cargar historial de salidas:", error);

    return NextResponse.json(
      { error: "Ocurrio un error interno." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const responsable = await validarResponsable(request, [1, 4]);

    if (!responsable) {
      return NextResponse.json(
        { error: "No tienes permiso para autorizar salidas." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as NuevaSalida;
    const vehiculoId = Number(body.vehiculo_id);
    const estudianteId = body.estudiante_id?.trim();

    if (!Number.isInteger(vehiculoId) || vehiculoId <= 0) {
      return NextResponse.json(
        { error: "Selecciona un vehiculo valido." },
        { status: 400 }
      );
    }

    if (!estudianteId) {
      return NextResponse.json(
        { error: "No se recibio el estudiante." },
        { status: 400 }
      );
    }

    const { data: estudiante } = await supabaseAdmin
      .from("usuarios")
      .select("id, rol_id, estado")
      .eq("id", estudianteId)
      .eq("rol_id", 5)
      .eq("estado", true)
      .maybeSingle();

    if (!estudiante) {
      return NextResponse.json(
        { error: "El estudiante no existe o no esta activo." },
        { status: 400 }
      );
    }

    const { data: vehiculo } = await supabaseAdmin
      .from("vehiculos")
      .select("id, usuario_id, estado")
      .eq("id", vehiculoId)
      .eq("usuario_id", estudianteId)
      .eq("estado", true)
      .maybeSingle();

    if (!vehiculo) {
      return NextResponse.json(
        {
          error:
            "El vehiculo no existe, no esta activo o no pertenece al estudiante.",
        },
        { status: 400 }
      );
    }

    const { data: salida, error: errorSalida } =
      await supabaseAdmin
        .from("salidas")
        .insert({
          vehiculo_id: vehiculoId,
          estudiante_id: estudianteId,
          garita_id: responsable.id,
        })
        .select(
          "id, vehiculo_id, estudiante_id, garita_id, fecha, hora, created_at"
        )
        .single();

    if (errorSalida) {
      return NextResponse.json(
        {
          error: `No se pudo registrar la salida: ${errorSalida.message}`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        mensaje: "Salida autorizada correctamente.",
        salida,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error al registrar salida:", error);

    return NextResponse.json(
      { error: "Ocurrio un error interno." },
      { status: 500 }
    );
  }
}
