import { createClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/lib/supabase/admin";

export type UsuarioApi = { id: string; rol_id: number; estado: boolean };

export type ResultadoAutorizacion =
  | { autorizado: true; usuario: UsuarioApi }
  | { autorizado: false; status: 401 | 403 };

export async function autorizarApi(
  request: Request,
  rolesPermitidos: readonly number[]
): Promise<ResultadoAutorizacion> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return { autorizado: false, status: 401 };
  }

  const token = authorization.slice(7).trim();
  if (!token) return { autorizado: false, status: 401 };

  const clienteAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data: { user }, error } = await clienteAuth.auth.getUser(token);
  if (error || !user) return { autorizado: false, status: 401 };

  const { data: usuario, error: errorPerfil } = await supabaseAdmin
    .from("usuarios")
    .select("id, rol_id, estado")
    .eq("id", user.id)
    .eq("estado", true)
    .maybeSingle();

  if (errorPerfil || !usuario || !rolesPermitidos.includes(Number(usuario.rol_id))) {
    return { autorizado: false, status: 403 };
  }

  return { autorizado: true, usuario: usuario as UsuarioApi };
}
