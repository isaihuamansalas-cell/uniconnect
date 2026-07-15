"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { usePerfil } from "@/components/auth/PerfilProvider";
import Sidebar from "./Sidebar";
import Header from "./Header";

type Props = {
  children: React.ReactNode;
};

export default function MainLayout({ children }: Props) {
  const router = useRouter();
  const { perfil, cargandoPerfil, cargandoSesion } = usePerfil();
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);

  useEffect(() => {
    if (!cargandoSesion && !cargandoPerfil && !perfil) {
      router.replace("/login");
    }
  }, [cargandoPerfil, cargandoSesion, perfil, router]);

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

  return (
    <div className="flex min-h-screen min-w-0 bg-slate-100">

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

        <main className="min-h-screen min-w-0 bg-slate-100 p-4 sm:p-6 lg:p-8">
          {children}
        </main>

      </div>

    </div>
  );
}
