"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, LoaderCircle, X } from "lucide-react";

import { supabase } from "@/lib/supabase/client";

type NuevoUsuarioModalProps = {
  abierto: boolean;
  onCerrar: () => void;
  onUsuarioCreado: () => void;
};

type FormularioUsuario = {
  nombres: string;
  apellidos: string;
  dni: string;
  codigo_estudiante: string;
  correo: string;
  telefono: string;
  password: string;
  rol_id: number;
};

const formularioInicial: FormularioUsuario = {
  nombres: "",
  apellidos: "",
  dni: "",
  codigo_estudiante: "",
  correo: "",
  telefono: "",
  password: "",
  rol_id: 5,
};

export default function NuevoUsuarioModal({
  abierto,
  onCerrar,
  onUsuarioCreado,
}: NuevoUsuarioModalProps) {
  const [formulario, setFormulario] =
    useState<FormularioUsuario>(formularioInicial);

  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  if (!abierto) {
    return null;
  }

  function actualizarCampo(
    campo: keyof FormularioUsuario,
    valor: string | number
  ) {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  function cerrarModal() {
    if (guardando) {
      return;
    }

    setFormulario(formularioInicial);
    setError("");
    setMensaje("");
    setMostrarPassword(false);
    onCerrar();
  }

  async function crearUsuario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setGuardando(true);
    setError("");
    setMensaje("");

    const {
      data: { session },
      error: errorSesion,
    } = await supabase.auth.getSession();

    if (errorSesion || !session) {
      setError("Tu sesión terminó. Vuelve a iniciar sesión.");
      setGuardando(false);
      return;
    }

    try {
      const respuesta = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          nombres: formulario.nombres,
          apellidos: formulario.apellidos,
          dni: formulario.dni,
          codigo_estudiante:
            formulario.rol_id === 5
              ? formulario.codigo_estudiante
              : null,
          correo: formulario.correo,
          telefono: formulario.telefono || null,
          password: formulario.password,
          rol_id: formulario.rol_id,
        }),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        setError(resultado.error ?? "No se pudo crear el usuario.");
        setGuardando(false);
        return;
      }

      setMensaje("Usuario creado correctamente.");
      setFormulario(formularioInicial);
      onUsuarioCreado();

      window.setTimeout(() => {
        cerrarModal();
      }, 900);
    } catch (errorInesperado) {
      console.error(errorInesperado);
      setError("No se pudo conectar con el servidor.");
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Nuevo usuario
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Crea la cuenta y el perfil dentro de UniConnect.
            </p>
          </div>

          <button
            type="button"
            onClick={cerrarModal}
            disabled={guardando}
            aria-label="Cerrar formulario"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
          >
            <X size={22} />
          </button>
        </div>

        <form onSubmit={crearUsuario} className="space-y-5 p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <Campo
              etiqueta="Nombres"
              value={formulario.nombres}
              onChange={(valor) => actualizarCampo("nombres", valor)}
              placeholder="Ejemplo: María Elena"
            />

            <Campo
              etiqueta="Apellidos"
              value={formulario.apellidos}
              onChange={(valor) => actualizarCampo("apellidos", valor)}
              placeholder="Ejemplo: López García"
            />

            <Campo
              etiqueta="DNI"
              value={formulario.dni}
              onChange={(valor) =>
                actualizarCampo(
                  "dni",
                  valor.replace(/\D/g, "").slice(0, 8)
                )
              }
              placeholder="8 números"
              inputMode="numeric"
            />

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Rol
              </label>

              <select
                value={formulario.rol_id}
                onChange={(event) =>
                  actualizarCampo("rol_id", Number(event.target.value))
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                <option value={1}>Administrador</option>
                <option value={2}>Director</option>
                <option value={3}>Profesor</option>
                <option value={4}>Garita</option>
                <option value={5}>Estudiante</option>
              </select>
            </div>

            {formulario.rol_id === 5 && (
              <Campo
                etiqueta="Código institucional"
                value={formulario.codigo_estudiante}
                onChange={(valor) =>
                  actualizarCampo("codigo_estudiante", valor)
                }
                placeholder="Código del estudiante"
              />
            )}

            <Campo
              etiqueta="Teléfono"
              value={formulario.telefono}
              onChange={(valor) =>
                actualizarCampo(
                  "telefono",
                  valor.replace(/\D/g, "").slice(0, 9)
                )
              }
              placeholder="Número de teléfono"
              inputMode="numeric"
              requerido={false}
            />
          </div>

          <Campo
            etiqueta="Correo"
            type="email"
            value={formulario.correo}
            onChange={(valor) => actualizarCampo("correo", valor)}
            placeholder="usuario@suiza.edu.pe"
          />

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Contraseña temporal
            </label>

            <div className="relative">
              <input
                type={mostrarPassword ? "text" : "password"}
                value={formulario.password}
                onChange={(event) =>
                  actualizarCampo("password", event.target.value)
                }
                minLength={8}
                required
                placeholder="Mínimo 8 caracteres"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-12 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />

              <button
                type="button"
                onClick={() => setMostrarPassword((valor) => !valor)}
                aria-label={
                  mostrarPassword
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 hover:bg-slate-100"
              >
                {mostrarPassword ? (
                  <EyeOff size={20} />
                ) : (
                  <Eye size={20} />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
              {error}
            </p>
          )}

          {mensaje && (
            <p className="rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
              {mensaje}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={cerrarModal}
              disabled={guardando}
              className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={guardando}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {guardando && (
                <LoaderCircle size={20} className="animate-spin" />
              )}

              {guardando ? "Creando..." : "Crear usuario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type CampoProps = {
  etiqueta: string;
  value: string;
  onChange: (valor: string) => void;
  placeholder: string;
  type?: string;
  inputMode?: "text" | "numeric" | "email" | "tel";
  requerido?: boolean;
};

function Campo({
  etiqueta,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode = "text",
  requerido = true,
}: CampoProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {etiqueta}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        required={requerido}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
      />
    </div>
  );
}