import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import {
  obtenerIp,
  obtenerUserAgent,
  registrarAuditoria,
} from "@/lib/auditoria/registrarAuditoria";
import { crearNotificacion } from "@/lib/notificaciones/crearNotificacion";
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
  foto: string | null;
};

type VehiculoResumen = {
  id: number;
  placa: string;
  marca: string | null;
  modelo: string | null;
  color: string;
  tipo: string;
};

const intervaloDuplicadoMilisegundos = 2 * 60 * 1000;

function obtenerInicioDiaLima() {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value ?? "";

  return `${valor("year")}-${valor("month")}-${valor("day")}T00:00:00-05:00`;
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
    const { searchParams } = new URL(request.url);
    const esHistorialReciente = searchParams.get("vista") === "reciente";
    const responsable = await validarResponsable(
      request,
      esHistorialReciente ? [1, 4] : [1, 2, 4]
    );

    if (!responsable) {
      return NextResponse.json(
        { error: "No tienes permiso para ver el historial." },
        { status: 403 }
      );
    }

    let consultaSalidas = supabaseAdmin
        .from("salidas")
        .select(
          "id, vehiculo_id, estudiante_id, garita_id, fecha, hora, created_at"
        )
        .order("created_at", { ascending: false });

    if (esHistorialReciente) {
      consultaSalidas = consultaSalidas
        .gte("created_at", obtenerInicioDiaLima())
        .limit(5);
    } else {
      consultaSalidas = consultaSalidas.limit(100);
    }

    const { data: salidas, error: errorSalidas } = await consultaSalidas;

    if (errorSalidas) {
      console.error("Error al consultar historial de salidas:", errorSalidas.message);
      return NextResponse.json(
        { error: "No se pudo cargar el historial." },
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
              "id, nombres, apellidos, dni, codigo_estudiante, foto"
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
          (() => {
            const estudiante = usuariosPorId.get(salida.estudiante_id);
            return estudiante
              ? {
                  id: estudiante.id,
                  nombres: estudiante.nombres,
                  apellidos: estudiante.apellidos,
                  dni: estudiante.dni,
                  codigo_estudiante: estudiante.codigo_estudiante,
                  tiene_foto: Boolean(estudiante.foto),
                  foto_version: estudiante.foto ? String(Date.now()) : "",
                }
              : null;
          })(),
        garita:
          (() => {
            const garita = usuariosPorId.get(salida.garita_id);
            return garita
              ? {
                  id: garita.id,
                  nombres: garita.nombres,
                  apellidos: garita.apellidos,
                  dni: garita.dni,
                  codigo_estudiante: garita.codigo_estudiante,
                }
              : null;
          })(),
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

    const limiteDuplicado = new Date(
      Date.now() - intervaloDuplicadoMilisegundos
    ).toISOString();
    const { data: salidaReciente, error: errorSalidaReciente } =
      await supabaseAdmin
        .from("salidas")
        .select("id, created_at")
        .eq("vehiculo_id", vehiculoId)
        .gte("created_at", limiteDuplicado)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (errorSalidaReciente) {
      console.error(
        "Error al validar salida duplicada:",
        errorSalidaReciente.message
      );
      return NextResponse.json(
        { error: "No se pudo validar el registro de salida." },
        { status: 500 }
      );
    }

    if (salidaReciente) {
      return NextResponse.json(
        {
          error:
            "Este vehiculo ya tiene una salida registrada en los ultimos 2 minutos.",
        },
        { status: 409 }
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
      console.error("Error al insertar salida:", errorSalida.message);
      return NextResponse.json(
        { error: "No se pudo registrar la salida." },
        { status: 400 }
      );
    }

    await crearNotificacion({
      usuario_id: estudianteId,
      titulo: "Salida registrada",
      mensaje: "Se registro una salida asociada a tu cuenta.",
      tipo: "salida",
      ruta: "/historial",
      entidad_tipo: "salida",
      entidad_id: String(salida.id),
    });

    await registrarAuditoria({
      usuario_id: responsable.id,
      accion: "registrar",
      modulo: "salidas",
      entidad_tipo: "salida",
      entidad_id: String(salida.id),
      descripcion: "Registro una salida.",
      datos_nuevos: salida,
      ip: obtenerIp(request),
      user_agent: obtenerUserAgent(request),
    });

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
