"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
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
  const { perfil, cargaInicial, cargandoSesion, cerrandoSesion } = usePerfil();
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);
  const menuId = `menu-movil-${useId()}`;
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);

  const cerrarMenuMovil = useCallback(() => {
    setMenuMovilAbierto(false);
  }, []);

  useEffect(() => {
    if (!cerrandoSesion && !cargandoSesion && !cargaInicial && !perfil) {
      router.replace("/login");
    }
  }, [cargaInicial, cargandoSesion, cerrandoSesion, perfil, router]);

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
    if (!cargandoSesion && !cargaInicial && perfil && !tienePermiso) {
      router.replace("/dashboard");
    }
  }, [cargaInicial, cargandoSesion, perfil, router, tienePermiso]);

  useEffect(() => {
    if (!menuMovilAbierto) return;

    const botonQueAbrio = menuButtonRef.current;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const temporizador = window.setTimeout(() => {
      const menu = menuRef.current;
      const primerEnlace = menu?.querySelector<HTMLElement>("a[href]");
      (primerEnlace ?? menu)?.focus();
    }, 0);

    function cerrarConEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        cerrarMenuMovil();
        return;
      }

      if (event.key !== "Tab") return;
      const menu = menuRef.current;
      if (!menu) return;
      const enfocables = Array.from(
        menu.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])"
        )
      ).filter((elemento) => elemento.getClientRects().length > 0);
      if (enfocables.length === 0) {
        event.preventDefault();
        menu.focus();
        return;
      }
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      if (!menu.contains(document.activeElement) || document.activeElement === menu) {
        event.preventDefault();
        (event.shiftKey ? ultimo : primero).focus();
      } else if (event.shiftKey && document.activeElement === primero) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && document.activeElement === ultimo) {
        event.preventDefault();
        primero.focus();
      }
    }

    window.addEventListener("keydown", cerrarConEscape);

    return () => {
      window.clearTimeout(temporizador);
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", cerrarConEscape);
      botonQueAbrio?.focus();
    };
  }, [cerrarMenuMovil, menuMovilAbierto]);

  if (cargaInicial) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-950">
        <div className="flex items-center gap-3 text-primary" role="status" aria-live="polite">
          <LoaderCircle className="animate-spin" size={30} />
          <span className="font-semibold">Validando acceso institucional...</span>
        </div>
      </div>
    );
  }

  if (cerrandoSesion) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-950">
        <div className="flex items-center gap-3 text-primary" role="status" aria-live="polite">
          <LoaderCircle className="animate-spin" size={30} />
          <span className="font-semibold">Cerrando sesion...</span>
        </div>
      </div>
    );
  }

  if (cargandoSesion || !perfil || !tienePermiso) return null;

  return (
    <div className="flex min-h-screen min-w-0 bg-slate-100 dark:bg-slate-950">

      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {menuMovilAbierto && (
        <button
          type="button"
          aria-label="Cerrar menu"
          onClick={cerrarMenuMovil}
          className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden"
        />
      )}

      {menuMovilAbierto && (
        <div className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden">
          <Sidebar
            mobile
            id={menuId}
            contenedorRef={menuRef}
            onNavigate={cerrarMenuMovil}
          />
        </div>
      )}

      <div className="min-w-0 flex-1">

        <Header
          onMenuClick={() => setMenuMovilAbierto(true)}
          menuAbierto={menuMovilAbierto}
          menuButtonRef={menuButtonRef}
          menuId={menuId}
        />

        <main className="min-h-screen min-w-0 bg-slate-100 p-4 dark:bg-slate-950 sm:p-6 lg:p-8">
          {children}
        </main>

      </div>

    </div>
  );
}
