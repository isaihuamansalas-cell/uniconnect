"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, UserRound } from "lucide-react";

import { supabase } from "@/lib/supabase/client";

type Perfil = {
  nombres: string;
  apellidos: string;
  correo: string;
  rol_id: number;
};

const nombresRoles: Record<number, string> = {
  1: "Administrador",
  2: "Director",
  3: "Profesor",
  4: "Garita",
  5: "Estudiante",
};

export default function Header() {
  const router = useRouter();

  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargarUsuario() {
      const {
        data: { user },
        error: errorUsuario,
      } = await supabase.auth.getUser();

      if (errorUsuario || !user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("usuarios")
        .select("nombres, apellidos, correo, rol_id")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error al cargar el perfil:", error);
        setCargando(false);
        return;
      }

      setPerfil(data);
      setCargando(false);
    }

    cargarUsuario();
  }, [router]);

  async function cerrarSesion() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="flex min-h-20 items-center justify-between border-b border-slate-200 bg-white px-8">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Panel principal
        </h2>

        <p className="text-sm text-slate-500">
          Instituto Superior Tecnológico Suiza
        </p>
      </div>

      <div className="flex items-center gap-5">
        <button
          type="button"
          aria-label="Ver notificaciones"
          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
        >
          <Bell size={21} />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <UserRound size={21} />
          </div>

          <div className="hidden sm:block">
            {cargando ? (
              <p className="text-sm text-slate-500">Cargando...</p>
            ) : (
              <>
                <p className="text-sm font-semibold text-slate-900">
                  {perfil?.nombres} {perfil?.apellidos}
                </p>

                <p className="text-xs text-slate-500">
                  {perfil ? nombresRoles[perfil.rol_id] : "Sin perfil"}
                </p>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={cerrarSesion}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
        >
          <LogOut size={21} />
        </button>
      </div>
    </header>
  );
}