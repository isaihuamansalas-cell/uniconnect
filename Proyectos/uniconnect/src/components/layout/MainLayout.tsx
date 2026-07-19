"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

import { usePerfil } from "@/components/auth/PerfilProvider";
import Sidebar from "./Sidebar";
import Header from "./Header";

type Props = {
  children: React.ReactNode;
};

export default function MainLayout({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { perfil, cargandoPerfil, cargandoSesion } = usePerfil();
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);

  useEffect(() => {
    if (!cargandoSesion && !cargandoPerfil && !perfil) {
      router.replace("/login");
    }
  }, [cargandoPerfil, cargandoSesion, perfil, router]);

  const rolesPorRuta: Record<string, readonly number[]> = {
    "/usuarios": [1],
    "/vehiculos": [1, 3],
    "/configuracion": [1, 2, 3, 4, 5],
    "/garita": [1, 4],
    "/historial": [1, 2, 4],
    "/auditoria": [1, 2],
    "/reportes": [1, 2, 3],
    "/perfil": [1, 2, 3, 4, 5],
    "/dashboard": [1, 2, 3, 4, 5],
  };
  const rutaProtegida = Object.keys(rolesPorRuta).find(
    (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`)
  );
  const tienePermiso = !rutaProtegida || Boolean(
    perfil && rolesPorRuta[rutaProtegida].includes(perfil.rol_id)
  );

  useEffect(() => {
    if (!cargandoSesion && !cargandoPerfil && perfil && !tienePermiso) {
      router.replace("/dashboard");
    }
  }, [cargandoPerfil, cargandoSesion, perfil, router, tienePermiso]);

  useEffect(() => {
    if (!menuMovilAbierto) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    function cerrarConEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuMovilAbierto(false);
      }
    }

    window.addEventListener("keydown", cerrarConEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", cerrarConEscape);
    };
  }, [menuMovilAbierto]);

  if (cargandoSesion || cargandoPerfil || !perfil || !tienePermiso) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-950">
        <div className="flex items-center gap-3 text-primary" role="status" aria-live="polite">
          <LoaderCircle className="animate-spin" size={30} />
          <span className="font-semibold">Validando acceso institucional...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen min-w-0 bg-slate-100 dark:bg-slate-950">

      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {menuMovilAbierto && (
        <button
          type="button"
          aria-label="Cerrar menu"
          onClick={() => setMenuMovilAbierto(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden"
        />
      )}

      <div
        className={
          menuMovilAbierto
            ? "fixed inset-y-0 left-0 z-50 w-64 translate-x-0 transition-transform lg:hidden"
            : "fixed inset-y-0 left-0 z-50 w-64 -translate-x-full transition-transform lg:hidden"
        }
      >
        <Sidebar
          mobile
          onNavigate={() => setMenuMovilAbierto(false)}
        />
      </div>

      <div className="min-w-0 flex-1">

        <Header
          onMenuClick={() => setMenuMovilAbierto(true)}
        />

        <main className="min-h-screen min-w-0 bg-slate-100 p-4 dark:bg-slate-950 sm:p-6 lg:p-8">
          {children}
        </main>

      </div>

    </div>
  );
}
