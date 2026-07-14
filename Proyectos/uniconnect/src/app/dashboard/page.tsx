"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Car, FileText, Users } from "lucide-react";

import MainLayout from "@/components/layout/MainLayout";
import { StatCard } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";

type Perfil = {
  nombres: string;
  apellidos: string;
  correo: string;
  rol_id: number;
};

const nombresRoles: Record<number, string> = {
  1: "Administrador",
  2: "Director",
  3: "Profesor",
  4: "Garita",
  5: "Estudiante",
};

export default function DashboardPage() {
  const router = useRouter();

  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [cargando, setCargando] = useState(true);
  const [mensajeError, setMensajeError] = useState("");

  useEffect(() => {
    async function cargarPerfil() {
      setCargando(true);
      setMensajeError("");

      const {
        data: { user },
        error: errorUsuario,
      } = await supabase.auth.getUser();

      if (errorUsuario || !user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("usuarios")
        .select("nombres, apellidos, correo, rol_id")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error al consultar el perfil:", error);
        setMensajeError("No se pudo cargar la información del usuario.");
        setCargando(false);
        return;
      }

      setPerfil(data);
      setCargando(false);
    }

    cargarPerfil();
  }, [router]);

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="font-medium text-slate-600">
          Cargando tu perfil...
        </p>
      </main>
    );
  }

  return (
    <MainLayout>
      <section>
        <p className="text-sm font-medium text-emerald-700">
          {perfil ? nombresRoles[perfil.rol_id] : ""}
        </p>

        <h1 className="mt-1 text-4xl font-bold text-slate-900">
          Bienvenido, {perfil?.nombres}
        </h1>

        <p className="mt-2 text-slate-600">
          {perfil?.nombres} {perfil?.apellidos} · {perfil?.correo}
        </p>

        {mensajeError && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-red-700">
            {mensajeError}
          </p>
        )}

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Usuarios"
            value="254"
            icon={<Users size={40} />}
          />

          <StatCard
            title="Vehículos"
            value="186"
            icon={<Car size={40} />}
          />

          <StatCard
            title="Avisos"
            value="8"
            icon={<Bell size={40} />}
          />

          <StatCard
            title="Reportes"
            value="12"
            icon={<FileText size={40} />}
          />
        </div>
      </section>
    </MainLayout>
  );
}