"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, LogOut, Menu, UserRound } from "lucide-react";

import { usePerfil } from "@/components/auth/PerfilProvider";
import { useConfiguracion } from "@/components/configuracion/ConfiguracionProvider";
import ThemeToggle from "@/components/theme/ThemeToggle";
import BuscadorGlobal from "./BuscadorGlobal";
import NotificacionesPanel from "./NotificacionesPanel";

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
  const { perfil, session, cargandoPerfil, cerrandoSesion, cerrarSesion } =
    usePerfil();
  const [menuCuentaAbierto, setMenuCuentaAbierto] = useState(false);
  const menuCuentaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuCuentaAbierto) return;
    function cerrarFuera(event: MouseEvent) {
      if (menuCuentaRef.current && !menuCuentaRef.current.contains(event.target as Node)) setMenuCuentaAbierto(false);
    }
    function cerrarEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuCuentaAbierto(false);
    }
    document.addEventListener("mousedown", cerrarFuera);
    window.addEventListener("keydown", cerrarEscape);
    return () => {
      document.removeEventListener("mousedown", cerrarFuera);
      window.removeEventListener("keydown", cerrarEscape);
    };
  }, [menuCuentaAbierto]);

  return (
    <header className="flex min-h-20 max-w-full items-center justify-between gap-1 overflow-x-clip border-b border-slate-200 bg-white px-2 dark:border-slate-800 dark:bg-slate-900 sm:gap-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center sm:gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Abrir menu"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 lg:hidden"
        >
          <Menu size={22} />
        </button>

        <div className="hidden min-w-0 sm:block">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Panel principal
          </h2>

          <p className="truncate text-sm text-slate-500 dark:text-slate-400">
            {configuracion.nombre_institucion}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 shrink-0 items-center gap-0.5 sm:gap-4">
        <BuscadorGlobal accessToken={session?.access_token ?? ""} />

        <NotificacionesPanel
          accessToken={session?.access_token ?? ""}
        />

        <ThemeToggle />

        <div className="hidden items-center gap-2 sm:flex sm:gap-4">
        <Link
          href="/perfil"
          className="flex min-w-0 items-center gap-3 rounded-xl px-2 py-1 transition hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <FotoPerfilHeader
            accessToken={session?.access_token ?? ""}
            tieneFoto={perfil?.tiene_foto ?? false}
            version={perfil?.foto_version ?? ""}
          />

          <div className="hidden sm:block">
            {cargandoPerfil ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Cargando...</p>
            ) : (
              <>
                <p className="max-w-48 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {perfil?.nombres} {perfil?.apellidos}
                </p>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {perfil ? nombresRoles[perfil.rol_id] : "Sin perfil"}
                </p>
              </>
            )}
          </div>

          <span className="hidden rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-200 md:inline">
            Mi perfil
          </span>
        </Link>

        <button
          type="button"
          onClick={() => {
            setMenuCuentaAbierto(false);
            void cerrarSesion();
          }}
          disabled={cerrandoSesion}
          title="Cerrar sesion"
          aria-label="Cerrar sesion"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-red-600 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-60 dark:hover:bg-red-950/30"
        >
          <LogOut size={21} />
        </button>
        </div>

        <div ref={menuCuentaRef} className="relative sm:hidden">
          <button
            type="button"
            aria-label="Abrir menu de cuenta"
            aria-haspopup="menu"
            aria-expanded={menuCuentaAbierto}
            aria-controls="menu-cuenta-movil"
            onClick={() => setMenuCuentaAbierto((valor) => !valor)}
            className="focus-primary inline-flex h-11 items-center justify-center gap-0.5 rounded-lg px-0.5 text-slate-700 dark:text-slate-200"
          >
            <FotoPerfilHeader accessToken={session?.access_token ?? ""} tieneFoto={perfil?.tiene_foto ?? false} version={perfil?.foto_version ?? ""} />
            <ChevronDown size={14} aria-hidden="true" />
          </button>

          {menuCuentaAbierto && (
            <div id="menu-cuenta-movil" role="menu" className="fixed right-2 top-[4.5rem] z-50 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 px-3 py-3 dark:border-slate-800">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{perfil?.nombres} {perfil?.apellidos}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{perfil ? nombresRoles[perfil.rol_id] : "Sin perfil"}</p>
              </div>
              <Link role="menuitem" href="/perfil" onClick={() => setMenuCuentaAbierto(false)} className="mt-1 flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"><UserRound size={19} />Mi perfil</Link>
              <button role="menuitem" type="button" disabled={cerrandoSesion} onClick={() => { setMenuCuentaAbierto(false); void cerrarSesion(); }} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-wait disabled:opacity-60 dark:hover:bg-red-950/30"><LogOut size={19} />{cerrandoSesion ? "Cerrando..." : "Cerrar sesion"}</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

type FotoPerfilHeaderProps = {
  accessToken: string;
  tieneFoto: boolean;
  version: string;
};

function FotoPerfilHeader({
  accessToken,
  tieneFoto,
  version,
}: FotoPerfilHeaderProps) {
  const [fotoUrl, setFotoUrl] = useState("");

  useEffect(() => {
    let cancelado = false;
    let urlTemporal = "";

    async function cargarFoto() {
      setFotoUrl("");

      if (!accessToken || !tieneFoto) {
        return;
      }

      const respuesta = await fetch(
        `/api/perfil/foto?v=${encodeURIComponent(version)}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        }
      );

      if (!respuesta.ok || cancelado) {
        return;
      }

      const imagen = await respuesta.blob();
      urlTemporal = URL.createObjectURL(imagen);

      if (!cancelado) {
        setFotoUrl(urlTemporal);
      }
    }

    void cargarFoto();

    return () => {
      cancelado = true;

      if (urlTemporal) {
        URL.revokeObjectURL(urlTemporal);
      }
    };
  }, [accessToken, tieneFoto, version]);

  if (!fotoUrl) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
        <UserRound size={21} />
      </div>
    );
  }

  return (
    <Image
      src={fotoUrl}
      alt="Foto de perfil"
      width={40}
      height={40}
      unoptimized
      className="h-10 w-10 shrink-0 rounded-full object-cover"
    />
  );
}
