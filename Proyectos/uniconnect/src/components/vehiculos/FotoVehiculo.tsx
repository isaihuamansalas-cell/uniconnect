"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Car } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { adquirirFotoPrivada, limpiarCacheFotosPrivadas } from "@/lib/imagenes/cacheFotosPrivadas";

type FotoVehiculoProps = { vehiculoId: number; version: string; accessToken?: string; className?: string; fallbackClassName?: string; iconSize?: number };

export default function FotoVehiculo({ vehiculoId, version, accessToken, className = "h-11 w-11 rounded-xl object-cover", fallbackClassName = "flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300", iconSize = 22 }: FotoVehiculoProps) {
  const contenedorRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [fotoUrl, setFotoUrl] = useState("");

  useEffect(() => {
    const elemento = contenedorRef.current;
    if (!elemento || visible) return;
    const observador = new IntersectionObserver(([entrada]) => { if (entrada.isIntersecting) { setVisible(true); observador.disconnect(); } }, { rootMargin: "160px" });
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [visible]);

  useEffect(() => {
    setFotoUrl("");
    if (!visible || !version) return;
    let activo = true;
    let liberar: (() => void) | null = null;
    void (async () => {
      const token = accessToken ?? (await supabase.auth.getSession()).data.session?.access_token ?? "";
      if (!token) { limpiarCacheFotosPrivadas(); return; }
      if (!activo) return;
      const adquisicion = adquirirFotoPrivada({ clave: `vehiculo:${vehiculoId}:${version}`, endpoint: `/api/vehiculos/${vehiculoId}/foto?v=${encodeURIComponent(version)}`, accessToken: token });
      liberar = adquisicion.liberar;
      try { const url = await adquisicion.promesa; if (activo) setFotoUrl(url); } catch { if (activo) setFotoUrl(""); }
    })();
    return () => { activo = false; liberar?.(); };
  }, [accessToken, vehiculoId, version, visible]);

  return <div ref={contenedorRef} className="shrink-0">{fotoUrl ? <Image src={fotoUrl} alt="Foto del vehiculo" width={96} height={96} unoptimized loading="lazy" className={className} /> : <div className={fallbackClassName}><Car size={iconSize} /></div>}</div>;
}
