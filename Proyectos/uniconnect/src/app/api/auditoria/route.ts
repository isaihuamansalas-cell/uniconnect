import { createClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import {
  type DatosAuditoria,
  sanitizarDatos,
} from "@/lib/auditoria/registrarAuditoria";
import { supabaseAdmin } from "@/lib/supabase/admin";

type UsuarioActivo = {
  id: string;
  rol_id: number;
  estado: boolean;
};

type AuditoriaRegistro = {
  id: number;
  usuario_id: string;
  accion: string;
  modulo: string;
  entidad_tipo: string;
  entidad_id: string | null;
  descripcion: string;
  datos_anteriores: DatosAuditoria | null;
  datos_nuevos: DatosAuditoria | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
};

type ResponsableAuditoria = {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
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

async function obtenerGestorAuditoria(request: Request) {
  const user = await obtenerUsuarioAutenticado(request);

  if (!user) {
    return null;
  }

  const { data: usuario } = await supabaseAdmin
    .from("usuarios")
    .select("id, rol_id, estado")
    .eq("id", user.id)
    .in("rol_id", [1, 2])
    .eq("estado", true)
    .maybeSingle();

  return usuario as UsuarioActivo | null;
}

function normalizarLimite(valor: string | null) {
  const limite = Number(valor ?? "50");

  if (!Number.isInteger(limite) || limite < 1) {
    return 50;
  }

  return Math.min(limite, 100);
}

function normalizarPagina(valor: string | null) {
  const pagina = Number(valor ?? "1");

  if (!Number.isInteger(pagina) || pagina < 1) {
    return 1;
  }

  return pagina;
}

export async function GET(request: Request) {
  try {
    const gestor = await obtenerGestorAuditoria(request);

    if (!gestor) {
      return NextResponse.json(
        { error: "No tienes permiso para consultar auditoria." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get("fecha_inicio");
    const fechaFin = searchParams.get("fecha_fin");
    const usuarioId = searchParams.get("usuario_id");
    const modulo = searchParams.get("modulo");
    const accion = searchParams.get("accion");
    const limite = normalizarLimite(searchParams.get("limite"));
    const pagina = normalizarPagina(searchParams.get("pagina"));
    const desde = (pagina - 1) * limite;
    const hasta = desde + limite - 1;

    let consulta = supabaseAdmin
      .from("auditoria")
      .select(
        "id, usuario_id, accion, modulo, entidad_tipo, entidad_id, descripcion, datos_anteriores, datos_nuevos, ip, user_agent, created_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(desde, hasta);

    if (fechaInicio) {
      consulta = consulta.gte(
        "created_at",
        new Date(`${fechaInicio}T00:00:00`).toISOString()
      );
    }

    if (fechaFin) {
      consulta = consulta.lte(
        "created_at",
        new Date(`${fechaFin}T23:59:59`).toISOString()
      );
    }

    if (usuarioId) {
      consulta = consulta.eq("usuario_id", usuarioId);
    }

    if (modulo) {
      consulta = consulta.eq("modulo", modulo);
    }

    if (accion) {
      consulta = consulta.eq("accion", accion);
    }

    const { data, error, count } = await consulta;

    if (error) {
      return NextResponse.json(
        { error: `No se pudo cargar auditoria: ${error.message}` },
        { status: 400 }
      );
    }

    const registros = (data ?? []) as AuditoriaRegistro[];
    const usuariosIds = Array.from(
      new Set(registros.map((registro) => registro.usuario_id))
    );

    const { data: responsables, error: errorResponsables } =
      usuariosIds.length > 0
        ? await supabaseAdmin
            .from("usuarios")
            .select("id, nombres, apellidos, correo")
            .in("id", usuariosIds)
        : { data: [], error: null };

    if (errorResponsables) {
      return NextResponse.json(
        { error: "No se pudieron cargar responsables." },
        { status: 400 }
      );
    }

    const responsablesPorId = new Map(
      ((responsables ?? []) as ResponsableAuditoria[]).map(
        (responsable) => [responsable.id, responsable]
      )
    );

    return NextResponse.json({
      auditorias: registros.map((registro) => ({
        ...registro,
        datos_anteriores: sanitizarDatos(
          registro.datos_anteriores ?? undefined
        ),
        datos_nuevos: sanitizarDatos(
          registro.datos_nuevos ?? undefined
        ),
        usuario: responsablesPorId.get(registro.usuario_id) ?? null,
      })),
      total: count ?? 0,
      pagina,
      limite,
    });
  } catch (error) {
    console.error("Error al consultar auditoria:", error);

    return NextResponse.json(
      { error: "Ocurrio un error interno." },
      { status: 500 }
    );
  }
}
