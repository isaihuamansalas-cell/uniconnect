import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";

type DatosEmprendimiento = {
  titulo?: string;
  descripcion?: string;
  estado?: boolean;
};

type ContextoRuta = {
  params: Promise<{
    id: string;
  }>;
};

const rolesGestionEmprendimientos = [1, 3];

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

async function obtenerGestorActivo(request: Request) {
  const usuarioAutenticado =
    await obtenerUsuarioAutenticado(request);

  if (!usuarioAutenticado) {
    return null;
  }

  const { data: usuario } = await supabaseAdmin
    .from("usuarios")
    .select("id, rol_id, estado")
    .eq("id", usuarioAutenticado.id)
    .in("rol_id", rolesGestionEmprendimientos)
    .eq("estado", true)
    .maybeSingle();

  return usuario;
}

function validarEmprendimiento(body: DatosEmprendimiento) {
  const titulo = body.titulo?.trim();
  const descripcion = body.descripcion?.trim();

  if (!titulo || titulo.length < 4) {
    return {
      error: "El titulo debe tener al menos 4 caracteres.",
    };
  }

  if (!descripcion || descripcion.length < 10) {
    return {
      error: "La descripcion debe tener al menos 10 caracteres.",
    };
  }

  return {
    datos: {
      titulo,
      descripcion,
      estado: body.estado ?? true,
      updated_at: new Date().toISOString(),
    },
  };
}

export async function PATCH(
  request: Request,
  contexto: ContextoRuta
) {
  try {
    const gestor = await obtenerGestorActivo(request);

    if (!gestor) {
      return NextResponse.json(
        {
          error:
            "Solo un administrador o profesor activo puede editar emprendimientos.",
        },
        { status: 403 }
      );
    }

    const { id } = await contexto.params;
    const emprendimientoId = Number(id);

    if (
      !Number.isInteger(emprendimientoId) ||
      emprendimientoId <= 0
    ) {
      return NextResponse.json(
        { error: "El emprendimiento no es valido." },
        { status: 400 }
      );
    }

    const body = (await request.json()) as DatosEmprendimiento;
    const validacion = validarEmprendimiento(body);

    if ("error" in validacion) {
      return NextResponse.json(
        { error: validacion.error },
        { status: 400 }
      );
    }

    const { data: emprendimientoExistente } =
      await supabaseAdmin
        .from("emprendimientos")
        .select("id")
        .eq("id", emprendimientoId)
        .maybeSingle();

    if (!emprendimientoExistente) {
      return NextResponse.json(
        { error: "El emprendimiento no existe." },
        { status: 404 }
      );
    }

    const {
      data: emprendimiento,
      error: errorActualizacion,
    } = await supabaseAdmin
      .from("emprendimientos")
      .update(validacion.datos)
      .eq("id", emprendimientoId)
      .select(
        "id, titulo, descripcion, autor_id, foto, estado, created_at, updated_at"
      )
      .single();

    if (errorActualizacion) {
      return NextResponse.json(
        {
          error: `No se pudo actualizar el emprendimiento: ${errorActualizacion.message}`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      mensaje: "Emprendimiento actualizado correctamente.",
      emprendimiento,
    });
  } catch (error) {
    console.error("Error al actualizar emprendimiento:", error);

    return NextResponse.json(
      { error: "Ocurrio un error interno." },
      { status: 500 }
    );
  }
}
