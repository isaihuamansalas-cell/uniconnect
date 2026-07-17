"use client";

import { FormEvent, useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";

import {
  FormField,
  Input,
  Modal,
  Select,
} from "@/components/ui";
import { supabase } from "@/lib/supabase/client";

export type UsuarioEditable = {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  dni: string;
  codigo_estudiante: string | null;
  telefono: string | null;
  rol_id: number;
  estado: boolean;
};

type EditarUsuarioModalProps = {
  abierto: boolean;
  usuario: UsuarioEditable | null;
  onCerrar: () => void;
  onUsuarioActualizado: () => void;
};

export default function EditarUsuarioModal({
  abierto,
  usuario,
  onCerrar,
  onUsuarioActualizado,
}: EditarUsuarioModalProps) {
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [dni, setDni] = useState("");
  const [codigo, setCodigo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [rolId, setRolId] = useState(5);
  const [estado, setEstado] = useState(true);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    if (!usuario) return;

    setNombres(usuario.nombres);
    setApellidos(usuario.apellidos);
    setDni(usuario.dni);
    setCodigo(usuario.codigo_estudiante ?? "");
    setTelefono(usuario.telefono ?? "");
    setRolId(usuario.rol_id);
    setEstado(usuario.estado);
    setError("");
    setMensaje("");
  }, [usuario]);

  async function actualizarUsuario(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!usuario) return;

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
      const respuesta = await fetch(
        `/api/admin/usuarios/${usuario.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            nombres,
            apellidos,
            dni,
            codigo_estudiante: rolId === 5 ? codigo : null,
            telefono: telefono || null,
            rol_id: rolId,
            estado,
          }),
        }
      );

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        setError(
          resultado.error ?? "No se pudo actualizar el usuario."
        );
        setGuardando(false);
        return;
      }

      setMensaje("Usuario actualizado correctamente.");
      onUsuarioActualizado();

      window.setTimeout(() => {
        setGuardando(false);
        onCerrar();
      }, 800);
    } catch (errorInesperado) {
      console.error(errorInesperado);
      setError("No se pudo conectar con el servidor.");
      setGuardando(false);
    }
  }

  return (
    <Modal
      abierto={abierto}
      titulo="Editar usuario"
      descripcion="Actualiza sus datos, rol y estado."
      onCerrar={() => {
        if (!guardando) onCerrar();
      }}
    >
      <form onSubmit={actualizarUsuario} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Nombres">
            <Input
              value={nombres}
              onChange={(event) => setNombres(event.target.value)}
              required
            />
          </FormField>

          <FormField label="Apellidos">
            <Input
              value={apellidos}
              onChange={(event) => setApellidos(event.target.value)}
              required
            />
          </FormField>

          <FormField label="DNI">
            <Input
              value={dni}
              onChange={(event) =>
                setDni(
                  event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 8)
                )
              }
              inputMode="numeric"
              required
            />
          </FormField>

          <FormField label="Rol">
            <Select
              value={rolId}
              onChange={(event) =>
                setRolId(Number(event.target.value))
              }
            >
              <option value={1}>Administrador</option>
              <option value={2}>Director</option>
              <option value={3}>Profesor</option>
              <option value={4}>Garita</option>
              <option value={5}>Estudiante</option>
            </Select>
          </FormField>

          {rolId === 5 && (
            <FormField label="Código institucional">
              <Input
                value={codigo}
                onChange={(event) => setCodigo(event.target.value)}
                required
              />
            </FormField>
          )}

          <FormField label="Teléfono">
            <Input
              value={telefono}
              onChange={(event) =>
                setTelefono(
                  event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 9)
                )
              }
              inputMode="numeric"
            />
          </FormField>

          <FormField label="Estado">
            <Select
              value={estado ? "activo" : "inactivo"}
              onChange={(event) =>
                setEstado(event.target.value === "activo")
              }
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </Select>
          </FormField>
        </div>

        <FormField label="Correo de acceso">
          <Input
            value={usuario?.correo ?? ""}
            disabled
          />
        </FormField>

        <p className="text-sm text-slate-500">
          El correo no se modifica desde este formulario porque también
          pertenece a Supabase Auth.
        </p>

        {error && (
          <p className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        {mensaje && (
          <p className="rounded-xl bg-primary-soft p-4 text-sm font-medium text-primary">
            {mensaje}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCerrar}
            disabled={guardando}
            className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={guardando}
            className="inline-flex items-center justify-center gap-2 rounded-xl btn-primary px-5 py-3 font-semibold text-white disabled:opacity-60"
          >
            {guardando && (
              <LoaderCircle size={20} className="animate-spin" />
            )}

            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </Modal>
  );
}