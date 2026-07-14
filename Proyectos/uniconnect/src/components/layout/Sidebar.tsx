"use client";

import Image from "next/image";
import Link from "next/link";

import { usePerfil } from "@/components/auth/PerfilProvider";
import { useConfiguracion } from "@/components/configuracion/ConfiguracionProvider";
import { obtenerUrlLogo } from "@/lib/configuracion/defaults";

type MenuItem = {
  href: string;
  label: string;
  roles: number[];
};

type SidebarProps = {
  mobile?: boolean;
  onNavigate?: () => void;
};

const menuItems: MenuItem[] = [
  {
    href: "/dashboard",
    label: "Inicio",
    roles: [1, 2, 3, 4, 5],
  },
  {
    href: "/usuarios",
    label: "Usuarios",
    roles: [1],
  },
  {
    href: "/vehiculos",
    label: "Vehiculos",
    roles: [1, 3],
  },
  {
    href: "/garita",
    label: "Garita",
    roles: [1, 4],
  },
  {
    href: "/historial",
    label: "Historial",
    roles: [1, 2, 4],
  },
  {
    href: "/avisos",
    label: "Avisos",
    roles: [1, 2, 3, 4, 5],
  },
  {
    href: "/emprendimientos",
    label: "Emprendimientos",
    roles: [1, 2, 3, 5],
  },
  {
    href: "/reportes",
    label: "Reportes",
    roles: [1, 2, 3],
  },
  {
    href: "/configuracion",
    label: "Configuracion",
    roles: [1, 2, 3, 4, 5],
  },
];

export default function Sidebar({
  mobile = false,
  onNavigate,
}: SidebarProps) {
  const { configuracion } = useConfiguracion();
  const { perfil, cargandoPerfil } = usePerfil();
  const logoUrl = obtenerUrlLogo(configuracion.logo_path);
  const rolId = perfil?.rol_id;
  const itemsVisibles = rolId
    ? menuItems.filter((item) => item.roles.includes(rolId))
    : [];

  return (
    <aside
      className={
        mobile
          ? "h-full w-64 overflow-y-auto bg-slate-900 p-6 text-white shadow-2xl"
          : "sticky top-0 min-h-screen w-64 overflow-y-auto bg-slate-900 p-6 text-white"
      }
    >
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

        <h1 className="truncate text-2xl font-bold text-emerald-400">
          {configuracion.nombre_sistema}
        </h1>
      </div>

      <nav className="mt-10 flex flex-col gap-2">
        {cargandoPerfil && (
          <p className="px-3 py-2 text-sm text-slate-300">
            Cargando menu...
          </p>
        )}

        {itemsVisibles.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className="rounded-xl px-3 py-2 font-medium text-slate-100 transition hover:bg-slate-800 hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
