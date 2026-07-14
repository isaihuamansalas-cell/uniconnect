import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";

type NuevoAviso = {
  titulo?: string;
  contenido?: string;
  tipo?: string;
  destinatario?: string;
  area_academica?: string | null;
  ciclo?: string | null;
  estado?: boolean;
};

type AvisoBase = {
  id: number;
  titulo: string;
  contenido: string;
  autor_id: string;
  tipo: string;
  destinatario: string;
  area_academica: string | null;
  ciclo: string | null;
  estado: boolean;
  created_at: string;
  updated_at: string | null;
};

type AutorAviso = {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
};

const rolesGestionAvisos = [1, 3];
const destinatariosPermitidos = [
  "Todos",
  "Area academica",
  "Ciclo especifico",
];

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

async function obtenerResponsableActivo(request: Request) {
  const usuarioAutenticado =
    await obtenerUsuarioAutenticado(request);

  if (!usuarioAutenticado) {
    return null;
  }

  const { data: responsable } = await supabaseAdmin
    .from("usuarios")
    .select("id, rol_id, estado")
    .eq("id", usuarioAutenticado.id)
    .eq("estado", true)
    .maybeSingle();

  return responsable;
}

function validarAviso(body: NuevoAviso) {
  const titulo = body.titulo?.trim();
  const contenido = body.contenido?.trim();
  const tipo = body.tipo?.trim();
  const destinatario = body.destinatario?.trim();
  const areaAcademica = body.area_academica?.trim() || null;
  const ciclo = body.ciclo?.trim() || null;

  if (!titulo || titulo.length < 4) {
    return {
      error: "El titulo debe tener al menos 4 caracteres.",
    };
  }

  if (!contenido || contenido.length < 10) {
    return {
      error: "El contenido debe tener al menos 10 caracteres.",
    };
  }

  if (!tipo) {
    return { error: "Selecciona el tipo de aviso." };
  }

  if (
    !destinatario ||
    !destinatariosPermitidos.includes(destinatario)
  ) {
    return { error: "Selecciona un destinatario valido." };
  }

  if (destinatario === "Area academica" && !areaAcademica) {
    return {
      error: "Ingresa el area academica del aviso.",
    };
  }

  if (destinatario === "Ciclo especifico" && !ciclo) {
    return {
      error: "Ingresa el ciclo del aviso.",
    };
  }

  return {
    datos: {
      titulo,
      contenido,
      tipo,
      destinatario,
      area_academica:
        destinatario === "Area academica" ? areaAcademica : null,
      ciclo: destinatario === "Ciclo especifico" ? ciclo : null,
      estado: body.estado ?? true,
    },
  };
}

export async function GET(request: Request) {
  try {
    const responsable = await obtenerResponsableActivo(request);

    if (!responsable) {
      return NextResponse.json(
        { error: "La sesion no es valida o ha vencido." },
        { status: 401 }
      );
    }

    const { data: avisos, error: errorAvisos } =
      await supabaseAdmin
        .from("avisos")
        .select(
          "id, titulo, contenido, autor_id, tipo, destinatario, area_academica, ciclo, estado, created_at, updated_at"
        )
        .order("created_at", { ascending: false });

    if (errorAvisos) {
      return NextResponse.json(
        {
          error: `No se pudieron cargar los avisos: ${errorAvisos.message}`,
        },
        { status: 400 }
      );
    }

    const registros = (avisos ?? []) as AvisoBase[];
    const autoresIds = Array.from(
      new Set(registros.map((aviso) => aviso.autor_id))
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
      ((autores ?? []) as AutorAviso[]).map((autor) => [
        autor.id,
        autor,
      ])
    );

    return NextResponse.json({
      avisos: registros.map((aviso) => ({
        ...aviso,
        autor: autoresPorId.get(aviso.autor_id) ?? null,
      })),
      puedeGestionar: rolesGestionAvisos.includes(
        Number(responsable.rol_id)
      ),
    });
  } catch (error) {
    console.error("Error al listar avisos:", error);

    return NextResponse.json(
      { error: "Ocurrio un error interno." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const responsable = await obtenerResponsableActivo(request);

    if (!responsable) {
      return NextResponse.json(
        { error: "La sesion no es valida o ha vencido." },
        { status: 401 }
      );
    }

    if (
      !rolesGestionAvisos.includes(Number(responsable.rol_id))
    ) {
      return NextResponse.json(
        {
          error:
            "Solo un administrador o profesor activo puede crear avisos.",
        },
        { status: 403 }
      );
    }

    const body = (await request.json()) as NuevoAviso;
    const validacion = validarAviso(body);

    if ("error" in validacion) {
      return NextResponse.json(
        { error: validacion.error },
        { status: 400 }
      );
    }

    const { data: aviso, error: errorCreacion } =
      await supabaseAdmin
        .from("avisos")
        .insert({
          ...validacion.datos,
          autor_id: responsable.id,
          updated_at: new Date().toISOString(),
        })
        .select(
          "id, titulo, contenido, autor_id, tipo, destinatario, area_academica, ciclo, estado, created_at, updated_at"
        )
        .single();

    if (errorCreacion) {
      return NextResponse.json(
        {
          error: `No se pudo crear el aviso: ${errorCreacion.message}`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        mensaje: "Aviso creado correctamente.",
        aviso,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error al crear aviso:", error);

    return NextResponse.json(
      { error: "Ocurrio un error interno." },
      { status: 500 }
    );
  }
}
