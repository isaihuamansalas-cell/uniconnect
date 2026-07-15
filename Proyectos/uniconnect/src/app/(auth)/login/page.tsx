"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { useConfiguracion } from "@/components/configuracion/ConfiguracionProvider";
import { obtenerUrlLogo } from "@/lib/configuracion/defaults";
import { supabase } from "@/lib/supabase/client";

type PerfilLogin = {
  id: string;
  rol_id: number;
  estado: boolean;
};

export default function LoginPage() {
  const router = useRouter();
  const { configuracion } = useConfiguracion();
  const logoUrl = obtenerUrlLogo(configuracion.logo_path);

  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorLogin, setErrorLogin] = useState("");

  async function iniciarSesion(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setErrorLogin("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: correo,
      password,
    });

    if (error) {
      setErrorLogin(error.message);
      setLoading(false);
      return;
    }

    if (!data.session || !data.user) {
      await supabase.auth.signOut();
      setErrorLogin(
        "No se pudo confirmar la sesion. Intenta ingresar nuevamente."
      );
      setLoading(false);
      return;
    }

    const { data: perfil, error: errorPerfil } = await supabase
      .from("usuarios")
      .select("id, rol_id, estado")
      .eq("id", data.user.id)
      .maybeSingle();

    if (errorPerfil) {
      await supabase.auth.signOut();
      setErrorLogin("No se pudo validar tu perfil de usuario.");
      setLoading(false);
      return;
    }

    if (!perfil) {
      await supabase.auth.signOut();
      setErrorLogin(
        "Tu cuenta autenticada no existe en el registro de usuarios."
      );
      setLoading(false);
      return;
    }

    const perfilLogin = perfil as PerfilLogin;

    if (!perfilLogin.estado) {
      await supabase.auth.signOut();
      setErrorLogin(
        "Tu usuario esta inactivo. Contacta al administrador."
      );
      setLoading(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
        {logoUrl && (
          <Image
            src={logoUrl}
            alt="Logo institucional"
            width={92}
            height={92}
            unoptimized
            className="mx-auto mb-4 h-20 w-auto object-contain"
          />
        )}

        <h1 className="mb-2 text-center text-3xl font-bold text-green-700">
          {configuracion.nombre_sistema}
        </h1>

        <p className="mb-8 text-center text-gray-500">
          {configuracion.nombre_institucion}
        </p>

        <form onSubmit={iniciarSesion} className="space-y-5">
          <div>
            <label className="mb-2 block font-medium">
              Correo institucional
            </label>
            <input
              type="email"
              value={correo}
              onChange={(event) => setCorreo(event.target.value)}
              placeholder={
                configuracion.correo_institucional ??
                "correo@suiza.edu.pe"
              }
              className="w-full rounded-lg border p-3 outline-none focus:border-green-600"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Contrasena
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="********"
              className="w-full rounded-lg border p-3 outline-none focus:border-green-600"
            />
          </div>

          {errorLogin && (
            <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">
              {errorLogin}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-green-700 p-3 font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Ingresando..." : "Iniciar sesion"}
          </button>
        </form>
      </div>
    </main>
  );
}
