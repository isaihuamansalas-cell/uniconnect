import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { respuestaErrorApi } from "@/lib/api/respuestas";

import {
  obtenerIp,
  obtenerUserAgent,
  registrarAuditoria,
} from "@/lib/auditoria/registrarAuditoria";
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
const tamanosPaginaPermitidos = [10, 20, 50] as const;

function parametrosListado(url: URL) {
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "10");
  const estado = (url.searchParams.get("estado")?.trim() ?? "").toLowerCase();
  if (!Number.isSafeInteger(page) || page < 1) return null;
  if (!tamanosPaginaPermitidos.includes(pageSize as 10 | 20 | 50)) return null;
  if (estado && !["todos", "activo", "inactivo"].includes(estado)) return null;
  return {
    page,
    pageSize: pageSize as 10 | 20 | 50,
    titulo: (url.searchParams.get("titulo")?.trim() ?? "").slice(0, 100),
    autor: (url.searchParams.get("autor")?.trim() ?? "").slice(0, 100),
    estado,
  };
}

async function idsAutoresCoincidentes(texto: string) {
  if (!texto) return null;
  const seguro = texto.replace(/[,().%_]/g, " ").replace(/\s+/g, " ").trim();
  if (!seguro) return [];
  const { data, error } = await supabaseAdmin
    .from("usuarios").select("id")
    .or(`nombres.ilike.%${seguro}%,apellidos.ilike.%${seguro}%`)
    .range(0, 499);
  if (error) throw error;
  return (data ?? []).map((autor) => String(autor.id));
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

    const parametros = parametrosListado(new URL(request.url));
    if (!parametros) {
      return NextResponse.json({ error: "Los parametros de paginacion o filtros no son validos." }, { status: 400 });
    }
    const autoresFiltrados = await idsAutoresCoincidentes(parametros.autor);
    if (autoresFiltrados?.length === 0) {
      return NextResponse.json({
        emprendimientos: [], puedeGestionar: rolesGestionEmprendimientos.includes(Number(usuario.rol_id)),
        page: parametros.page, pageSize: parametros.pageSize, total: 0, totalPages: 0,
      });
    }
    let consulta = supabaseAdmin
      .from("emprendimientos")
      .select(
        "id, titulo, descripcion, autor_id, foto, estado, created_at, updated_at",
        { count: "exact" }
      );
    if (parametros.titulo) consulta = consulta.ilike("titulo", `%${parametros.titulo}%`);
    if (parametros.estado === "activo") consulta = consulta.eq("estado", true);
    if (parametros.estado === "inactivo") consulta = consulta.eq("estado", false);
    if (autoresFiltrados) consulta = consulta.in("autor_id", autoresFiltrados);
    const desde = (parametros.page - 1) * parametros.pageSize;
    const { data: emprendimientos, error: errorEmprendimientos, count } = await consulta
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(desde, desde + parametros.pageSize - 1);

    if (errorEmprendimientos) {
      return respuestaErrorApi("listar emprendimientos", errorEmprendimientos, "No se pudo cargar la informacion.");
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
      page: parametros.page,
      pageSize: parametros.pageSize,
      total: count ?? 0,
      totalPages: count ? Math.ceil(count / parametros.pageSize) : 0,
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
      return respuestaErrorApi("crear emprendimiento", errorCreacion, "No se pudo guardar el registro.");
    }

    await registrarAuditoria({
      usuario_id: usuario.id,
      accion: "crear",
      modulo: "emprendimientos",
      entidad_tipo: "emprendimiento",
      entidad_id: String(emprendimiento.id),
      descripcion: "Creo un emprendimiento.",
      datos_nuevos: emprendimiento,
      ip: obtenerIp(request),
      user_agent: obtenerUserAgent(request),
    });

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
