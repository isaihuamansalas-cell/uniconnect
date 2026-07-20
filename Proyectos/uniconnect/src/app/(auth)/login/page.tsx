"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useConfiguracion } from "@/components/configuracion/ConfiguracionProvider";
import ThemeToggle from "@/components/theme/ThemeToggle";
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

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: correo,
        password,
      });

      if (error) {
        setErrorLogin(
          "Credenciales incorrectas, cuenta no disponible o error temporal."
        );
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
    } catch {
      setErrorLogin(
        "Credenciales incorrectas, cuenta no disponible o error temporal."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex justify-end">
          <ThemeToggle />
        </div>

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

        <h1 className="mb-2 text-center text-3xl font-bold text-primary">
          {configuracion.nombre_sistema}
        </h1>

        <p className="mb-8 text-center text-gray-500 dark:text-slate-400">
          {configuracion.nombre_institucion}
        </p>

        <form onSubmit={iniciarSesion} className="space-y-5">
          <div>
            <label
              htmlFor="correo"
              className="mb-2 block font-medium text-slate-700 dark:text-slate-200"
            >
              Correo institucional
            </label>
            <input
              id="correo"
              type="email"
              value={correo}
              onChange={(event) => setCorreo(event.target.value)}
              autoComplete="email"
              required
              placeholder={
                configuracion.correo_institucional ??
                "correo@gmail.com"
              }
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block font-medium text-slate-700 dark:text-slate-200"
            >
              Contrasena
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              placeholder="********"
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          {errorLogin && (
            <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {errorLogin}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full rounded-lg p-3 font-semibold disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Ingresando..." : "Iniciar sesion"}
          </button>

          <div className="text-center">
            <Link
              href="/recuperar-password"
              className="text-primary text-sm font-medium transition hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
