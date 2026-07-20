"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useConfiguracion } from "@/components/configuracion/ConfiguracionProvider";
import { FormField, Input } from "@/components/ui";
import { obtenerUrlLogo } from "@/lib/configuracion/defaults";
import { supabase } from "@/lib/supabase/client";

export default function RestablecerPasswordPage() {
  const router = useRouter();
  const { configuracion } = useConfiguracion();
  const logoUrl = obtenerUrlLogo(configuracion.logo_path);

  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [verificandoSesion, setVerificandoSesion] = useState(true);
  const [sesionRecuperacionLista, setSesionRecuperacionLista] =
    useState(false);
  const [actualizando, setActualizando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let componenteActivo = true;
    let recuperacionConfirmada = false;

    function confirmarRecuperacion() {
      if (!componenteActivo) return;
      recuperacionConfirmada = true;
      setSesionRecuperacionLista(true);
      setError("");
      setVerificandoSesion(false);
    }

    async function procesarEnlaceRecuperacion() {
      try {
        const parametros = new URLSearchParams(window.location.search);
        const fragmento = new URLSearchParams(
          window.location.hash.replace(/^#/, "")
        );

        if (parametros.get("error") || fragmento.get("error")) {
          throw new Error("Enlace de recuperacion rechazado.");
        }

        const codigo = parametros.get("code");
        if (codigo) {
          const { data, error: errorIntercambio } =
            await supabase.auth.exchangeCodeForSession(codigo);
          if (errorIntercambio || !data.session?.user) {
            throw new Error("No se pudo intercambiar el codigo de recuperacion.");
          }
          confirmarRecuperacion();
          window.history.replaceState({}, "", window.location.pathname);
          return;
        }

        const esFragmentoRecuperacion =
          fragmento.get("type") === "recovery";
        const accessToken = fragmento.get("access_token");
        const refreshToken = fragmento.get("refresh_token");

        if (esFragmentoRecuperacion && accessToken && refreshToken) {
          const { data, error: errorSesion } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (errorSesion || !data.session?.user) {
            throw new Error("No se pudo iniciar la sesion de recuperacion.");
          }
          confirmarRecuperacion();
          window.history.replaceState({}, "", window.location.pathname);
          return;
        }

        // Una sesion persistida normal no acredita una recuperacion.
        if (!recuperacionConfirmada && componenteActivo) {
          setSesionRecuperacionLista(false);
          setVerificandoSesion(false);
        }
      } catch {
        if (!componenteActivo) return;
        setSesionRecuperacionLista(false);
        setVerificandoSesion(false);
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session?.user) {
        confirmarRecuperacion();
      }
    });

    void procesarEnlaceRecuperacion();

    return () => {
      componenteActivo = false;
      subscription.unsubscribe();
    };
  }, []);

  async function actualizarPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMensaje("");

    if (!sesionRecuperacionLista) {
      setError(
        "El enlace de recuperacion no es valido o ya expiro. Solicita uno nuevo."
      );
      return;
    }

    if (password.length < 8) {
      setError("La nueva contrasena debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmacion) {
      setError("La confirmacion no coincide con la nueva contrasena.");
      return;
    }

    setActualizando(true);

    try {
      const { error: errorActualizacion } = await supabase.auth.updateUser({
        password,
      });

      if (errorActualizacion) {
        setError(
          "No se pudo actualizar la contrasena. Solicita un nuevo enlace e intenta nuevamente."
        );
        return;
      }

      setSesionRecuperacionLista(false);
      setPassword("");
      setConfirmacion("");
      setMensaje(
        "Contrasena actualizada correctamente. Seras redirigido al login."
      );

      try {
        await supabase.auth.signOut();
      } finally {
        router.replace("/login");
        router.refresh();
      }
    } catch {
      setError(
        "No se pudo actualizar la contrasena. Solicita un nuevo enlace e intenta nuevamente."
      );
    } finally {
      setActualizando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
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
          Restablecer contrasena
        </h1>

        <p className="mb-8 text-center text-gray-500 dark:text-slate-400">
          {configuracion.nombre_institucion}
        </p>

        {verificandoSesion ? (
          <p className="rounded-lg bg-slate-50 p-3 text-center text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Verificando enlace de recuperacion...
          </p>
        ) : (
          <form
            onSubmit={actualizarPassword}
            className="space-y-5"
          >
            <FormField label="Nueva contrasena">
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimo 8 caracteres"
                autoComplete="new-password"
                disabled={!sesionRecuperacionLista || actualizando}
              />
            </FormField>

            <FormField label="Confirmar contrasena">
              <Input
                type="password"
                value={confirmacion}
                onChange={(event) =>
                  setConfirmacion(event.target.value)
                }
                placeholder="Repite la nueva contrasena"
                autoComplete="new-password"
                disabled={!sesionRecuperacionLista || actualizando}
              />
            </FormField>

            {!sesionRecuperacionLista && (
              <p className="rounded-lg bg-amber-50 p-3 text-sm font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                El enlace de recuperacion no es valido o ya expiro.
                Solicita uno nuevo.
              </p>
            )}

            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </p>
            )}

            {mensaje && (
              <p className="rounded-lg bg-primary-soft p-3 text-sm font-medium text-primary">
                {mensaje}
              </p>
            )}

            <button
              type="submit"
              disabled={!sesionRecuperacionLista || actualizando}
              className="btn-primary w-full rounded-lg p-3 font-semibold disabled:cursor-not-allowed disabled:opacity-70"
            >
              {actualizando
                ? "Actualizando..."
                : "Actualizar contrasena"}
            </button>

            <div className="flex flex-col items-center gap-2 text-center">
              <Link
                href="/recuperar-password"
                className="text-primary text-sm font-medium transition hover:underline"
              >
                Solicitar un nuevo enlace
              </Link>

              <Link
                href="/login"
                className="text-sm font-medium text-slate-600 transition hover:text-slate-800 hover:underline dark:text-slate-300 dark:hover:text-slate-100"
              >
                Volver al login
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
