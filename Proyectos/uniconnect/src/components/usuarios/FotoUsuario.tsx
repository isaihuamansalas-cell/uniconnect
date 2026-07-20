"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { UserRound } from "lucide-react";

import { adquirirFotoPrivada, limpiarCacheFotosPrivadas } from "@/lib/imagenes/cacheFotosPrivadas";

type FotoUsuarioProps = { usuarioId: string; version: string; accessToken: string; className?: string; fallbackClassName?: string; iconSize?: number };

export default function FotoUsuario({ usuarioId, version, accessToken, className = "h-24 w-24 rounded-2xl object-cover", fallbackClassName = "flex h-24 w-24 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300", iconSize = 36 }: FotoUsuarioProps) {
  const contenedorRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [fotoUrl, setFotoUrl] = useState("");

  useEffect(() => {
    const elemento = contenedorRef.current;
    if (!elemento || visible) return;
    const observador = new IntersectionObserver(([entrada]) => {
      if (entrada.isIntersecting) { setVisible(true); observador.disconnect(); }
    }, { rootMargin: "160px" });
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [visible]);

  useEffect(() => {
    setFotoUrl("");
    if (!accessToken) { limpiarCacheFotosPrivadas(); return; }
    if (!visible || !version) return;
    let activo = true;
    const clave = `usuario:${usuarioId}:${version}`;
    const adquisicion = adquirirFotoPrivada({ clave, endpoint: `/api/usuarios/${encodeURIComponent(usuarioId)}/foto?v=${encodeURIComponent(version)}`, accessToken });
    void adquisicion.promesa.then((url) => { if (activo) setFotoUrl(url); }).catch(() => { if (activo) setFotoUrl(""); });
    return () => { activo = false; adquisicion.liberar(); };
  }, [accessToken, usuarioId, version, visible]);

  return <div ref={contenedorRef} className="shrink-0">{fotoUrl ? <Image src={fotoUrl} alt="Fotografia del estudiante" width={160} height={160} unoptimized loading="lazy" className={className} /> : <div className={fallbackClassName} aria-label="Sin fotografia disponible"><UserRound size={iconSize} /></div>}</div>;
}
