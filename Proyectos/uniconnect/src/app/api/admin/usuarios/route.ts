import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import {
  obtenerIp,
  obtenerUserAgent,
  registrarAuditoria,
} from "@/lib/auditoria/registrarAuditoria";
import { supabaseAdmin } from "@/lib/supabase/admin";

type NuevoUsuario = {
  correo?: string;
  password?: string;
  dni?: string;
  codigo_estudiante?: string | null;
  nombres?: string;
  apellidos?: string;
  telefono?: string | null;
  rol_id?: number;
};

export async function POST(request: Request) {
  try {
    // 1. Obtener la sesión enviada desde el navegador.
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "No has iniciado sesión." },
        { status: 401 }
      );
    }

    const accessToken = authorization.replace("Bearer ", "").trim();

    // 2. Comprobar que el token corresponda a un usuario válido.
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
      error: errorAutenticacion,
    } = await supabasePublico.auth.getUser(accessToken);

    if (errorAutenticacion || !user) {
      return NextResponse.json(
        { error: "La sesión no es válida o ha vencido." },
        { status: 401 }
      );
    }

    // 3. Comprobar que quien realiza la operación sea administrador.
    const { data: administrador, error: errorAdministrador } =
      await supabaseAdmin
        .from("usuarios")
        .select("id, rol_id, estado")
        .eq("id", user.id)
        .eq("rol_id", 1)
        .eq("estado", true)
        .maybeSingle();

    if (errorAdministrador || !administrador) {
      return NextResponse.json(
        { error: "No tienes permiso para crear usuarios." },
        { status: 403 }
      );
    }

    // 4. Leer y validar los datos.
    const body = (await request.json()) as NuevoUsuario;

    const correo = body.correo?.trim().toLowerCase();
    const password = body.password;
    const dni = body.dni?.trim();
    const nombres = body.nombres?.trim();
    const apellidos = body.apellidos?.trim();
    const rolId = Number(body.rol_id);

    if (!correo || !correo.includes("@")) {
      return NextResponse.json(
        { error: "Ingresa un correo válido." },
        { status: 400 }
      );
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres." },
        { status: 400 }
      );
    }

    if (!dni || !/^\d{8}$/.test(dni)) {
      return NextResponse.json(
        { error: "El DNI debe contener exactamente 8 números." },
        { status: 400 }
      );
    }

    if (!nombres || !apellidos) {
      return NextResponse.json(
        { error: "Los nombres y apellidos son obligatorios." },
        { status: 400 }
      );
    }

    if (![1, 2, 3, 4, 5].includes(rolId)) {
      return NextResponse.json(
        { error: "El rol seleccionado no es válido." },
        { status: 400 }
      );
    }

    const codigoEstudiante =
      body.codigo_estudiante?.trim() || null;

    if (rolId === 5 && !codigoEstudiante) {
      return NextResponse.json(
        { error: "El código institucional es obligatorio para estudiantes." },
        { status: 400 }
      );
    }

    // 5. Crear la cuenta dentro de Supabase Auth.
    const { data: cuentaCreada, error: errorCuenta } =
      await supabaseAdmin.auth.admin.createUser({
        email: correo,
        password,
        email_confirm: true,
        user_metadata: {
          nombres,
          apellidos,
        },
      });

    if (errorCuenta || !cuentaCreada.user) {
      return NextResponse.json(
        {
          error:
            errorCuenta?.message ??
            "No se pudo crear la cuenta de acceso.",
        },
        { status: 400 }
      );
    }

    // 6. Crear el perfil relacionado con esa cuenta.
    const { error: errorPerfil } = await supabaseAdmin
      .from("usuarios")
      .insert({
        id: cuentaCreada.user.id,
        rol_id: rolId,
        dni,
        codigo_estudiante: codigoEstudiante,
        nombres,
        apellidos,
        correo,
        telefono: body.telefono?.trim() || null,
        foto: null,
        estado: true,
      });

    // Si falla el perfil, eliminamos la cuenta para no dejar datos incompletos.
    if (errorPerfil) {
      await supabaseAdmin.auth.admin.deleteUser(
        cuentaCreada.user.id
      );

      return NextResponse.json(
        { error: `No se pudo guardar el perfil: ${errorPerfil.message}` },
        { status: 400 }
      );
    }

    await registrarAuditoria({
      usuario_id: administrador.id,
      accion: "crear",
      modulo: "usuarios",
      entidad_tipo: "usuario",
      entidad_id: cuentaCreada.user.id,
      descripcion: "Creo un usuario.",
      datos_nuevos: {
        id: cuentaCreada.user.id,
        correo,
        dni,
        codigo_estudiante: codigoEstudiante,
        nombres,
        apellidos,
        telefono: body.telefono?.trim() || null,
        rol_id: rolId,
        estado: true,
      },
      ip: obtenerIp(request),
      user_agent: obtenerUserAgent(request),
    });

    return NextResponse.json(
      {
        mensaje: "Usuario creado correctamente.",
        usuario: {
          id: cuentaCreada.user.id,
          correo,
          nombres,
          apellidos,
          rol_id: rolId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error inesperado al crear el usuario:", error);

    return NextResponse.json(
      { error: "Ocurrió un error interno al crear el usuario." },
      { status: 500 }
    );
  }
}
