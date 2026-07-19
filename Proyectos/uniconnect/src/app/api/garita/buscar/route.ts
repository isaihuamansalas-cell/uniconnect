import { createClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";

const longitudMinima = 3;
const longitudMaxima = 30;

type VehiculoBusqueda = {
  id: number;
  usuario_id: string;
  placa: string;
  marca: string | null;
  modelo: string | null;
  color: string;
  tipo: string;
  foto: string | null;
  estado: boolean;
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

async function validarResponsable(request: Request) {
  const usuarioAutenticado = await obtenerUsuarioAutenticado(request);

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
    const busqueda = searchParams.get("busqueda")?.trim().toUpperCase() ?? "";

    if (
      busqueda.length < longitudMinima ||
      busqueda.length > longitudMaxima
    ) {
      return NextResponse.json(
        { error: "La busqueda debe tener entre 3 y 30 caracteres." },
        { status: 400 }
      );
    }

    if (!/^[A-Z0-9_-]+$/.test(busqueda)) {
      return NextResponse.json(
        { error: "La busqueda contiene caracteres no validos." },
        { status: 400 }
      );
    }

    const { data: estudiantePorDocumento, error: errorDocumento } =
      await supabaseAdmin
        .from("usuarios")
        .select(
          "id, nombres, apellidos, dni, codigo_estudiante, foto, estado, rol_id"
        )
        .eq("rol_id", 5)
        .or(`dni.eq.${busqueda},codigo_estudiante.eq.${busqueda}`)
        .maybeSingle();

    if (errorDocumento) {
      console.error("Error al buscar estudiante en garita:", errorDocumento.message);
      return NextResponse.json(
        { error: "No se pudo consultar el estudiante." },
        { status: 400 }
      );
    }

    let vehiculoCoincidente: VehiculoBusqueda | null = null;
    let estudiante = estudiantePorDocumento;

    if (!estudiante) {
      const { data: vehiculoPorPlaca, error: errorPlaca } =
        await supabaseAdmin
          .from("vehiculos")
          .select(
            "id, usuario_id, placa, marca, modelo, color, tipo, foto, estado"
          )
          .eq("placa", busqueda)
          .maybeSingle();

      if (errorPlaca) {
        console.error("Error al buscar placa en garita:", errorPlaca.message);
        return NextResponse.json(
          { error: "No se pudo consultar la placa." },
          { status: 400 }
        );
      }

      vehiculoCoincidente = vehiculoPorPlaca as VehiculoBusqueda | null;

      if (vehiculoCoincidente) {
        const { data: propietario, error: errorPropietario } =
          await supabaseAdmin
            .from("usuarios")
            .select(
              "id, nombres, apellidos, dni, codigo_estudiante, foto, estado, rol_id"
            )
            .eq("id", vehiculoCoincidente.usuario_id)
            .eq("rol_id", 5)
            .maybeSingle();

        if (errorPropietario) {
          console.error(
            "Error al buscar propietario en garita:",
            errorPropietario.message
          );
          return NextResponse.json(
            { error: "No se pudo consultar al propietario del vehiculo." },
            { status: 400 }
          );
        }

        estudiante = propietario;
      }
    }

    if (!estudiante) {
      return NextResponse.json(
        { error: "No se encontro un estudiante o vehiculo con esos datos." },
        { status: 404 }
      );
    }

    const { data: vehiculos, error: errorVehiculos } = await supabaseAdmin
      .from("vehiculos")
      .select(
        "id, usuario_id, placa, marca, modelo, color, tipo, foto, estado"
      )
      .eq("usuario_id", estudiante.id)
      .order("placa", { ascending: true });

    if (errorVehiculos) {
      console.error("Error al consultar vehiculos en garita:", errorVehiculos.message);
      return NextResponse.json(
        { error: "No se pudieron consultar los vehiculos." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      estudiante: {
        id: estudiante.id,
        nombres: estudiante.nombres,
        apellidos: estudiante.apellidos,
        dni: estudiante.dni,
        codigo_estudiante: estudiante.codigo_estudiante,
        estado: estudiante.estado,
        rol_id: estudiante.rol_id,
        tiene_foto: Boolean(estudiante.foto),
        foto_version: estudiante.foto ? String(Date.now()) : "",
      },
      vehiculos: ((vehiculos ?? []) as VehiculoBusqueda[]).map(
        ({ foto, ...vehiculo }) => ({
          ...vehiculo,
          tiene_foto: Boolean(foto),
          foto_version: foto ? String(Date.now()) : "",
        })
      ),
      vehiculo_coincidente_id: vehiculoCoincidente?.id ?? null,
    });
  } catch (error) {
    console.error("Error en busqueda de garita:", error);
    return NextResponse.json(
      { error: "Ocurrio un error interno." },
      { status: 500 }
    );
  }
}
