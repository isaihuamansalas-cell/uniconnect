"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { useConfiguracion } from "@/components/configuracion/ConfiguracionProvider";
import { FormField, Input } from "@/components/ui";
import { obtenerUrlLogo } from "@/lib/configuracion/defaults";
import { supabase } from "@/lib/supabase/client";

function obtenerUrlRestablecimiento() {
  if (window.location.hostname === "localhost") {
    return "http://localhost:3000/restablecer-password";
  }

  return `${window.location.origin}/restablecer-password`;
}

export default function RecuperarPasswordPage() {
  const { configuracion } = useConfiguracion();
  const logoUrl = obtenerUrlLogo(configuracion.logo_path);

  const [correo, setCorreo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  async function solicitarRecuperacion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!correo.trim()) {
      setError("Ingresa tu correo institucional.");
      setMensaje("");
      return;
    }

    setEnviando(true);
    setError("");
    setMensaje("");

    const { error: errorRecuperacion } =
      await supabase.auth.resetPasswordForEmail(correo.trim(), {
        redirectTo: obtenerUrlRestablecimiento(),
      });

    if (errorRecuperacion) {
      setError(
        "No se pudo enviar la solicitud. Intenta nuevamente en unos minutos."
      );
      setEnviando(false);
      return;
    }

    setMensaje(
      "Si el correo esta registrado, recibiras un enlace para restablecer tu contrasena."
    );
    setEnviando(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
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
          Recuperar contrasena
        </h1>

        <p className="mb-8 text-center text-gray-500">
          {configuracion.nombre_institucion}
        </p>

        <form
          onSubmit={solicitarRecuperacion}
          className="space-y-5"
        >
          <FormField label="Correo institucional">
            <Input
              type="email"
              value={correo}
              onChange={(event) => setCorreo(event.target.value)}
              placeholder={
                configuracion.correo_institucional ??
                "correo@suiza.edu.pe"
              }
              autoComplete="email"
            />
          </FormField>

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">
              {error}
            </p>
          )}

          {mensaje && (
            <p className="rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
              {mensaje}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-lg bg-green-700 p-3 font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {enviando ? "Enviando..." : "Enviar enlace"}
          </button>

          <div className="text-center">
            <Link
              href="/login"
              className="text-sm font-medium text-emerald-700 transition hover:text-emerald-800 hover:underline"
            >
              Volver al login
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
