import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import {
  obtenerIp,
  obtenerUserAgent,
  registrarAuditoria,
} from "@/lib/auditoria/registrarAuditoria";
import { supabaseAdmin } from "@/lib/supabase/admin";

type DatosAviso = {
  titulo?: string;
  contenido?: string;
  tipo?: string;
  destinatario?: string;
  area_academica?: string | null;
  ciclo?: string | null;
  estado?: boolean;
};

type ContextoRuta = {
  params: Promise<{
    id: string;
  }>;
};

type AvisoAnterior = {
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

async function obtenerGestorActivo(request: Request) {
  const usuarioAutenticado =
    await obtenerUsuarioAutenticado(request);

  if (!usuarioAutenticado) {
    return null;
  }

  const { data: responsable } = await supabaseAdmin
    .from("usuarios")
    .select("id, rol_id, estado")
    .eq("id", usuarioAutenticado.id)
    .in("rol_id", rolesGestionAvisos)
    .eq("estado", true)
    .maybeSingle();

  return responsable;
}

function validarDatosAviso(body: DatosAviso) {
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
      updated_at: new Date().toISOString(),
    },
  };
}

export async function PATCH(
  request: Request,
  contexto: ContextoRuta
) {
  try {
    const responsable = await obtenerGestorActivo(request);

    if (!responsable) {
      return NextResponse.json(
        {
          error:
            "Solo un administrador o profesor activo puede editar avisos.",
        },
        { status: 403 }
      );
    }

    const { id } = await contexto.params;
    const avisoId = Number(id);

    if (!Number.isInteger(avisoId) || avisoId <= 0) {
      return NextResponse.json(
        { error: "El aviso no es valido." },
        { status: 400 }
      );
    }

    const body = (await request.json()) as DatosAviso;
    const validacion = validarDatosAviso(body);

    if ("error" in validacion) {
      return NextResponse.json(
        { error: validacion.error },
        { status: 400 }
      );
    }

    const { data: avisoExistente } = await supabaseAdmin
      .from("avisos")
      .select(
        "id, titulo, contenido, autor_id, tipo, destinatario, area_academica, ciclo, estado, created_at, updated_at"
      )
      .eq("id", avisoId)
      .maybeSingle();

    if (!avisoExistente) {
      return NextResponse.json(
        { error: "El aviso no existe." },
        { status: 404 }
      );
    }

    const avisoAnterior = avisoExistente as AvisoAnterior;

    const { data: aviso, error: errorActualizacion } =
      await supabaseAdmin
        .from("avisos")
        .update(validacion.datos)
        .eq("id", avisoId)
        .select(
          "id, titulo, contenido, autor_id, tipo, destinatario, area_academica, ciclo, estado, created_at, updated_at"
        )
        .single();

    if (errorActualizacion) {
      return NextResponse.json(
        {
          error: `No se pudo actualizar el aviso: ${errorActualizacion.message}`,
        },
        { status: 400 }
      );
    }

    await registrarAuditoria({
      usuario_id: responsable.id,
      accion: "editar",
      modulo: "avisos",
      entidad_tipo: "aviso",
      entidad_id: String(aviso.id),
      descripcion: "Edito un aviso.",
      datos_anteriores: avisoAnterior,
      datos_nuevos: aviso,
      ip: obtenerIp(request),
      user_agent: obtenerUserAgent(request),
    });

    if (Boolean(avisoAnterior.estado) !== Boolean(aviso.estado)) {
      await registrarAuditoria({
        usuario_id: responsable.id,
        accion: aviso.estado ? "activar" : "desactivar",
        modulo: "avisos",
        entidad_tipo: "aviso",
        entidad_id: String(aviso.id),
        descripcion: aviso.estado
          ? "Activo un aviso."
          : "Desactivo un aviso.",
        datos_anteriores: { estado: avisoAnterior.estado },
        datos_nuevos: { estado: aviso.estado },
        ip: obtenerIp(request),
        user_agent: obtenerUserAgent(request),
      });
    }

    return NextResponse.json({
      mensaje: "Aviso actualizado correctamente.",
      aviso,
    });
  } catch (error) {
    console.error("Error al actualizar aviso:", error);

    return NextResponse.json(
      { error: "Ocurrio un error interno." },
      { status: 500 }
    );
  }
}
