import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import {
  obtenerIp,
  obtenerUserAgent,
  registrarAuditoria,
} from "@/lib/auditoria/registrarAuditoria";
import { supabaseAdmin } from "@/lib/supabase/admin";

type DatosVehiculo = {
  usuario_id?: string;
  placa?: string;
  marca?: string | null;
  modelo?: string | null;
  color?: string;
  tipo?: string;
  anio?: number | null;
  estado?: boolean;
};

type ContextoRuta = {
  params: Promise<{
    id: string;
  }>;
};

type VehiculoAnterior = {
  id: number;
  usuario_id: string;
  placa: string;
  marca: string | null;
  modelo: string | null;
  color: string;
  tipo: string;
  anio: number | null;
  foto: string | null;
  estado: boolean;
  created_at: string;
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

export async function PATCH(
  request: Request,
  contexto: ContextoRuta
) {
  try {
    const usuarioAutenticado =
      await obtenerUsuarioAutenticado(request);

    if (!usuarioAutenticado) {
      return NextResponse.json(
        { error: "La sesion no es valida o ha vencido." },
        { status: 401 }
      );
    }

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
            "Solo un administrador o profesor activo puede editar vehiculos.",
        },
        { status: 403 }
      );
    }

    const { id } = await contexto.params;
    const vehiculoId = Number(id);

    if (!Number.isInteger(vehiculoId) || vehiculoId <= 0) {
      return NextResponse.json(
        { error: "El vehiculo no es valido." },
        { status: 400 }
      );
    }

    const body = (await request.json()) as DatosVehiculo;

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
        { error: "Ingresa una placa valida." },
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
        { error: "Selecciona el tipo de vehiculo." },
        { status: 400 }
      );
    }

    if (
      anio !== null &&
      (anio < 1950 || anio > new Date().getFullYear() + 1)
    ) {
      return NextResponse.json(
        { error: "El anio del vehiculo no es valido." },
        { status: 400 }
      );
    }

    const { data: vehiculoExistente } = await supabaseAdmin
      .from("vehiculos")
      .select(
        "id, usuario_id, placa, marca, modelo, color, tipo, anio, foto, estado, created_at"
      )
      .eq("id", vehiculoId)
      .maybeSingle();

    if (!vehiculoExistente) {
      return NextResponse.json(
        { error: "El vehiculo no existe." },
        { status: 404 }
      );
    }

    const vehiculoAnterior = vehiculoExistente as VehiculoAnterior;

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
      .neq("id", vehiculoId)
      .maybeSingle();

    if (placaExistente) {
      return NextResponse.json(
        { error: "La placa ya esta registrada." },
        { status: 409 }
      );
    }

    const { data: vehiculo, error: errorActualizacion } =
      await supabaseAdmin
        .from("vehiculos")
        .update({
          usuario_id: propietarioId,
          placa,
          marca,
          modelo,
          color,
          tipo,
          anio,
          estado: body.estado ?? true,
        })
        .eq("id", vehiculoId)
        .select(
          "id, usuario_id, placa, marca, modelo, color, tipo, anio, foto, estado, created_at"
        )
        .single();

    if (errorActualizacion) {
      return NextResponse.json(
        {
          error: `No se pudo actualizar el vehiculo: ${errorActualizacion.message}`,
        },
        { status: 400 }
      );
    }

    await registrarAuditoria({
      usuario_id: responsable.id,
      accion: "editar",
      modulo: "vehiculos",
      entidad_tipo: "vehiculo",
      entidad_id: String(vehiculo.id),
      descripcion: "Edito un vehiculo.",
      datos_anteriores: vehiculoAnterior,
      datos_nuevos: vehiculo,
      ip: obtenerIp(request),
      user_agent: obtenerUserAgent(request),
    });

    if (
      Boolean(vehiculoAnterior.estado) !== Boolean(vehiculo.estado)
    ) {
      await registrarAuditoria({
        usuario_id: responsable.id,
        accion: vehiculo.estado ? "activar" : "desactivar",
        modulo: "vehiculos",
        entidad_tipo: "vehiculo",
        entidad_id: String(vehiculo.id),
        descripcion: vehiculo.estado
          ? "Activo un vehiculo."
          : "Desactivo un vehiculo.",
        datos_anteriores: { estado: vehiculoAnterior.estado },
        datos_nuevos: { estado: vehiculo.estado },
        ip: obtenerIp(request),
        user_agent: obtenerUserAgent(request),
      });
    }

    return NextResponse.json({
      mensaje: "Vehiculo actualizado correctamente.",
      vehiculo,
    });
  } catch (error) {
    console.error("Error al actualizar vehiculo:", error);

    return NextResponse.json(
      { error: "Ocurrio un error interno." },
      { status: 500 }
    );
  }
}
