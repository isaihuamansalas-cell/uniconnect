"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LogOut, Menu, UserRound } from "lucide-react";

import { usePerfil } from "@/components/auth/PerfilProvider";
import { useConfiguracion } from "@/components/configuracion/ConfiguracionProvider";
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
  const { perfil, session, cargandoPerfil, cerrarSesion } =
    usePerfil();

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

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <NotificacionesPanel
          accessToken={session?.access_token ?? ""}
        />

        <Link
          href="/perfil"
          className="flex min-w-0 items-center gap-3 rounded-xl px-2 py-1 transition hover:bg-slate-100"
        >
          <FotoPerfilHeader
            accessToken={session?.access_token ?? ""}
            tieneFoto={perfil?.tiene_foto ?? false}
            version={perfil?.foto_version ?? ""}
          />

          <div className="hidden sm:block">
            {cargandoPerfil ? (
              <p className="text-sm text-slate-500">Cargando...</p>
            ) : (
              <>
                <p className="max-w-48 truncate text-sm font-semibold text-slate-900">
                  {perfil?.nombres} {perfil?.apellidos}
                </p>

                <p className="text-xs text-slate-500">
                  {perfil ? nombresRoles[perfil.rol_id] : "Sin perfil"}
                </p>
              </>
            )}
          </div>

          <span className="hidden rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700 md:inline">
            Mi perfil
          </span>
        </Link>

        <button
          type="button"
          onClick={cerrarSesion}
          title="Cerrar sesion"
          aria-label="Cerrar sesion"
          className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
        >
          <LogOut size={21} />
        </button>
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
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
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
