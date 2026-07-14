"use client";

import { Bell, LogOut, Menu, UserRound } from "lucide-react";

import { usePerfil } from "@/components/auth/PerfilProvider";
import { useConfiguracion } from "@/components/configuracion/ConfiguracionProvider";

type HeaderProps = {
  onMenuClick: () => void;
};

const nombresRoles: Record<number, string> = {
  1: "Administrador",
  2: "Director",
  3: "Profesor",
  4: "Garita",
  5: "Estudiante",
};

export default function Header({ onMenuClick }: HeaderProps) {
  const { configuracion } = useConfiguracion();
  const { perfil, cargandoPerfil, cerrarSesion } = usePerfil();

  return (
    <header className="flex min-h-20 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Abrir menu"
          className="rounded-lg p-2 text-slate-700 transition hover:bg-slate-100 lg:hidden"
        >
          <Menu size={22} />
        </button>

        <div className="min-w-0">
        <h2 className="text-xl font-semibold text-slate-900">
          Panel principal
        </h2>

        <p className="truncate text-sm text-slate-500">
          {configuracion.nombre_institucion}
        </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-5">
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
            {cargandoPerfil ? (
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

