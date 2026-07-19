import { createClient, type User } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/lib/supabase/admin";

export const tamanosPaginaPermitidos = [10, 20, 50] as const;
export type TamanoPagina = (typeof tamanosPaginaPermitidos)[number];

export type FiltrosHistorial = {
  fechaInicio: string | null;
  fechaFin: string | null;
  estudiante: string | null;
  dni: string | null;
  codigo: string | null;
  placa: string | null;
  responsable: string | null;
};

export type ParametrosHistorial = {
  page: number;
  pageSize: TamanoPagina;
  filtros: FiltrosHistorial;
};

export type UsuarioHistorial = {
  id: string;
  nombres: string;
  apellidos: string;
  dni: string;
  codigo_estudiante: string | null;
  tiene_foto: boolean;
  foto_version: string;
};

export type ResponsableHistorial = {
  id: string;
  nombres: string;
  apellidos: string;
};

export type VehiculoHistorial = {
  id: number;
  placa: string;
  marca: string | null;
  modelo: string | null;
  color: string;
  tipo: string;
  tiene_foto: boolean;
  foto_version: string;
};

export type RegistroHistorial = {
  id: number;
  fecha: string | null;
  hora: string | null;
  created_at: string;
  estudiante: UsuarioHistorial | null;
  vehiculo: VehiculoHistorial | null;
  responsable: ResponsableHistorial | null;
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

type UsuarioBase = {
  id: string;
  nombres: string;
  apellidos: string;
  dni: string;
  codigo_estudiante: string | null;
  foto: string | null;
};

type VehiculoBase = {
  id: number;
  placa: string;
  marca: string | null;
  modelo: string | null;
  color: string;
  tipo: string;
  foto: string | null;
};

type FiltrosResueltos = {
  fechaInicioIso: string | null;
  fechaFinExclusivaIso: string | null;
  idsEstudiantes: string[] | null;
  idsVehiculos: number[] | null;
  idsResponsables: string[] | null;
  sinResultados: boolean;
};

export class ErrorHistorial extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

async function obtenerUsuarioAutenticado(request: Request): Promise<User | null> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;

  const accessToken = authorization.replace("Bearer ", "").trim();
  if (!accessToken) return null;

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

export async function autorizarHistorial(request: Request) {
  const autenticado = await obtenerUsuarioAutenticado(request);
  if (!autenticado) {
    throw new ErrorHistorial("La sesion no es valida o ha vencido.", 401);
  }

  const { data: usuario, error } = await supabaseAdmin
    .from("usuarios")
    .select("id, rol_id, estado")
    .eq("id", autenticado.id)
    .eq("estado", true)
    .maybeSingle();

  if (error) {
    console.error("Error al validar acceso al historial:", error.message);
    throw new ErrorHistorial("No se pudo validar el acceso al historial.", 500);
  }

  if (!usuario || ![1, 2, 4].includes(Number(usuario.rol_id))) {
    throw new ErrorHistorial("No tienes permiso para ver el historial.", 403);
  }

  return { id: String(usuario.id), rol_id: Number(usuario.rol_id) };
}

function validarFecha(fecha: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const fechaUtc = new Date(`${fecha}T00:00:00.000Z`);
  return !Number.isNaN(fechaUtc.getTime()) && fechaUtc.toISOString().slice(0, 10) === fecha;
}

function obtenerDiaSiguiente(fecha: string) {
  const valor = new Date(`${fecha}T12:00:00.000Z`);
  valor.setUTCDate(valor.getUTCDate() + 1);
  return valor.toISOString().slice(0, 10);
}

function textoOpcional(url: URL, nombre: string, maximo: number) {
  const valor = url.searchParams.get(nombre)?.trim().replace(/\s+/g, " ") ?? "";
  if (valor.length > maximo) {
    throw new ErrorHistorial(`El filtro ${nombre} es demasiado largo.`, 400);
  }
  return valor || null;
}

export function validarParametrosHistorial(url: URL): ParametrosHistorial {
  const pageTexto = url.searchParams.get("page")?.trim() || "1";
  const pageSizeTexto = url.searchParams.get("pageSize")?.trim() || "20";
  const page = Number(pageTexto);
  const pageSizeNumero = Number(pageSizeTexto);

  if (!/^\d+$/.test(pageTexto) || !Number.isSafeInteger(page) || page < 1) {
    throw new ErrorHistorial("La pagina debe ser un entero positivo.", 400);
  }
  if (!tamanosPaginaPermitidos.some((valor) => valor === pageSizeNumero)) {
    throw new ErrorHistorial("La cantidad por pagina debe ser 10, 20 o 50.", 400);
  }

  const fechaInicio = textoOpcional(url, "fechaInicio", 10);
  const fechaFin = textoOpcional(url, "fechaFin", 10);
  const estudiante = textoOpcional(url, "estudiante", 80);
  const dni = textoOpcional(url, "dni", 8);
  const codigo = textoOpcional(url, "codigo", 30)?.toUpperCase() ?? null;
  const placa = textoOpcional(url, "placa", 12)?.toUpperCase() ?? null;
  const responsable = textoOpcional(url, "responsable", 80);

  if (fechaInicio && !validarFecha(fechaInicio)) {
    throw new ErrorHistorial("La fecha inicial no es valida.", 400);
  }
  if (fechaFin && !validarFecha(fechaFin)) {
    throw new ErrorHistorial("La fecha final no es valida.", 400);
  }
  if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
    throw new ErrorHistorial("La fecha inicial no puede ser posterior a la fecha final.", 400);
  }
  if (estudiante && (estudiante.length < 3 || !/^[\p{L}\p{M} .'-]+$/u.test(estudiante))) {
    throw new ErrorHistorial("El nombre del estudiante debe tener al menos 3 caracteres validos.", 400);
  }
  if (responsable && (responsable.length < 3 || !/^[\p{L}\p{M} .'-]+$/u.test(responsable))) {
    throw new ErrorHistorial("El responsable debe tener al menos 3 caracteres validos.", 400);
  }
  if (dni && !/^\d{1,8}$/.test(dni)) {
    throw new ErrorHistorial("El DNI solo puede contener hasta 8 numeros.", 400);
  }
  if (codigo && !/^[A-Z0-9_-]+$/.test(codigo)) {
    throw new ErrorHistorial("El codigo institucional contiene caracteres no validos.", 400);
  }
  if (placa && !/^[A-Z0-9-]+$/.test(placa)) {
    throw new ErrorHistorial("La placa contiene caracteres no validos.", 400);
  }

  return {
    page,
    pageSize: pageSizeNumero as TamanoPagina,
    filtros: { fechaInicio, fechaFin, estudiante, dni, codigo, placa, responsable },
  };
}

function palabrasNombre(nombre: string) {
  return nombre.split(" ").filter(Boolean);
}

async function buscarIdsUsuarios(
  nombre: string | null,
  opciones: { rolEstudiante?: boolean; rolesResponsable?: boolean; dni?: string | null; codigo?: string | null }
) {
  let consulta = supabaseAdmin.from("usuarios").select("id");
  if (opciones.rolEstudiante) consulta = consulta.eq("rol_id", 5);
  if (opciones.rolesResponsable) consulta = consulta.in("rol_id", [1, 4]);
  if (opciones.dni) consulta = consulta.eq("dni", opciones.dni);
  if (opciones.codigo) consulta = consulta.eq("codigo_estudiante", opciones.codigo);

  if (nombre) {
    for (const palabra of palabrasNombre(nombre)) {
      consulta = consulta.or(`nombres.ilike.%${palabra}%,apellidos.ilike.%${palabra}%`);
    }
  }

  const { data, error } = await consulta.range(0, 500);
  if (error) {
    console.error("Error al resolver usuarios del historial:", error.message);
    throw new ErrorHistorial("No se pudieron aplicar los filtros de usuario.", 500);
  }
  if ((data ?? []).length > 500) {
    throw new ErrorHistorial("El filtro de nombre es muy amplio. Ingresa mas datos.", 400);
  }
  return (data ?? []).map((usuario) => String(usuario.id));
}

export async function resolverFiltros(filtros: FiltrosHistorial): Promise<FiltrosResueltos> {
  const requiereEstudiantes = Boolean(filtros.estudiante || filtros.dni || filtros.codigo);
  const idsEstudiantes = requiereEstudiantes
    ? await buscarIdsUsuarios(filtros.estudiante, {
        rolEstudiante: true,
        dni: filtros.dni,
        codigo: filtros.codigo,
      })
    : null;

  let idsVehiculos: number[] | null = null;
  if (filtros.placa) {
    const { data, error } = await supabaseAdmin
      .from("vehiculos")
      .select("id")
      .eq("placa", filtros.placa)
      .range(0, 50);
    if (error) {
      console.error("Error al resolver placa del historial:", error.message);
      throw new ErrorHistorial("No se pudo aplicar el filtro de placa.", 500);
    }
    idsVehiculos = (data ?? []).map((vehiculo) => Number(vehiculo.id));
  }

  const idsResponsables = filtros.responsable
    ? await buscarIdsUsuarios(filtros.responsable, { rolesResponsable: true })
    : null;

  return {
    fechaInicioIso: filtros.fechaInicio ? `${filtros.fechaInicio}T00:00:00-05:00` : null,
    fechaFinExclusivaIso: filtros.fechaFin
      ? `${obtenerDiaSiguiente(filtros.fechaFin)}T00:00:00-05:00`
      : null,
    idsEstudiantes,
    idsVehiculos,
    idsResponsables,
    sinResultados:
      idsEstudiantes?.length === 0 ||
      idsVehiculos?.length === 0 ||
      idsResponsables?.length === 0,
  };
}

function aplicarFiltros<T>(consulta: T, filtros: FiltrosResueltos): T {
  let resultado = consulta as T & {
    gte: (campo: string, valor: string) => typeof resultado;
    lt: (campo: string, valor: string) => typeof resultado;
    in: (campo: string, valores: readonly (string | number)[]) => typeof resultado;
  };
  if (filtros.fechaInicioIso) resultado = resultado.gte("created_at", filtros.fechaInicioIso);
  if (filtros.fechaFinExclusivaIso) resultado = resultado.lt("created_at", filtros.fechaFinExclusivaIso);
  if (filtros.idsEstudiantes) resultado = resultado.in("estudiante_id", filtros.idsEstudiantes);
  if (filtros.idsVehiculos) resultado = resultado.in("vehiculo_id", filtros.idsVehiculos);
  if (filtros.idsResponsables) resultado = resultado.in("garita_id", filtros.idsResponsables);
  return resultado as T;
}

async function enriquecerRegistros(registros: SalidaBase[]): Promise<RegistroHistorial[]> {
  if (registros.length === 0) return [];
  const idsUsuarios = Array.from(new Set(registros.flatMap((salida) => [salida.estudiante_id, salida.garita_id])));
  const idsVehiculos = Array.from(new Set(registros.map((salida) => salida.vehiculo_id)));
  const [respuestaUsuarios, respuestaVehiculos] = await Promise.all([
    supabaseAdmin
      .from("usuarios")
      .select("id, nombres, apellidos, dni, codigo_estudiante, foto")
      .in("id", idsUsuarios)
      .range(0, idsUsuarios.length - 1),
    supabaseAdmin
      .from("vehiculos")
      .select("id, placa, marca, modelo, color, tipo, foto")
      .in("id", idsVehiculos)
      .range(0, idsVehiculos.length - 1),
  ]);

  if (respuestaUsuarios.error || respuestaVehiculos.error) {
    if (respuestaUsuarios.error) console.error("Error al enriquecer usuarios:", respuestaUsuarios.error.message);
    if (respuestaVehiculos.error) console.error("Error al enriquecer vehiculos:", respuestaVehiculos.error.message);
    throw new ErrorHistorial("No se pudo preparar la informacion del historial.", 500);
  }

  const usuarios = new Map(((respuestaUsuarios.data ?? []) as UsuarioBase[]).map((usuario) => [usuario.id, usuario]));
  const vehiculos = new Map(((respuestaVehiculos.data ?? []) as VehiculoBase[]).map((vehiculo) => [vehiculo.id, vehiculo]));
  const version = String(Date.now());

  return registros.map((salida) => {
    const estudiante = usuarios.get(salida.estudiante_id);
    const responsable = usuarios.get(salida.garita_id);
    const vehiculo = vehiculos.get(salida.vehiculo_id);
    return {
      id: salida.id,
      fecha: salida.fecha,
      hora: salida.hora,
      created_at: salida.created_at,
      estudiante: estudiante
        ? {
            id: estudiante.id,
            nombres: estudiante.nombres,
            apellidos: estudiante.apellidos,
            dni: estudiante.dni,
            codigo_estudiante: estudiante.codigo_estudiante,
            tiene_foto: Boolean(estudiante.foto),
            foto_version: estudiante.foto ? version : "",
          }
        : null,
      responsable: responsable
        ? { id: responsable.id, nombres: responsable.nombres, apellidos: responsable.apellidos }
        : null,
      vehiculo: vehiculo
        ? {
            id: vehiculo.id,
            placa: vehiculo.placa,
            marca: vehiculo.marca,
            modelo: vehiculo.modelo,
            color: vehiculo.color,
            tipo: vehiculo.tipo,
            tiene_foto: Boolean(vehiculo.foto),
            foto_version: vehiculo.foto ? version : "",
          }
        : null,
    };
  });
}

function consultaOrdenada(conteo: "exact" | undefined = undefined) {
  return supabaseAdmin
    .from("salidas")
    .select("id, vehiculo_id, estudiante_id, garita_id, fecha, hora, created_at", conteo ? { count: conteo } : undefined)
    .order("fecha", { ascending: false, nullsFirst: false })
    .order("hora", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
}

export async function consultarPaginaHistorial(parametros: ParametrosHistorial) {
  const filtros = await resolverFiltros(parametros.filtros);
  if (filtros.sinResultados) {
    return { registros: [], total: 0, page: parametros.page, pageSize: parametros.pageSize, totalPages: 0 };
  }

  const desde = (parametros.page - 1) * parametros.pageSize;
  const hasta = desde + parametros.pageSize - 1;
  const consulta = aplicarFiltros(consultaOrdenada("exact"), filtros).range(desde, hasta);
  const { data, error, count } = await consulta;
  if (error) {
    console.error("Error al consultar pagina del historial:", error.message);
    throw new ErrorHistorial("No se pudo cargar el historial.", 500);
  }

  const total = count ?? 0;
  return {
    registros: await enriquecerRegistros((data ?? []) as SalidaBase[]),
    total,
    page: parametros.page,
    pageSize: parametros.pageSize,
    totalPages: total === 0 ? 0 : Math.ceil(total / parametros.pageSize),
  };
}

export async function contarHistorial(filtrosEntrada: FiltrosHistorial) {
  const filtros = await resolverFiltros(filtrosEntrada);
  if (filtros.sinResultados) return { total: 0, filtros };
  const { count, error } = await aplicarFiltros(consultaOrdenada("exact"), filtros).range(0, 0);
  if (error) {
    console.error("Error al contar exportacion de historial:", error.message);
    throw new ErrorHistorial("No se pudo preparar la exportacion.", 500);
  }
  return { total: count ?? 0, filtros };
}

export async function consultarLoteHistorial(filtros: FiltrosResueltos, desde: number, limite: number) {
  const hasta = desde + limite - 1;
  const { data, error } = await aplicarFiltros(consultaOrdenada(), filtros).range(desde, hasta);
  if (error) {
    console.error("Error al consultar lote de historial:", error.message);
    throw new ErrorHistorial("No se pudo generar la exportacion.", 500);
  }
  return enriquecerRegistros((data ?? []) as SalidaBase[]);
}
