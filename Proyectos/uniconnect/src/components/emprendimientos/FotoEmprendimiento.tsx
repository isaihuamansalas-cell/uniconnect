"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Store } from "lucide-react";

import { supabase } from "@/lib/supabase/client";

type FotoEmprendimientoProps = {
  emprendimientoId: number;
  version: string;
  accessToken?: string;
  className?: string;
  fallbackClassName?: string;
  iconSize?: number;
};

export default function FotoEmprendimiento({
  emprendimientoId,
  version,
  accessToken,
  className = "h-full w-full object-cover",
  fallbackClassName = "flex h-full w-full items-center justify-center bg-slate-100 text-slate-500",
  iconSize = 34,
}: FotoEmprendimientoProps) {
  const [fotoUrl, setFotoUrl] = useState("");

  useEffect(() => {
    let cancelado = false;
    let urlTemporal = "";

    async function cargarFoto() {
      setFotoUrl("");

      const token = accessToken ?? (await obtenerAccessToken());

      if (!token) {
        return;
      }

      const respuesta = await fetch(
        `/api/emprendimientos/${emprendimientoId}/foto?v=${encodeURIComponent(
          version
        )}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
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

    cargarFoto();

    return () => {
      cancelado = true;

      if (urlTemporal) {
        URL.revokeObjectURL(urlTemporal);
      }
    };
  }, [accessToken, emprendimientoId, version]);

  if (!fotoUrl) {
    return (
      <div className={fallbackClassName}>
        <Store size={iconSize} />
      </div>
    );
  }

  return (
    <Image
      src={fotoUrl}
      alt="Foto del emprendimiento"
      width={640}
      height={360}
      unoptimized
      className={className}
    />
  );
}

async function obtenerAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? "";
}
