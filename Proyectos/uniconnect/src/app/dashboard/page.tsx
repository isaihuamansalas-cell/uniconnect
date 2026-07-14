"use client";

import { Bell, Car, FileText, Users } from "lucide-react";

import { usePerfil } from "@/components/auth/PerfilProvider";
import MainLayout from "@/components/layout/MainLayout";
import { StatCard } from "@/components/ui";

const nombresRoles: Record<number, string> = {
  1: "Administrador",
  2: "Director",
  3: "Profesor",
  4: "Garita",
  5: "Estudiante",
};

export default function DashboardPage() {
  const { perfil, cargandoPerfil, errorPerfil } = usePerfil();

  if (cargandoPerfil) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
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

        <h1 className="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl">
          Bienvenido, {perfil?.nombres}
        </h1>

        <p className="mt-2 break-words text-slate-600">
          {perfil?.nombres} {perfil?.apellidos} - {perfil?.correo}
        </p>

        {errorPerfil && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-red-700">
            {errorPerfil}
          </p>
        )}

        <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Usuarios"
            value="254"
            icon={<Users size={40} />}
          />

          <StatCard
            title="Vehiculos"
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
