"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { UserRound } from "lucide-react";

type FotoUsuarioProps = {
  usuarioId: string;
  version: string;
  accessToken: string;
  className?: string;
  fallbackClassName?: string;
  iconSize?: number;
};

export default function FotoUsuario({
  usuarioId,
  version,
  accessToken,
  className = "h-24 w-24 rounded-2xl object-cover",
  fallbackClassName =
    "flex h-24 w-24 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300",
  iconSize = 36,
}: FotoUsuarioProps) {
  const [fotoUrl, setFotoUrl] = useState("");

  useEffect(() => {
    let cancelado = false;
    let urlTemporal = "";

    async function cargarFoto() {
      setFotoUrl("");

      if (!accessToken || !version) {
        return;
      }

      try {
        const respuesta = await fetch(
          `/api/usuarios/${encodeURIComponent(usuarioId)}/foto?v=${encodeURIComponent(
            version
          )}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
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
      } catch {
        setFotoUrl("");
      }
    }

    void cargarFoto();

    return () => {
      cancelado = true;
      if (urlTemporal) URL.revokeObjectURL(urlTemporal);
    };
  }, [accessToken, usuarioId, version]);

  if (!fotoUrl) {
    return (
      <div className={fallbackClassName} aria-label="Sin fotografia disponible">
        <UserRound size={iconSize} />
      </div>
    );
  }

  return (
    <Image
      src={fotoUrl}
      alt="Fotografia del estudiante"
      width={160}
      height={160}
      unoptimized
      className={className}
    />
  );
}
