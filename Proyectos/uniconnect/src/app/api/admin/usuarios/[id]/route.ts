import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { crearNotificacion } from "@/lib/notificaciones/crearNotificacion";
import { supabaseAdmin } from "@/lib/supabase/admin";

type DatosActualizados = {
  nombres?: string;
  apellidos?: string;
  dni?: string;
  codigo_estudiante?: string | null;
  telefono?: string | null;
  rol_id?: number;
  estado?: boolean;
};

type ContextoRuta = {
  params: Promise<{
    id: string;
  }>;
};

type UsuarioAnterior = {
  id: string;
  nombres: string;
  apellidos: string;
  dni: string;
  codigo_estudiante: string | null;
  telefono: string | null;
  rol_id: number;
  estado: boolean;
};

export async function PATCH(
  request: Request,
  contexto: ContextoRuta
) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "No has iniciado sesión." },
        { status: 401 }
      );
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
      error: errorAutenticacion,
    } = await supabasePublico.auth.getUser(accessToken);

    if (errorAutenticacion || !user) {
      return NextResponse.json(
        { error: "La sesión no es válida o ha vencido." },
        { status: 401 }
      );
    }

    const { data: administrador, error: errorAdministrador } =
      await supabaseAdmin
        .from("usuarios")
        .select("id")
        .eq("id", user.id)
        .eq("rol_id", 1)
        .eq("estado", true)
        .maybeSingle();

    if (errorAdministrador || !administrador) {
      return NextResponse.json(
        { error: "No tienes permiso para editar usuarios." },
        { status: 403 }
      );
    }

    const { id } = await contexto.params;
    const body = (await request.json()) as DatosActualizados;

    const nombres = body.nombres?.trim();
    const apellidos = body.apellidos?.trim();
    const dni = body.dni?.trim();
    const rolId = Number(body.rol_id);

    if (!id) {
      return NextResponse.json(
        { error: "No se recibió el identificador del usuario." },
        { status: 400 }
      );
    }

    if (!nombres || !apellidos) {
      return NextResponse.json(
        { error: "Los nombres y apellidos son obligatorios." },
        { status: 400 }
      );
    }

    if (!dni || !/^\d{8}$/.test(dni)) {
      return NextResponse.json(
        { error: "El DNI debe contener exactamente 8 números." },
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
        {
          error:
            "El código institucional es obligatorio para estudiantes.",
        },
        { status: 400 }
      );
    }

    const { data: usuarioExistente } = await supabaseAdmin
      .from("usuarios")
      .select(
        "id, nombres, apellidos, dni, codigo_estudiante, telefono, rol_id, estado"
      )
      .eq("id", id)
      .maybeSingle();

    if (!usuarioExistente) {
      return NextResponse.json(
        { error: "El usuario no existe." },
        { status: 404 }
      );
    }

    const usuarioAnterior = usuarioExistente as UsuarioAnterior;

    const { data: usuarioActualizado, error: errorActualizacion } =
      await supabaseAdmin
        .from("usuarios")
        .update({
          nombres,
          apellidos,
          dni,
          codigo_estudiante:
            rolId === 5 ? codigoEstudiante : null,
          telefono: body.telefono?.trim() || null,
          rol_id: rolId,
          estado: body.estado ?? true,
        })
        .eq("id", id)
        .select(
          "id, nombres, apellidos, correo, dni, codigo_estudiante, telefono, rol_id, estado"
        )
        .single();

    if (errorActualizacion) {
      return NextResponse.json(
        {
          error: `No se pudo actualizar el usuario: ${errorActualizacion.message}`,
        },
        { status: 400 }
      );
    }

    const cambioAdministrativo =
      usuarioAnterior.nombres !== usuarioActualizado.nombres ||
      usuarioAnterior.apellidos !== usuarioActualizado.apellidos ||
      usuarioAnterior.dni !== usuarioActualizado.dni ||
      usuarioAnterior.codigo_estudiante !==
        usuarioActualizado.codigo_estudiante ||
      usuarioAnterior.telefono !== usuarioActualizado.telefono ||
      Number(usuarioAnterior.rol_id) !==
        Number(usuarioActualizado.rol_id) ||
      Boolean(usuarioAnterior.estado) !==
        Boolean(usuarioActualizado.estado);

    if (cambioAdministrativo) {
      await crearNotificacion({
        usuario_id: usuarioActualizado.id,
        titulo: "Datos de cuenta actualizados",
        mensaje:
          "Un administrador actualizo informacion de tu cuenta.",
        tipo: "administrativo",
        ruta: "/perfil",
        entidad_tipo: "usuario",
        entidad_id: usuarioActualizado.id,
      });
    }

    return NextResponse.json({
      mensaje: "Usuario actualizado correctamente.",
      usuario: usuarioActualizado,
    });
  } catch (error) {
    console.error("Error al actualizar el usuario:", error);

    return NextResponse.json(
      { error: "Ocurrió un error interno." },
      { status: 500 }
    );
  }
}
