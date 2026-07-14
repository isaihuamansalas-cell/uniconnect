"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Car } from "lucide-react";

import { supabase } from "@/lib/supabase/client";

type FotoVehiculoProps = {
  vehiculoId: number;
  version: string;
  accessToken?: string;
  className?: string;
  fallbackClassName?: string;
  iconSize?: number;
};

export default function FotoVehiculo({
  vehiculoId,
  version,
  accessToken,
  className = "h-11 w-11 rounded-xl object-cover",
  fallbackClassName = "flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600",
  iconSize = 22,
}: FotoVehiculoProps) {
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
        `/api/vehiculos/${vehiculoId}/foto?v=${encodeURIComponent(
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
  }, [accessToken, vehiculoId, version]);

  if (!fotoUrl) {
    return (
      <div className={fallbackClassName}>
        <Car size={iconSize} />
      </div>
    );
  }

  return (
    <Image
      src={fotoUrl}
      alt="Foto del vehiculo"
      width={96}
      height={96}
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
