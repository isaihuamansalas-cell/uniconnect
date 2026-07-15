import { createClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";

type UsuarioActivo = {
  id: string;
  rol_id: number;
  estado: boolean;
};

type EstadisticaDashboard = {
  id: string;
  titulo: string;
  valor: number;
};

type PuntoGrafico = {
  etiqueta: string;
  valor: number;
};

type ActividadDashboard = {
  id: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  tipo: string;
  ruta: string;
};

type RespuestaDashboard = {
  rol_id: number;
  estadisticas: EstadisticaDashboard[];
  graficos: {
    salidasUltimos7Dias?: PuntoGrafico[];
    vehiculosPorTipo?: PuntoGrafico[];
    usuariosPorRol?: PuntoGrafico[];
    avisosEmprendimientos?: PuntoGrafico[];
  };
  actividad: {
    salidas?: ActividadDashboard[];
    avisos?: ActividadDashboard[];
    emprendimientos?: ActividadDashboard[];
    auditoria?: ActividadDashboard[];
  };
  errores: string[];
};

type SalidaActividad = {
  id: number;
  vehiculo_id: number;
  estudiante_id: string;
  garita_id: string;
  created_at: string;
};

type VehiculoResumen = {
  id: number;
  placa: string;
  tipo: string;
};

type AvisoActividad = {
  id: number;
  titulo: string;
  tipo: string;
  created_at: string;
};

type EmprendimientoActividad = {
  id: number;
  titulo: string;
  created_at: string;
};

type AuditoriaActividad = {
  id: number;
  accion: string;
  modulo: string;
  descripcion: string;
  created_at: string;
};

const nombresRoles: Record<number, string> = {
  1: "Administrador",
  2: "Director",
  3: "Profesor",
  4: "Garita",
  5: "Estudiante",
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

async function intentar<T>(
  errores: string[],
  mensaje: string,
  operacion: () => Promise<T>,
  fallback: T
) {
  try {
    return await operacion();
  } catch (error) {
    console.error(mensaje, error);
    errores.push(mensaje);
    return fallback;
  }
}

async function contarActivos(tabla: string) {
  const { count, error } = await supabaseAdmin
    .from(tabla)
    .select("id", { count: "exact", head: true })
    .eq("estado", true);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

function rangoHoy() {
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 1);

  return {
    inicio: inicio.toISOString(),
    fin: fin.toISOString(),
  };
}

async function contarSalidasHoy() {
  const { inicio, fin } = rangoHoy();
  const { count, error } = await supabaseAdmin
    .from("salidas")
    .select("id", { count: "exact", head: true })
    .gte("created_at", inicio)
    .lt("created_at", fin);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function contarNotificacionesNoLeidas(usuarioId: string) {
  const { count, error } = await supabaseAdmin
    .from("notificaciones")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", usuarioId)
    .eq("leida", false);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function obtenerSalidasUltimos7Dias() {
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  inicio.setDate(inicio.getDate() - 6);

  const { data, error } = await supabaseAdmin
    .from("salidas")
    .select("created_at")
    .gte("created_at", inicio.toISOString());

  if (error) {
    throw new Error(error.message);
  }

  const dias = Array.from({ length: 7 }, (_, indice) => {
    const fecha = new Date(inicio);
    fecha.setDate(inicio.getDate() + indice);
    return {
      clave: fecha.toISOString().slice(0, 10),
      etiqueta: new Intl.DateTimeFormat("es-PE", {
        weekday: "short",
      }).format(fecha),
      valor: 0,
    };
  });

  const porDia = new Map(dias.map((dia) => [dia.clave, dia]));

  (data ?? []).forEach((salida) => {
    const clave = String(salida.created_at).slice(0, 10);
    const dia = porDia.get(clave);

    if (dia) {
      dia.valor += 1;
    }
  });

  return dias.map(({ etiqueta, valor }) => ({ etiqueta, valor }));
}

async function agruparActivosPorCampo(
  tabla: string,
  campo: string
): Promise<PuntoGrafico[]> {
  const { data, error } = await supabaseAdmin
    .from(tabla)
    .select(campo)
    .eq("estado", true);

  if (error) {
    throw new Error(error.message);
  }

  const conteos = new Map<string, number>();

  (data ?? []).forEach((fila) => {
    const registro = fila as unknown as Record<
      string,
      string | number | null
    >;
    const valor = registro[campo];
    const etiqueta = valor ? String(valor) : "Sin dato";
    conteos.set(etiqueta, (conteos.get(etiqueta) ?? 0) + 1);
  });

  return Array.from(conteos.entries()).map(([etiqueta, valor]) => ({
    etiqueta,
    valor,
  }));
}

async function obtenerSalidasRecientes() {
  const { data: salidas, error } = await supabaseAdmin
    .from("salidas")
    .select("id, vehiculo_id, estudiante_id, garita_id, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    throw new Error(error.message);
  }

  const registros = (salidas ?? []) as SalidaActividad[];
  const vehiculosIds = registros.map((salida) => salida.vehiculo_id);
  const { data: vehiculos } =
    vehiculosIds.length > 0
      ? await supabaseAdmin
          .from("vehiculos")
          .select("id, placa, tipo")
          .in("id", vehiculosIds)
      : { data: [] };

  const vehiculosPorId = new Map(
    ((vehiculos ?? []) as VehiculoResumen[]).map((vehiculo) => [
      vehiculo.id,
      vehiculo,
    ])
  );

  return registros.map((salida) => {
    const vehiculo = vehiculosPorId.get(salida.vehiculo_id);

    return {
      id: String(salida.id),
      titulo: "Salida registrada",
      descripcion: vehiculo
        ? `${vehiculo.tipo} ${vehiculo.placa}`
        : "Vehiculo no disponible",
      fecha: salida.created_at,
      tipo: "salida",
      ruta: "/historial",
    };
  });
}

async function obtenerAvisosRecientes() {
  const { data, error } = await supabaseAdmin
    .from("avisos")
    .select("id, titulo, tipo, created_at")
    .eq("estado", true)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as AvisoActividad[]).map((aviso) => ({
    id: String(aviso.id),
    titulo: aviso.titulo,
    descripcion: aviso.tipo,
    fecha: aviso.created_at,
    tipo: "aviso",
    ruta: "/avisos",
  }));
}

async function obtenerEmprendimientosRecientes() {
  const { data, error } = await supabaseAdmin
    .from("emprendimientos")
    .select("id, titulo, created_at")
    .eq("estado", true)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as EmprendimientoActividad[]).map(
    (emprendimiento) => ({
      id: String(emprendimiento.id),
      titulo: emprendimiento.titulo,
      descripcion: "Emprendimiento activo",
      fecha: emprendimiento.created_at,
      tipo: "emprendimiento",
      ruta: "/emprendimientos",
    })
  );
}

async function obtenerAuditoriaReciente() {
  const { data, error } = await supabaseAdmin
    .from("auditoria")
    .select("id, accion, modulo, descripcion, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as AuditoriaActividad[]).map((registro) => ({
    id: String(registro.id),
    titulo: `${registro.modulo} · ${registro.accion}`,
    descripcion: registro.descripcion,
    fecha: registro.created_at,
    tipo: "auditoria",
    ruta: "/auditoria",
  }));
}

export async function GET(request: Request) {
  const errores: string[] = [];

  try {
    const usuario = await obtenerUsuarioActivo(request);

    if (!usuario) {
      return NextResponse.json(
        { error: "La sesion no es valida o ha vencido." },
        { status: 401 }
      );
    }

    const rolId = Number(usuario.rol_id);
    const respuesta: RespuestaDashboard = {
      rol_id: rolId,
      estadisticas: [],
      graficos: {},
      actividad: {},
      errores,
    };

    const esAdminDirector = rolId === 1 || rolId === 2;
    const esProfesor = rolId === 3;
    const esGarita = rolId === 4;
    const esEstudiante = rolId === 5;

    const notificacionesNoLeidas = await intentar(
      errores,
      "No se pudo cargar notificaciones no leidas.",
      () => contarNotificacionesNoLeidas(usuario.id),
      0
    );

    if (esAdminDirector || esProfesor) {
      const [
        usuariosActivos,
        vehiculosActivos,
        salidasHoy,
        avisosActivos,
        emprendimientosActivos,
      ] = await Promise.all([
        intentar(errores, "No se pudo contar usuarios activos.", () =>
          contarActivos("usuarios")
        , 0),
        intentar(errores, "No se pudo contar vehiculos activos.", () =>
          contarActivos("vehiculos")
        , 0),
        intentar(errores, "No se pudo contar salidas de hoy.", contarSalidasHoy, 0),
        intentar(errores, "No se pudo contar avisos activos.", () =>
          contarActivos("avisos")
        , 0),
        intentar(errores, "No se pudo contar emprendimientos activos.", () =>
          contarActivos("emprendimientos")
        , 0),
      ]);

      respuesta.estadisticas.push(
        { id: "usuarios", titulo: "Usuarios activos", valor: usuariosActivos },
        { id: "vehiculos", titulo: "Vehiculos activos", valor: vehiculosActivos },
        { id: "salidas", titulo: "Salidas hoy", valor: salidasHoy },
        { id: "avisos", titulo: "Avisos activos", valor: avisosActivos },
        {
          id: "emprendimientos",
          titulo: "Emprendimientos activos",
          valor: emprendimientosActivos,
        },
        {
          id: "notificaciones",
          titulo: "Notificaciones sin leer",
          valor: notificacionesNoLeidas,
        }
      );

      respuesta.graficos.salidasUltimos7Dias = await intentar(
        errores,
        "No se pudo cargar salidas de los ultimos 7 dias.",
        obtenerSalidasUltimos7Dias,
        []
      );
      respuesta.graficos.vehiculosPorTipo = await intentar(
        errores,
        "No se pudo cargar vehiculos por tipo.",
        () => agruparActivosPorCampo("vehiculos", "tipo"),
        []
      );
      respuesta.graficos.usuariosPorRol = (
        await intentar(
          errores,
          "No se pudo cargar usuarios por rol.",
          () => agruparActivosPorCampo("usuarios", "rol_id"),
          []
        )
      ).map((punto) => ({
        ...punto,
        etiqueta: nombresRoles[Number(punto.etiqueta)] ?? punto.etiqueta,
      }));
      respuesta.graficos.avisosEmprendimientos = [
        { etiqueta: "Avisos", valor: avisosActivos },
        { etiqueta: "Emprendimientos", valor: emprendimientosActivos },
      ];
    }

    if (esGarita) {
      const [vehiculosActivos, salidasHoy] = await Promise.all([
        intentar(errores, "No se pudo contar vehiculos activos.", () =>
          contarActivos("vehiculos")
        , 0),
        intentar(errores, "No se pudo contar salidas de hoy.", contarSalidasHoy, 0),
      ]);

      respuesta.estadisticas.push(
        { id: "vehiculos", titulo: "Vehiculos activos", valor: vehiculosActivos },
        { id: "salidas", titulo: "Salidas hoy", valor: salidasHoy },
        {
          id: "notificaciones",
          titulo: "Notificaciones sin leer",
          valor: notificacionesNoLeidas,
        }
      );
    }

    if (esEstudiante) {
      const [avisosActivos, emprendimientosActivos] = await Promise.all([
        intentar(errores, "No se pudo contar avisos activos.", () =>
          contarActivos("avisos")
        , 0),
        intentar(errores, "No se pudo contar emprendimientos activos.", () =>
          contarActivos("emprendimientos")
        , 0),
      ]);

      respuesta.estadisticas.push(
        { id: "avisos", titulo: "Avisos activos", valor: avisosActivos },
        {
          id: "emprendimientos",
          titulo: "Emprendimientos activos",
          valor: emprendimientosActivos,
        },
        {
          id: "notificaciones",
          titulo: "Notificaciones sin leer",
          valor: notificacionesNoLeidas,
        }
      );
      respuesta.graficos.avisosEmprendimientos = [
        { etiqueta: "Avisos", valor: avisosActivos },
        { etiqueta: "Emprendimientos", valor: emprendimientosActivos },
      ];
    }

    if (esAdminDirector || esGarita) {
      respuesta.actividad.salidas = await intentar(
        errores,
        "No se pudo cargar salidas recientes.",
        obtenerSalidasRecientes,
        []
      );
    }

    if (!esGarita || rolId === 4) {
      respuesta.actividad.avisos = await intentar(
        errores,
        "No se pudo cargar avisos recientes.",
        obtenerAvisosRecientes,
        []
      );
    }

    if (!esGarita) {
      respuesta.actividad.emprendimientos = await intentar(
        errores,
        "No se pudo cargar emprendimientos recientes.",
        obtenerEmprendimientosRecientes,
        []
      );
    }

    if (esAdminDirector) {
      respuesta.actividad.auditoria = await intentar(
        errores,
        "No se pudo cargar auditoria reciente.",
        obtenerAuditoriaReciente,
        []
      );
    }

    return NextResponse.json(respuesta);
  } catch (error) {
    console.error("Error al cargar dashboard:", error);

    return NextResponse.json(
      { error: "Ocurrio un error interno." },
      { status: 500 }
    );
  }
}
