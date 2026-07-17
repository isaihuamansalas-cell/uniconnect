import { createClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";

type UsuarioActivo = {
  id: string;
  rol_id: number;
  estado: boolean;
};

type UsuarioBusqueda = {
  id: string;
  nombres: string;
  apellidos: string;
  dni: string;
  codigo_estudiante: string | null;
  rol_id: number;
};

type PropietarioVehiculo = {
  nombres: string;
  apellidos: string;
};

type VehiculoBusqueda = {
  id: number;
  placa: string;
  marca: string | null;
  modelo: string | null;
  usuarios: PropietarioVehiculo | PropietarioVehiculo[] | null;
};

type AvisoBusqueda = {
  id: number;
  titulo: string;
  contenido: string;
  tipo: string;
};

type EmprendimientoBusqueda = {
  id: number;
  titulo: string;
  descripcion: string;
  autor_id: string;
};

type AutorBusqueda = {
  id: string;
  nombres: string;
  apellidos: string;
};

type ModuloBusqueda =
  | "usuarios"
  | "vehiculos"
  | "avisos"
  | "emprendimientos";

type ResultadoBusqueda = {
  id: string;
  titulo: string;
  descripcion: string;
  detalle: string;
  ruta: string;
};

type RespuestaBusqueda = Record<ModuloBusqueda, ResultadoBusqueda[]>;

const limitePorModulo = 5;
const longitudMinima = 2;
const longitudMaxima = 60;

const nombresRoles: Record<number, string> = {
  1: "Administrador",
  2: "Director",
  3: "Profesor",
  4: "Garita",
  5: "Estudiante",
};

const permisosPorRol: Record<number, ModuloBusqueda[]> = {
  1: ["usuarios", "vehiculos", "avisos", "emprendimientos"],
  2: ["avisos", "emprendimientos"],
  3: ["vehiculos", "avisos", "emprendimientos"],
  4: ["vehiculos", "avisos"],
  5: ["avisos", "emprendimientos"],
};

function crearRespuestaVacia(): RespuestaBusqueda {
  return {
    usuarios: [],
    vehiculos: [],
    avisos: [],
    emprendimientos: [],
  };
}

function normalizarTextoBusqueda(valor: string | null) {
  return (valor ?? "")
    .normalize("NFKC")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, longitudMaxima);
}

function crearPatronBusqueda(texto: string) {
  return `%${texto.replace(/[%_]/g, "\\$&")}%`;
}

function resumirTexto(texto: string, limite = 90) {
  const limpio = texto.replace(/\s+/g, " ").trim();

  if (limpio.length <= limite) {
    return limpio;
  }

  return `${limpio.slice(0, limite - 3).trim()}...`;
}

function contieneModulo(
  modulos: ModuloBusqueda[],
  modulo: ModuloBusqueda
) {
  return modulos.includes(modulo);
}

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

function tomarPrimerosUnicos<T>(
  registros: T[],
  obtenerClave: (registro: T) => string
) {
  const vistos = new Set<string>();
  const resultado: T[] = [];

  registros.forEach((registro) => {
    const clave = obtenerClave(registro);

    if (vistos.has(clave) || resultado.length >= limitePorModulo) {
      return;
    }

    vistos.add(clave);
    resultado.push(registro);
  });

  return resultado;
}

async function buscarUsuarios(texto: string) {
  const partes = texto.split(" ").filter(Boolean);
  const primerTermino = partes[0] ?? texto;
  const ultimoTermino = partes[partes.length - 1] ?? texto;
  const patron = crearPatronBusqueda(texto);
  const patronPrimerTermino = crearPatronBusqueda(primerTermino);
  const patronUltimoTermino = crearPatronBusqueda(ultimoTermino);

  const consultas = await Promise.all([
    supabaseAdmin
      .from("usuarios")
      .select("id, nombres, apellidos, dni, codigo_estudiante, rol_id")
      .eq("estado", true)
      .ilike("nombres", patronPrimerTermino)
      .limit(10),
    supabaseAdmin
      .from("usuarios")
      .select("id, nombres, apellidos, dni, codigo_estudiante, rol_id")
      .eq("estado", true)
      .ilike("apellidos", patronUltimoTermino)
      .limit(10),
    supabaseAdmin
      .from("usuarios")
      .select("id, nombres, apellidos, dni, codigo_estudiante, rol_id")
      .eq("estado", true)
      .ilike("dni", patron)
      .limit(limitePorModulo),
    supabaseAdmin
      .from("usuarios")
      .select("id, nombres, apellidos, dni, codigo_estudiante, rol_id")
      .eq("estado", true)
      .ilike("codigo_estudiante", patron)
      .limit(limitePorModulo),
  ]);

  const registros = consultas.flatMap((consulta) =>
    ((consulta.data ?? []) as UsuarioBusqueda[])
  );

  return tomarPrimerosUnicos(registros, (usuario) => usuario.id).map(
    (usuario) => ({
      id: usuario.id,
      titulo: `${usuario.nombres} ${usuario.apellidos}`,
      descripcion: `DNI: ${usuario.dni}`,
      detalle: `${usuario.codigo_estudiante ?? "Sin codigo"} - ${
        nombresRoles[usuario.rol_id] ?? "Sin rol"
      }`,
      ruta: "/usuarios",
    })
  );
}

async function buscarVehiculos(texto: string) {
  const partes = texto.split(" ").filter(Boolean);
  const primerTermino = partes[0] ?? texto;
  const ultimoTermino = partes[partes.length - 1] ?? texto;
  const patron = crearPatronBusqueda(texto);
  const patronPrimerTermino = crearPatronBusqueda(primerTermino);
  const patronUltimoTermino = crearPatronBusqueda(ultimoTermino);

  const propietarios = await Promise.all([
    supabaseAdmin
      .from("usuarios")
      .select("id")
      .eq("estado", true)
      .ilike("nombres", patronPrimerTermino)
      .limit(10),
    supabaseAdmin
      .from("usuarios")
      .select("id")
      .eq("estado", true)
      .ilike("apellidos", patronUltimoTermino)
      .limit(10),
  ]);

  const propietarioIds = tomarPrimerosUnicos(
    propietarios.flatMap((consulta) =>
      ((consulta.data ?? []) as { id: string }[])
    ),
    (propietario) => propietario.id
  ).map((propietario) => propietario.id);

  const consultasVehiculos = await Promise.all([
    supabaseAdmin
      .from("vehiculos")
      .select("id, placa, marca, modelo, usuarios ( nombres, apellidos )")
      .eq("estado", true)
      .ilike("placa", patron)
      .limit(limitePorModulo),
    supabaseAdmin
      .from("vehiculos")
      .select("id, placa, marca, modelo, usuarios ( nombres, apellidos )")
      .eq("estado", true)
      .ilike("marca", patron)
      .limit(limitePorModulo),
    supabaseAdmin
      .from("vehiculos")
      .select("id, placa, marca, modelo, usuarios ( nombres, apellidos )")
      .eq("estado", true)
      .ilike("modelo", patron)
      .limit(limitePorModulo),
    propietarioIds.length > 0
      ? supabaseAdmin
          .from("vehiculos")
          .select("id, placa, marca, modelo, usuarios ( nombres, apellidos )")
          .eq("estado", true)
          .in("usuario_id", propietarioIds)
          .limit(limitePorModulo)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const registros = consultasVehiculos.flatMap((consulta) =>
    ((consulta.data ?? []) as VehiculoBusqueda[])
  );

  return tomarPrimerosUnicos(registros, (vehiculo) =>
    String(vehiculo.id)
  ).map((vehiculo) => {
    const propietario = Array.isArray(vehiculo.usuarios)
      ? vehiculo.usuarios[0] ?? null
      : vehiculo.usuarios;

    return {
      id: String(vehiculo.id),
      titulo: vehiculo.placa,
      descripcion: `${vehiculo.marca ?? "Sin marca"} ${
        vehiculo.modelo ?? ""
      }`.trim(),
      detalle: propietario
        ? `${propietario.nombres} ${propietario.apellidos}`
        : "Sin propietario",
      ruta: "/vehiculos",
    };
  });
}

async function buscarAvisos(texto: string) {
  const patron = crearPatronBusqueda(texto);
  const consultas = await Promise.all([
    supabaseAdmin
      .from("avisos")
      .select("id, titulo, contenido, tipo")
      .eq("estado", true)
      .ilike("titulo", patron)
      .order("created_at", { ascending: false })
      .limit(limitePorModulo),
    supabaseAdmin
      .from("avisos")
      .select("id, titulo, contenido, tipo")
      .eq("estado", true)
      .ilike("contenido", patron)
      .order("created_at", { ascending: false })
      .limit(limitePorModulo),
    supabaseAdmin
      .from("avisos")
      .select("id, titulo, contenido, tipo")
      .eq("estado", true)
      .ilike("tipo", patron)
      .order("created_at", { ascending: false })
      .limit(limitePorModulo),
  ]);

  const registros = consultas.flatMap((consulta) =>
    ((consulta.data ?? []) as AvisoBusqueda[])
  );

  return tomarPrimerosUnicos(registros, (aviso) =>
    String(aviso.id)
  ).map((aviso) => ({
    id: String(aviso.id),
    titulo: aviso.titulo,
    descripcion: resumirTexto(aviso.contenido),
    detalle: aviso.tipo,
    ruta: "/avisos",
  }));
}

async function buscarEmprendimientos(texto: string) {
  const partes = texto.split(" ").filter(Boolean);
  const primerTermino = partes[0] ?? texto;
  const ultimoTermino = partes[partes.length - 1] ?? texto;
  const patron = crearPatronBusqueda(texto);
  const patronPrimerTermino = crearPatronBusqueda(primerTermino);
  const patronUltimoTermino = crearPatronBusqueda(ultimoTermino);

  const autores = await Promise.all([
    supabaseAdmin
      .from("usuarios")
      .select("id, nombres, apellidos")
      .eq("estado", true)
      .ilike("nombres", patronPrimerTermino)
      .limit(10),
    supabaseAdmin
      .from("usuarios")
      .select("id, nombres, apellidos")
      .eq("estado", true)
      .ilike("apellidos", patronUltimoTermino)
      .limit(10),
  ]);

  const autoresUnicos = tomarPrimerosUnicos(
    autores.flatMap((consulta) =>
      ((consulta.data ?? []) as AutorBusqueda[])
    ),
    (autor) => autor.id
  );
  const autoresIds = autoresUnicos.map((autor) => autor.id);

  const consultas = await Promise.all([
    supabaseAdmin
      .from("emprendimientos")
      .select("id, titulo, descripcion, autor_id")
      .eq("estado", true)
      .ilike("titulo", patron)
      .order("created_at", { ascending: false })
      .limit(limitePorModulo),
    supabaseAdmin
      .from("emprendimientos")
      .select("id, titulo, descripcion, autor_id")
      .eq("estado", true)
      .ilike("descripcion", patron)
      .order("created_at", { ascending: false })
      .limit(limitePorModulo),
    autoresIds.length > 0
      ? supabaseAdmin
          .from("emprendimientos")
          .select("id, titulo, descripcion, autor_id")
          .eq("estado", true)
          .in("autor_id", autoresIds)
          .order("created_at", { ascending: false })
          .limit(limitePorModulo)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const registros = tomarPrimerosUnicos(
    consultas.flatMap((consulta) =>
      ((consulta.data ?? []) as EmprendimientoBusqueda[])
    ),
    (emprendimiento) => String(emprendimiento.id)
  );

  const autoresFaltantes = registros
    .map((emprendimiento) => emprendimiento.autor_id)
    .filter((autorId) => !autoresUnicos.some((autor) => autor.id === autorId));

  const { data: autoresConsultados } =
    autoresFaltantes.length > 0
      ? await supabaseAdmin
          .from("usuarios")
          .select("id, nombres, apellidos")
          .in("id", autoresFaltantes)
      : { data: [] };

  const autoresPorId = new Map(
    [...autoresUnicos, ...((autoresConsultados ?? []) as AutorBusqueda[])].map(
      (autor) => [autor.id, autor]
    )
  );

  return registros.map((emprendimiento) => {
    const autor = autoresPorId.get(emprendimiento.autor_id);

    return {
      id: String(emprendimiento.id),
      titulo: emprendimiento.titulo,
      descripcion: resumirTexto(emprendimiento.descripcion),
      detalle: autor
        ? `${autor.nombres} ${autor.apellidos}`
        : "Autor no disponible",
      ruta: "/emprendimientos",
    };
  });
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

    const { searchParams } = new URL(request.url);
    const texto = normalizarTextoBusqueda(searchParams.get("q"));

    if (texto.length < longitudMinima) {
      return NextResponse.json(
        {
          error: "Ingresa al menos 2 caracteres para buscar.",
        },
        { status: 400 }
      );
    }

    const modulosPermitidos = permisosPorRol[Number(usuario.rol_id)] ?? [];
    const resultados = crearRespuestaVacia();

    await Promise.all([
      contieneModulo(modulosPermitidos, "usuarios")
        ? buscarUsuarios(texto).then((usuarios) => {
            resultados.usuarios = usuarios;
          })
        : Promise.resolve(),
      contieneModulo(modulosPermitidos, "vehiculos")
        ? buscarVehiculos(texto).then((vehiculos) => {
            resultados.vehiculos = vehiculos;
          })
        : Promise.resolve(),
      contieneModulo(modulosPermitidos, "avisos")
        ? buscarAvisos(texto).then((avisos) => {
            resultados.avisos = avisos;
          })
        : Promise.resolve(),
      contieneModulo(modulosPermitidos, "emprendimientos")
        ? buscarEmprendimientos(texto).then((emprendimientos) => {
            resultados.emprendimientos = emprendimientos;
          })
        : Promise.resolve(),
    ]);

    return NextResponse.json({
      consulta: texto,
      resultados,
    });
  } catch (error) {
    console.error("Error en busqueda global:", error);

    return NextResponse.json(
      { error: "Ocurrio un error interno." },
      { status: 500 }
    );
  }
}
