import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { respuestaErrorApi } from "@/lib/api/respuestas";

import { supabaseAdmin } from "@/lib/supabase/admin";

type UsuarioActivo = {
  id: string;
  rol_id: number;
  estado: boolean;
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

type SalidaReporte = SalidaBase & {
  estudiante: UsuarioResumen | null;
  garita: UsuarioResumen | null;
  vehiculo: VehiculoResumen | null;
};

type FiltrosValidados = {
  fechaInicio: string | null;
  fechaFin: string | null;
  dni: string | null;
  codigo: string | null;
  placa: string | null;
};

const rolesDetalleSalidas = [1, 2, 4];

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

function validarFecha(fecha: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return false;
  }

  const fechaUtc = new Date(`${fecha}T00:00:00.000Z`);

  return (
    !Number.isNaN(fechaUtc.getTime()) &&
    fechaUtc.toISOString().slice(0, 10) === fecha
  );
}

function validarFiltros(url: URL):
  | { filtros: FiltrosValidados }
  | { error: string } {
  const fechaInicio =
    url.searchParams.get("fechaInicio")?.trim() || null;
  const fechaFin =
    url.searchParams.get("fechaFin")?.trim() || null;
  const dni = url.searchParams.get("dni")?.trim() || null;
  const codigo = url.searchParams.get("codigo")?.trim() || null;
  const placa =
    url.searchParams.get("placa")?.trim().toUpperCase() || null;

  if (fechaInicio && !validarFecha(fechaInicio)) {
    return { error: "La fecha inicial no es valida." };
  }

  if (fechaFin && !validarFecha(fechaFin)) {
    return { error: "La fecha final no es valida." };
  }

  if (
    fechaInicio &&
    fechaFin &&
    new Date(`${fechaInicio}T00:00:00.000Z`) >
      new Date(`${fechaFin}T00:00:00.000Z`)
  ) {
    return {
      error: "La fecha inicial no puede ser mayor que la fecha final.",
    };
  }

  if (dni && !/^\d{1,8}$/.test(dni)) {
    return { error: "El DNI solo puede contener hasta 8 numeros." };
  }

  if (codigo && !/^[A-Za-z0-9_-]{1,30}$/.test(codigo)) {
    return { error: "El codigo contiene caracteres no validos." };
  }

  if (placa && !/^[A-Z0-9-]{1,12}$/.test(placa)) {
    return { error: "La placa contiene caracteres no validos." };
  }

  return {
    filtros: {
      fechaInicio,
      fechaFin,
      dni,
      codigo,
      placa,
    },
  };
}

function obtenerFinDia(fecha: string) {
  const fin = new Date(`${fecha}T00:00:00.000Z`);
  fin.setUTCDate(fin.getUTCDate() + 1);
  return fin.toISOString();
}

async function obtenerIdsEstudiantes(filtros: FiltrosValidados) {
  if (!filtros.dni && !filtros.codigo) {
    return null;
  }

  let consulta = supabaseAdmin
    .from("usuarios")
    .select("id")
    .eq("rol_id", 5);

  if (filtros.dni) {
    consulta = consulta.eq("dni", filtros.dni);
  }

  if (filtros.codigo) {
    consulta = consulta.eq("codigo_estudiante", filtros.codigo);
  }

  const { data, error } = await consulta;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((usuario) => String(usuario.id));
}

async function obtenerIdsVehiculos(filtros: FiltrosValidados) {
  if (!filtros.placa) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("vehiculos")
    .select("id")
    .eq("placa", filtros.placa);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((vehiculo) => Number(vehiculo.id));
}

function ocultarDato(valor: string | null | undefined) {
  return valor ? "Restringido" : null;
}

function recortarPorRol(
  salidas: SalidaReporte[],
  rolId: number
): SalidaReporte[] {
  if (rolId !== 4) {
    return salidas;
  }

  return salidas.map((salida) => ({
    ...salida,
    estudiante: salida.estudiante
      ? {
          ...salida.estudiante,
          nombres: ocultarDato(salida.estudiante.nombres) ?? "",
          apellidos: "",
          dni: ocultarDato(salida.estudiante.dni) ?? "",
          codigo_estudiante: ocultarDato(
            salida.estudiante.codigo_estudiante
          ),
        }
      : null,
  }));
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

    const rolId = Number(usuario.rol_id);

    if (rolId === 3) {
      return NextResponse.json(
        {
          error:
            "Los profesores solo pueden ver estadisticas generales.",
        },
        { status: 403 }
      );
    }

    if (!rolesDetalleSalidas.includes(rolId)) {
      return NextResponse.json(
        { error: "No tienes permiso para ver salidas." },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const validacion = validarFiltros(url);

    if ("error" in validacion) {
      return NextResponse.json(
        { error: validacion.error },
        { status: 400 }
      );
    }

    const filtros = validacion.filtros;
    const idsEstudiantes = await obtenerIdsEstudiantes(filtros);
    const idsVehiculos = await obtenerIdsVehiculos(filtros);

    if (idsEstudiantes?.length === 0 || idsVehiculos?.length === 0) {
      return NextResponse.json({
        salidas: [],
        rol_id: rolId,
      });
    }

    let consulta = supabaseAdmin
      .from("salidas")
      .select(
        "id, vehiculo_id, estudiante_id, garita_id, fecha, hora, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (filtros.fechaInicio) {
      consulta = consulta.gte(
        "created_at",
        `${filtros.fechaInicio}T00:00:00.000Z`
      );
    }

    if (filtros.fechaFin) {
      consulta = consulta.lt(
        "created_at",
        obtenerFinDia(filtros.fechaFin)
      );
    }

    if (idsEstudiantes) {
      consulta = consulta.in("estudiante_id", idsEstudiantes);
    }

    if (idsVehiculos) {
      consulta = consulta.in("vehiculo_id", idsVehiculos);
    }

    const { data: salidas, error: errorSalidas } = await consulta;

    if (errorSalidas) {
      return respuestaErrorApi("cargar salidas de reportes", errorSalidas, "No se pudo cargar la informacion.");
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
    const idsVehiculosSalida = Array.from(
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
      idsVehiculosSalida.length > 0
        ? await supabaseAdmin
            .from("vehiculos")
            .select("id, placa, marca, modelo, color, tipo")
            .in("id", idsVehiculosSalida)
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

    const salidasReporte: SalidaReporte[] = registros.map(
      (salida) => ({
        ...salida,
        estudiante:
          usuariosPorId.get(salida.estudiante_id) ?? null,
        garita: usuariosPorId.get(salida.garita_id) ?? null,
        vehiculo:
          vehiculosPorId.get(salida.vehiculo_id) ?? null,
      })
    );

    return NextResponse.json({
      salidas: recortarPorRol(salidasReporte, rolId),
      rol_id: rolId,
    });
  } catch (error) {
    console.error("Error al cargar salidas de reportes:", error);

    return NextResponse.json(
      { error: "Ocurrio un error interno." },
      { status: 500 }
    );
  }
}
