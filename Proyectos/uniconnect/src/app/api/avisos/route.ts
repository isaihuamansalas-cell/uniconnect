import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { respuestaErrorApi } from "@/lib/api/respuestas";

import {
  obtenerIp,
  obtenerUserAgent,
  registrarAuditoria,
} from "@/lib/auditoria/registrarAuditoria";
import { crearNotificaciones } from "@/lib/notificaciones/crearNotificacion";
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

type UsuarioNotificacion = {
  id: string;
};

const rolesGestionAvisos = [1, 3];
const destinatariosPermitidos = [
  "Todos",
  "Area academica",
  "Ciclo especifico",
];
const tamanosPaginaPermitidos = [10, 20, 50] as const;

function parametroTexto(url: URL, nombre: string, maximo: number) {
  return (url.searchParams.get(nombre)?.trim() ?? "").slice(0, maximo);
}

function parametrosListado(url: URL) {
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "10");
  if (!Number.isSafeInteger(page) || page < 1) return null;
  if (!tamanosPaginaPermitidos.includes(pageSize as 10 | 20 | 50)) return null;
  const estado = parametroTexto(url, "estado", 10).toLowerCase();
  if (estado && !["todos", "activo", "inactivo"].includes(estado)) return null;
  return {
    page,
    pageSize: pageSize as 10 | 20 | 50,
    titulo: parametroTexto(url, "titulo", 100),
    contenido: parametroTexto(url, "contenido", 200),
    autor: parametroTexto(url, "autor", 100),
    tipo: parametroTexto(url, "tipo", 50),
    destinatario: parametroTexto(url, "destinatario", 50),
    estado,
  };
}

async function idsAutoresCoincidentes(texto: string) {
  if (!texto) return null;
  const seguro = texto.replace(/[,().%_]/g, " ").replace(/\s+/g, " ").trim();
  if (!seguro) return [];
  const { data, error } = await supabaseAdmin
    .from("usuarios")
    .select("id")
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

    const parametros = parametrosListado(new URL(request.url));
    if (!parametros) {
      return NextResponse.json({ error: "Los parametros de paginacion o filtros no son validos." }, { status: 400 });
    }

    const autoresFiltrados = await idsAutoresCoincidentes(parametros.autor);
    if (autoresFiltrados?.length === 0) {
      return NextResponse.json({
        avisos: [], puedeGestionar: rolesGestionAvisos.includes(Number(responsable.rol_id)),
        page: parametros.page, pageSize: parametros.pageSize, total: 0, totalPages: 0,
      });
    }

    let consulta = supabaseAdmin
      .from("avisos")
      .select(
        "id, titulo, contenido, autor_id, tipo, destinatario, area_academica, ciclo, estado, created_at, updated_at",
        { count: "exact" }
      );
    if (parametros.titulo) consulta = consulta.ilike("titulo", `%${parametros.titulo}%`);
    if (parametros.contenido) consulta = consulta.ilike("contenido", `%${parametros.contenido}%`);
    if (parametros.tipo) consulta = consulta.eq("tipo", parametros.tipo);
    if (parametros.destinatario) consulta = consulta.eq("destinatario", parametros.destinatario);
    if (parametros.estado === "activo") consulta = consulta.eq("estado", true);
    if (parametros.estado === "inactivo") consulta = consulta.eq("estado", false);
    if (autoresFiltrados) consulta = consulta.in("autor_id", autoresFiltrados);

    const desde = (parametros.page - 1) * parametros.pageSize;
    const { data: avisos, error: errorAvisos, count } = await consulta
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(desde, desde + parametros.pageSize - 1);

    if (errorAvisos) {
      return respuestaErrorApi("listar avisos", errorAvisos, "No se pudo cargar la informacion.");
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
      page: parametros.page,
      pageSize: parametros.pageSize,
      total: count ?? 0,
      totalPages: count ? Math.ceil(count / parametros.pageSize) : 0,
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
      return respuestaErrorApi("crear aviso", errorCreacion, "No se pudo guardar el registro.");
    }

    if (validacion.datos.destinatario === "Todos") {
      const { data: usuariosActivos, error: errorUsuarios } =
        await supabaseAdmin
          .from("usuarios")
          .select("id")
          .eq("estado", true);

      if (errorUsuarios) {
        console.error(
          "No se pudieron consultar usuarios para notificaciones:",
          errorUsuarios.message
        );
      } else {
        const usuarios =
          (usuariosActivos ?? []) as UsuarioNotificacion[];

        await crearNotificaciones(
          usuarios.map((usuario) => ({
            usuario_id: usuario.id,
            titulo: "Nuevo aviso publicado",
            mensaje: aviso.titulo,
            tipo: "aviso",
            ruta: "/avisos",
            entidad_tipo: "aviso",
            entidad_id: String(aviso.id),
          }))
        );
      }
    }

    await registrarAuditoria({
      usuario_id: responsable.id,
      accion: "crear",
      modulo: "avisos",
      entidad_tipo: "aviso",
      entidad_id: String(aviso.id),
      descripcion: "Creo un aviso.",
      datos_nuevos: aviso,
      ip: obtenerIp(request),
      user_agent: obtenerUserAgent(request),
    });

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
