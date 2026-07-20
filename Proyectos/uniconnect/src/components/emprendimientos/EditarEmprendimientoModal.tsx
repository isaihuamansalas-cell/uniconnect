"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";
import Image from "next/image";
import { LoaderCircle } from "lucide-react";

import FotoEmprendimiento from "@/components/emprendimientos/FotoEmprendimiento";
import {
  FormField,
  Input,
  Modal,
  Select,
} from "@/components/ui";
import { supabase } from "@/lib/supabase/client";

export type EmprendimientoEditable = {
  id: number;
  titulo: string;
  descripcion: string;
  foto: string | null;
  estado: boolean;
};

type EditarEmprendimientoModalProps = {
  abierto: boolean;
  emprendimiento: EmprendimientoEditable | null;
  onCerrar: () => void;
  onEmprendimientoActualizado: () => void;
};

type RespuestaApi = {
  error?: string;
  mensaje?: string;
};

const tiposImagenPermitidos = [
  "image/jpeg",
  "image/png",
  "image/webp",
];
const tamanoMaximoImagen = 5 * 1024 * 1024;

export default function EditarEmprendimientoModal({
  abierto,
  emprendimiento,
  onCerrar,
  onEmprendimientoActualizado,
}: EditarEmprendimientoModalProps) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [estado, setEstado] = useState(true);
  const [fotoSeleccionada, setFotoSeleccionada] =
    useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    if (!emprendimiento) {
      return;
    }

    setTitulo(emprendimiento.titulo);
    setDescripcion(emprendimiento.descripcion);
    setEstado(emprendimiento.estado);
    setFotoSeleccionada(null);
    setVistaPrevia("");
    setError("");
    setMensaje("");
  }, [emprendimiento]);

  useEffect(() => {
    return () => {
      if (vistaPrevia) {
        URL.revokeObjectURL(vistaPrevia);
      }
    };
  }, [vistaPrevia]);

  function seleccionarFoto(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const archivo = event.target.files?.[0] ?? null;

    if (vistaPrevia) {
      URL.revokeObjectURL(vistaPrevia);
    }

    setFotoSeleccionada(null);
    setVistaPrevia("");

    if (!archivo) {
      return;
    }

    if (!tiposImagenPermitidos.includes(archivo.type)) {
      setError("La imagen debe ser JPG, PNG o WEBP.");
      event.target.value = "";
      return;
    }

    if (archivo.size > tamanoMaximoImagen) {
      setError("La imagen no puede superar los 5 MB.");
      event.target.value = "";
      return;
    }

    setError("");
    setFotoSeleccionada(archivo);
    setVistaPrevia(URL.createObjectURL(archivo));
  }

  async function actualizarEmprendimiento(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!emprendimiento) {
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");

    const {
      data: { session },
      error: errorSesion,
    } = await supabase.auth.getSession();

    if (errorSesion || !session) {
      setError("Tu sesion termino. Vuelve a iniciar sesion.");
      setGuardando(false);
      return;
    }

    try {
      const respuesta = await fetch(
        `/api/emprendimientos/${emprendimiento.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            titulo,
            descripcion,
            estado,
          }),
        }
      );

      const resultado = (await respuesta.json()) as RespuestaApi;

      if (!respuesta.ok) {
        setError(
          resultado.error ??
            "No se pudo actualizar el emprendimiento."
        );
        setGuardando(false);
        return;
      }

      if (fotoSeleccionada) {
        setMensaje("Subiendo imagen del emprendimiento...");

        const formulario = new FormData();
        formulario.append("foto", fotoSeleccionada);

        const respuestaFoto = await fetch(
          `/api/emprendimientos/${emprendimiento.id}/foto`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            body: formulario,
          }
        );

        const resultadoFoto =
          (await respuestaFoto.json()) as RespuestaApi;

        if (!respuestaFoto.ok) {
          setError(
            resultadoFoto.error ??
              "Los datos se guardaron, pero no se pudo subir la imagen."
          );
          setGuardando(false);
          return;
        }
      }

      setMensaje(
        fotoSeleccionada
          ? "Emprendimiento e imagen actualizados correctamente."
          : "Emprendimiento actualizado correctamente."
      );
      onEmprendimientoActualizado();

      window.setTimeout(() => {
        setFotoSeleccionada(null);
        setVistaPrevia("");
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
      titulo="Editar emprendimiento"
      descripcion="Actualiza la publicacion, imagen y estado."
      onCerrar={() => {
        if (!guardando) {
          onCerrar();
        }
      }}
    >
      <form
        onSubmit={actualizarEmprendimiento}
        className="space-y-5"
      >
        <FormField label="Titulo">
          <Input
            value={titulo}
            onChange={(event) => setTitulo(event.target.value)}
            required
          />
        </FormField>

        <FormField label="Descripcion">
          <textarea
            value={descripcion}
            onChange={(event) =>
              setDescripcion(event.target.value)
            }
            rows={5}
            required
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400"
          />
        </FormField>

        {emprendimiento?.foto && !vistaPrevia && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
            <FotoEmprendimiento
              emprendimientoId={emprendimiento.id}
              version={emprendimiento.foto}
              className="h-56 w-full object-cover"
              fallbackClassName="flex h-56 w-full items-center justify-center bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            />
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
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

          <FormField label="Reemplazar foto">
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={seleccionarFoto}
              disabled={guardando}
            />
          </FormField>
        </div>

        {vistaPrevia && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
            <Image
              src={vistaPrevia}
              alt="Vista previa del emprendimiento"
              width={640}
              height={360}
              unoptimized
              className="h-56 w-full object-cover"
            />
          </div>
        )}

        {error && (
          <p className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        {mensaje && (
          <p className="rounded-xl bg-primary-soft p-4 text-sm font-medium text-primary">
            {mensaje}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 dark:border-slate-800 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCerrar}
            disabled={guardando}
            className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={guardando}
            className="inline-flex items-center justify-center gap-2 rounded-xl btn-primary px-5 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
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
