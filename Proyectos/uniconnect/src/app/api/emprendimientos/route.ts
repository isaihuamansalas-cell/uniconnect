import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";

type DatosEmprendimiento = {
  titulo?: string;
  descripcion?: string;
  estado?: boolean;
};

type EmprendimientoBase = {
  id: number;
  titulo: string;
  descripcion: string;
  autor_id: string;
  foto: string | null;
  estado: boolean;
  created_at: string;
  updated_at: string | null;
};

type AutorEmprendimiento = {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
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
    },
  };
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

    const {
      data: emprendimientos,
      error: errorEmprendimientos,
    } = await supabaseAdmin
      .from("emprendimientos")
      .select(
        "id, titulo, descripcion, autor_id, foto, estado, created_at, updated_at"
      )
      .order("created_at", { ascending: false });

    if (errorEmprendimientos) {
      return NextResponse.json(
        {
          error: `No se pudieron cargar los emprendimientos: ${errorEmprendimientos.message}`,
        },
        { status: 400 }
      );
    }

    const registros =
      (emprendimientos ?? []) as EmprendimientoBase[];
    const autoresIds = Array.from(
      new Set(registros.map((emprendimiento) => emprendimiento.autor_id))
    );

    const { data: autores, error: errorAutores } =
      autoresIds.length > 0
        ? await supabaseAdmin
            .from("usuarios")
            .select("id, nombres, apellidos, correo")
            .in("id", autoresIds)
        : { data: [], error: null };

    if (errorAutores) {
      return NextResponse.json(
        { error: "No se pudieron cargar los autores." },
        { status: 400 }
      );
    }

    const autoresPorId = new Map(
      ((autores ?? []) as AutorEmprendimiento[]).map((autor) => [
        autor.id,
        autor,
      ])
    );

    return NextResponse.json({
      emprendimientos: registros.map((emprendimiento) => ({
        ...emprendimiento,
        autor:
          autoresPorId.get(emprendimiento.autor_id) ?? null,
      })),
      puedeGestionar: rolesGestionEmprendimientos.includes(
        Number(usuario.rol_id)
      ),
    });
  } catch (error) {
    console.error("Error al listar emprendimientos:", error);

    return NextResponse.json(
      { error: "Ocurrio un error interno." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const usuario = await obtenerUsuarioActivo(request);

    if (!usuario) {
      return NextResponse.json(
        { error: "La sesion no es valida o ha vencido." },
        { status: 401 }
      );
    }

    if (
      !rolesGestionEmprendimientos.includes(Number(usuario.rol_id))
    ) {
      return NextResponse.json(
        {
          error:
            "Solo un administrador o profesor activo puede crear emprendimientos.",
        },
        { status: 403 }
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

    const { data: emprendimiento, error: errorCreacion } =
      await supabaseAdmin
        .from("emprendimientos")
        .insert({
          ...validacion.datos,
          autor_id: usuario.id,
          foto: null,
          updated_at: new Date().toISOString(),
        })
        .select(
          "id, titulo, descripcion, autor_id, foto, estado, created_at, updated_at"
        )
        .single();

    if (errorCreacion) {
      return NextResponse.json(
        {
          error: `No se pudo crear el emprendimiento: ${errorCreacion.message}`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        mensaje: "Emprendimiento creado correctamente.",
        emprendimiento,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error al crear emprendimiento:", error);

    return NextResponse.json(
      { error: "Ocurrio un error interno." },
      { status: 500 }
    );
  }
}
