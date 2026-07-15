import { createClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";

type PerfilPassword = {
  id: string;
  correo: string;
  estado: boolean;
};

type CambioPassword = {
  password_actual?: string;
  password_nueva?: string;
  confirmacion?: string;
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

export async function PATCH(request: Request) {
  try {
    const usuarioAutenticado =
      await obtenerUsuarioAutenticado(request);

    if (!usuarioAutenticado) {
      return NextResponse.json(
        { error: "La sesion no es valida o ha vencido." },
        { status: 401 }
      );
    }

    const { data: perfil } = await supabaseAdmin
      .from("usuarios")
      .select("id, correo, estado")
      .eq("id", usuarioAutenticado.id)
      .eq("estado", true)
      .maybeSingle();

    if (!perfil) {
      return NextResponse.json(
        { error: "Tu usuario no existe o esta inactivo." },
        { status: 403 }
      );
    }

    const perfilActivo = perfil as PerfilPassword;
    const body = (await request.json()) as CambioPassword;
    const passwordActual = body.password_actual ?? "";
    const passwordNueva = body.password_nueva ?? "";
    const confirmacion = body.confirmacion ?? "";

    if (!passwordActual) {
      return NextResponse.json(
        { error: "Ingresa tu contrasena actual." },
        { status: 400 }
      );
    }

    if (passwordNueva.length < 8) {
      return NextResponse.json(
        {
          error:
            "La nueva contrasena debe tener al menos 8 caracteres.",
        },
        { status: 400 }
      );
    }

    if (!confirmacion) {
      return NextResponse.json(
        { error: "Confirma la nueva contrasena." },
        { status: 400 }
      );
    }

    if (passwordNueva !== confirmacion) {
      return NextResponse.json(
        { error: "La confirmacion no coincide." },
        { status: 400 }
      );
    }

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
      data: validacionPassword,
      error: errorPassword,
    } = await supabasePublico.auth.signInWithPassword({
      email: perfilActivo.correo,
      password: passwordActual,
    });

    if (
      errorPassword ||
      validacionPassword.user?.id !== usuarioAutenticado.id
    ) {
      return NextResponse.json(
        { error: "La contrasena actual no es correcta." },
        { status: 400 }
      );
    }

    const { error: errorActualizacion } =
      await supabaseAdmin.auth.admin.updateUserById(
        usuarioAutenticado.id,
        {
          password: passwordNueva,
        }
      );

    if (errorActualizacion) {
      return NextResponse.json(
        {
          error:
            "No se pudo actualizar la contrasena. Intenta nuevamente.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      mensaje: "Contrasena actualizada correctamente.",
    });
  } catch (error) {
    console.error("Error al cambiar la contrasena:", error);

    return NextResponse.json(
      { error: "Ocurrio un error interno." },
      { status: 500 }
    );
  }
}
