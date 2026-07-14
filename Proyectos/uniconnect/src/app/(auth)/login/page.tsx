"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useConfiguracion } from "@/components/configuracion/ConfiguracionProvider";
import { obtenerUrlLogo } from "@/lib/configuracion/defaults";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
    const router = useRouter();
const { configuracion } = useConfiguracion();
const logoUrl = obtenerUrlLogo(configuracion.logo_path);

const [correo, setCorreo] = useState("");
const [password, setPassword] = useState("");
const [loading, setLoading] = useState(false);

const iniciarSesion = async (
  e: React.FormEvent<HTMLFormElement>
) => {

  e.preventDefault();

  setLoading(true);

  const { error } = await supabase.auth.signInWithPassword({
    email: correo,
    password,
  });

  setLoading(false);

  if (error) {
    alert(error.message);
    return;
  }

  router.replace("/dashboard");
router.refresh();
};
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100">
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

        <form
  onSubmit={iniciarSesion}
  className="space-y-5"
>

          <div>
            <label className="mb-2 block font-medium">
              Correo institucional
            </label>
<input
  type="email"
  value={correo}
  onChange={(e) => setCorreo(e.target.value)}
  placeholder={configuracion.correo_institucional ?? "correo@suiza.edu.pe"}
  className="w-full rounded-lg border p-3 outline-none focus:border-green-600"
/>
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Contraseña
            </label>
<input
  type="password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  placeholder="********"
  className="w-full rounded-lg border p-3 outline-none focus:border-green-600"
/>
          </div>

          <button
  type="submit"
  disabled={loading}
  className="w-full rounded-lg bg-green-700 p-3 font-semibold text-white hover:bg-green-800"
>
  {loading ? "Ingresando..." : "Iniciar sesión"}
</button>

        </form>

      </div>
    </main>
  );
}

