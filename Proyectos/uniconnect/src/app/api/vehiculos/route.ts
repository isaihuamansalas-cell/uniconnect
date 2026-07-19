import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import {
  obtenerIp,
  obtenerUserAgent,
  registrarAuditoria,
} from "@/lib/auditoria/registrarAuditoria";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { autorizarApi } from "@/lib/auth/autorizarApi";

type NuevoVehiculo = {
  usuario_id?: string;
  placa?: string;
  marca?: string | null;
  modelo?: string | null;
  color?: string;
  tipo?: string;
  anio?: number | null;
};

export async function GET(request: Request) {
  try {
    const autorizacion = await autorizarApi(request, [1, 3]);
    if (!autorizacion.autorizado) {
      return NextResponse.json(
        { error: autorizacion.status === 401 ? "La sesion no es valida o ha vencido." : "No tienes permiso para consultar vehiculos." },
        { status: autorizacion.status }
      );
    }
    const { data, error } = await supabaseAdmin
      .from("vehiculos")
      .select("id, usuario_id, placa, marca, modelo, color, tipo, anio, foto, estado, created_at, usuarios(nombres, apellidos, dni, codigo_estudiante)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return NextResponse.json({ vehiculos: data ?? [] });
  } catch (error) {
    console.error("Error al consultar vehiculos:", error);
    return NextResponse.json({ error: "No se pudo cargar la lista de vehiculos." }, { status: 500 });
  }
}

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

export async function POST(request: Request) {
  try {
    const usuarioAutenticado =
      await obtenerUsuarioAutenticado(request);

    if (!usuarioAutenticado) {
      return NextResponse.json(
        { error: "La sesión no es válida o ha vencido." },
        { status: 401 }
      );
    }

    // Administrador = 1, Profesor = 3
    const { data: responsable, error: errorResponsable } =
      await supabaseAdmin
        .from("usuarios")
        .select("id, rol_id, estado")
        .eq("id", usuarioAutenticado.id)
        .in("rol_id", [1, 3])
        .eq("estado", true)
        .maybeSingle();

    if (errorResponsable || !responsable) {
      return NextResponse.json(
        {
          error:
            "Solo un administrador o profesor activo puede registrar vehículos.",
        },
        { status: 403 }
      );
    }

    const body = (await request.json()) as NuevoVehiculo;

    const propietarioId = body.usuario_id?.trim();
    const placa = body.placa
      ?.trim()
      .toUpperCase()
      .replace(/\s+/g, "");
    const marca = body.marca?.trim() || null;
    const modelo = body.modelo?.trim() || null;
    const color = body.color?.trim();
    const tipo = body.tipo?.trim();
    const anio = body.anio ? Number(body.anio) : null;

    if (!propietarioId) {
      return NextResponse.json(
        { error: "Selecciona un propietario." },
        { status: 400 }
      );
    }

    if (!placa || placa.length < 5 || placa.length > 10) {
      return NextResponse.json(
        { error: "Ingresa una placa válida." },
        { status: 400 }
      );
    }

    if (!color) {
      return NextResponse.json(
        { error: "El color es obligatorio." },
        { status: 400 }
      );
    }

    if (!tipo) {
      return NextResponse.json(
        { error: "Selecciona el tipo de vehículo." },
        { status: 400 }
      );
    }

    if (
      anio !== null &&
      (anio < 1950 || anio > new Date().getFullYear() + 1)
    ) {
      return NextResponse.json(
        { error: "El año del vehículo no es válido." },
        { status: 400 }
      );
    }

    // Solo estudiantes y profesores pueden ser propietarios.
    const { data: propietario, error: errorPropietario } =
      await supabaseAdmin
        .from("usuarios")
        .select("id, rol_id, estado")
        .eq("id", propietarioId)
        .in("rol_id", [3, 5])
        .eq("estado", true)
        .maybeSingle();

    if (errorPropietario || !propietario) {
      return NextResponse.json(
        {
          error:
            "El propietario debe ser un profesor o estudiante activo.",
        },
        { status: 400 }
      );
    }

    const { data: placaExistente } = await supabaseAdmin
      .from("vehiculos")
      .select("id")
      .eq("placa", placa)
      .maybeSingle();

    if (placaExistente) {
      return NextResponse.json(
        { error: "La placa ya está registrada." },
        { status: 409 }
      );
    }

    const { data: vehiculo, error: errorVehiculo } =
      await supabaseAdmin
        .from("vehiculos")
        .insert({
          usuario_id: propietarioId,
          placa,
          marca,
          modelo,
          color,
          tipo,
          anio,
          foto: null,
          estado: true,
        })
        .select(
          "id, usuario_id, placa, marca, modelo, color, tipo, anio, foto, estado, created_at"
        )
        .single();

    if (errorVehiculo) {
      return NextResponse.json(
        {
          error: `No se pudo registrar el vehículo: ${errorVehiculo.message}`,
        },
        { status: 400 }
      );
    }

    await registrarAuditoria({
      usuario_id: responsable.id,
      accion: "crear",
      modulo: "vehiculos",
      entidad_tipo: "vehiculo",
      entidad_id: String(vehiculo.id),
      descripcion: "Registro un vehiculo.",
      datos_nuevos: vehiculo,
      ip: obtenerIp(request),
      user_agent: obtenerUserAgent(request),
    });

    return NextResponse.json(
      {
        mensaje: "Vehículo registrado correctamente.",
        vehiculo,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error al registrar vehículo:", error);

    return NextResponse.json(
      { error: "Ocurrió un error interno." },
      { status: 500 }
    );
  }
}
