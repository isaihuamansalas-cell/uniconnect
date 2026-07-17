import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import {
  obtenerIp,
  obtenerUserAgent,
  registrarAuditoria,
} from "@/lib/auditoria/registrarAuditoria";
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
  correo?: string;
  dni: string;
  codigo_estudiante: string | null;
  telefono: string | null;
  foto?: string | null;
  rol_id: number;
  estado: boolean;
};

type UsuarioEliminable = {
  id: string;
  rol_id: number;
  dni: string;
  codigo_estudiante: string | null;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string | null;
  foto: string | null;
  estado: boolean;
  created_at: string;
};

type RelacionUsuario = {
  tabla: string;
  descripcion: string;
  cantidad: number;
};

async function obtenerUsuarioDesdeBearer(request: Request) {
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

async function contarRelacion(
  tabla: string,
  columna: string,
  valor: string
) {
  const { count, error } = await supabaseAdmin
    .from(tabla)
    .select("id", { count: "exact", head: true })
    .eq(columna, valor);

  if (error) {
    throw new Error(
      `No se pudo validar relaciones en ${tabla}: ${error.message}`
    );
  }

  return count ?? 0;
}

async function obtenerRelacionesUsuario(usuarioId: string) {
  const relaciones: RelacionUsuario[] = [
    {
      tabla: "vehiculos",
      descripcion: "vehiculos asociados",
      cantidad: await contarRelacion("vehiculos", "usuario_id", usuarioId),
    },
    {
      tabla: "salidas",
      descripcion: "salidas como estudiante",
      cantidad: await contarRelacion("salidas", "estudiante_id", usuarioId),
    },
    {
      tabla: "salidas",
      descripcion: "salidas como garita",
      cantidad: await contarRelacion("salidas", "garita_id", usuarioId),
    },
    {
      tabla: "avisos",
      descripcion: "avisos creados",
      cantidad: await contarRelacion("avisos", "autor_id", usuarioId),
    },
    {
      tabla: "emprendimientos",
      descripcion: "emprendimientos creados",
      cantidad: await contarRelacion(
        "emprendimientos",
        "autor_id",
        usuarioId
      ),
    },
    {
      tabla: "auditoria",
      descripcion: "registros de auditoria",
      cantidad: await contarRelacion("auditoria", "usuario_id", usuarioId),
    },
    {
      tabla: "notificaciones",
      descripcion: "notificaciones asociadas",
      cantidad: await contarRelacion(
        "notificaciones",
        "usuario_id",
        usuarioId
      ),
    },
    {
      tabla: "configuracion",
      descripcion: "cambios de configuracion",
      cantidad: await contarRelacion(
        "configuracion",
        "updated_by",
        usuarioId
      ),
    },
  ];

  return relaciones.filter((relacion) => relacion.cantidad > 0);
}

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
      await registrarAuditoria({
        usuario_id: administrador.id,
        accion: "editar",
        modulo: "usuarios",
        entidad_tipo: "usuario",
        entidad_id: usuarioActualizado.id,
        descripcion: "Edito un usuario.",
        datos_anteriores: usuarioAnterior,
        datos_nuevos: {
          nombres: usuarioActualizado.nombres,
          apellidos: usuarioActualizado.apellidos,
          dni: usuarioActualizado.dni,
          codigo_estudiante: usuarioActualizado.codigo_estudiante,
          telefono: usuarioActualizado.telefono,
          rol_id: usuarioActualizado.rol_id,
          estado: usuarioActualizado.estado,
        },
        ip: obtenerIp(request),
        user_agent: obtenerUserAgent(request),
      });

      if (
        Number(usuarioAnterior.rol_id) !==
        Number(usuarioActualizado.rol_id)
      ) {
        await registrarAuditoria({
          usuario_id: administrador.id,
          accion: "cambiar_rol",
          modulo: "usuarios",
          entidad_tipo: "usuario",
          entidad_id: usuarioActualizado.id,
          descripcion: "Cambio el rol de un usuario.",
          datos_anteriores: { rol_id: usuarioAnterior.rol_id },
          datos_nuevos: { rol_id: usuarioActualizado.rol_id },
          ip: obtenerIp(request),
          user_agent: obtenerUserAgent(request),
        });
      }

      if (
        Boolean(usuarioAnterior.estado) !==
        Boolean(usuarioActualizado.estado)
      ) {
        await registrarAuditoria({
          usuario_id: administrador.id,
          accion: usuarioActualizado.estado
            ? "activar"
            : "desactivar",
          modulo: "usuarios",
          entidad_tipo: "usuario",
          entidad_id: usuarioActualizado.id,
          descripcion: usuarioActualizado.estado
            ? "Activo un usuario."
            : "Desactivo un usuario.",
          datos_anteriores: { estado: usuarioAnterior.estado },
          datos_nuevos: { estado: usuarioActualizado.estado },
          ip: obtenerIp(request),
          user_agent: obtenerUserAgent(request),
        });
      }

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

export async function DELETE(
  request: Request,
  contexto: ContextoRuta
) {
  try {
    const usuarioAutenticado = await obtenerUsuarioDesdeBearer(request);

    if (!usuarioAutenticado) {
      return NextResponse.json(
        { error: "La sesion no es valida o ha vencido." },
        { status: 401 }
      );
    }

    const { data: administrador, error: errorAdministrador } =
      await supabaseAdmin
        .from("usuarios")
        .select("id, rol_id, estado")
        .eq("id", usuarioAutenticado.id)
        .eq("rol_id", 1)
        .eq("estado", true)
        .maybeSingle();

    if (errorAdministrador || !administrador) {
      return NextResponse.json(
        { error: "No tienes permiso para eliminar usuarios." },
        { status: 403 }
      );
    }

    const { id } = await contexto.params;

    if (!id) {
      return NextResponse.json(
        { error: "No se recibio el identificador del usuario." },
        { status: 400 }
      );
    }

    if (id === administrador.id) {
      return NextResponse.json(
        {
          error:
            "No puedes eliminar tu propio usuario. Si corresponde, desactiva otra cuenta desde un administrador distinto.",
        },
        { status: 400 }
      );
    }

    const { data: usuario, error: errorUsuario } = await supabaseAdmin
      .from("usuarios")
      .select(
        "id, rol_id, dni, codigo_estudiante, nombres, apellidos, correo, telefono, foto, estado, created_at"
      )
      .eq("id", id)
      .maybeSingle();

    if (errorUsuario) {
      return NextResponse.json(
        { error: "No se pudo validar el usuario." },
        { status: 400 }
      );
    }

    if (!usuario) {
      return NextResponse.json(
        { error: "El usuario no existe." },
        { status: 404 }
      );
    }

    const usuarioEliminable = usuario as UsuarioEliminable;
    const relaciones = await obtenerRelacionesUsuario(id);

    if (relaciones.length > 0) {
      return NextResponse.json(
        {
          error:
            "Este usuario tiene informacion relacionada y no puede eliminarse definitivamente. Debe desactivarse para conservar la trazabilidad.",
          relaciones,
        },
        { status: 409 }
      );
    }

    const snapshotRestauracion: UsuarioEliminable = {
      id: usuarioEliminable.id,
      rol_id: usuarioEliminable.rol_id,
      dni: usuarioEliminable.dni,
      codigo_estudiante: usuarioEliminable.codigo_estudiante,
      nombres: usuarioEliminable.nombres,
      apellidos: usuarioEliminable.apellidos,
      correo: usuarioEliminable.correo,
      telefono: usuarioEliminable.telefono,
      foto: usuarioEliminable.foto,
      estado: usuarioEliminable.estado,
      created_at: usuarioEliminable.created_at,
    };

    const { error: errorEliminacionPerfil } = await supabaseAdmin
      .from("usuarios")
      .delete()
      .eq("id", id);

    if (errorEliminacionPerfil) {
      return NextResponse.json(
        {
          error: `No se pudo eliminar el usuario: ${errorEliminacionPerfil.message}`,
        },
        { status: 400 }
      );
    }

    const { error: errorAuth } =
      await supabaseAdmin.auth.admin.deleteUser(id);

    if (errorAuth) {
      const { error: errorRestauracion } = await supabaseAdmin
        .from("usuarios")
        .insert(snapshotRestauracion);

      if (errorRestauracion) {
        return NextResponse.json(
          {
            error:
              "Se elimino el perfil, pero fallo la eliminacion en Auth y no se pudo restaurar el registro. Revisa el estado del usuario manualmente.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          error:
            "No se pudo eliminar la cuenta de acceso en Auth. El perfil fue restaurado y no se aplico la eliminacion.",
        },
        { status: 400 }
      );
    }

    await registrarAuditoria({
      usuario_id: administrador.id,
      accion: "eliminar",
      modulo: "usuarios",
      entidad_tipo: "usuario",
      entidad_id: id,
      descripcion: "Elimino definitivamente un usuario.",
      datos_anteriores: {
        id: usuarioEliminable.id,
        correo: usuarioEliminable.correo,
        dni: usuarioEliminable.dni,
        codigo_estudiante: usuarioEliminable.codigo_estudiante,
        nombres: usuarioEliminable.nombres,
        apellidos: usuarioEliminable.apellidos,
        telefono: usuarioEliminable.telefono,
        rol_id: usuarioEliminable.rol_id,
        estado: usuarioEliminable.estado,
        tenia_foto: Boolean(usuarioEliminable.foto),
      },
      ip: obtenerIp(request),
      user_agent: obtenerUserAgent(request),
    });

    if (usuarioEliminable.foto) {
      const { error: errorFoto } = await supabaseAdmin.storage
        .from("usuarios")
        .remove([usuarioEliminable.foto]);

      if (errorFoto) {
        console.error(
          "No se pudo eliminar la foto del usuario:",
          errorFoto.message
        );
      }
    }

    return NextResponse.json({
      mensaje: "Usuario eliminado definitivamente.",
    });
  } catch (error) {
    console.error("Error al eliminar el usuario:", error);

    return NextResponse.json(
      { error: "Ocurrio un error interno." },
      { status: 500 }
    );
  }
}
