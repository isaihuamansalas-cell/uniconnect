"use client";

import Image from "next/image";
import Link from "next/link";

import { useConfiguracion } from "@/components/configuracion/ConfiguracionProvider";
import { obtenerUrlLogo } from "@/lib/configuracion/defaults";

export default function Sidebar() {
  const { configuracion } = useConfiguracion();
  const logoUrl = obtenerUrlLogo(configuracion.logo_path);

  return (
    <aside className="min-h-screen w-64 bg-slate-900 p-6 text-white">
      <div className="flex items-center gap-3">
        {logoUrl && (
          <Image
            src={logoUrl}
            alt="Logo institucional"
            width={36}
            height={36}
            unoptimized
            className="h-9 w-9 rounded-lg object-contain"
          />
        )}

        <h1 className="text-2xl font-bold text-emerald-400">
          {configuracion.nombre_sistema}
        </h1>
      </div>

      <nav className="mt-10 flex flex-col gap-4">
        <Link href="/dashboard">🏠 Inicio</Link>
        <Link href="/usuarios">👥 Usuarios</Link>
        <Link href="/vehiculos">🚗 Vehículos</Link>
        <Link href="/avisos">📢 Avisos</Link>
        <Link href="/emprendimientos">🛍 Emprendimientos</Link>
        <Link href="/reportes">📄 Reportes</Link>
        <Link href="/configuracion">⚙ Configuración</Link>
        <Link href="/garita">Garita</Link>
        <Link href="/historial">Historial</Link>
      </nav>
    </aside>
  );
}
