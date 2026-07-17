"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";
import Image from "next/image";
import { LoaderCircle, Store } from "lucide-react";

import {
  FormField,
  Input,
  Modal,
  Select,
} from "@/components/ui";
import { supabase } from "@/lib/supabase/client";

type NuevoEmprendimientoModalProps = {
  abierto: boolean;
  onCerrar: () => void;
  onEmprendimientoCreado: () => void;
};

type EmprendimientoCreado = {
  id: number;
  foto: string | null;
};

type RespuestaCrearEmprendimiento = {
  error?: string;
  mensaje?: string;
  emprendimiento?: EmprendimientoCreado;
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

export default function NuevoEmprendimientoModal({
  abierto,
  onCerrar,
  onEmprendimientoCreado,
}: NuevoEmprendimientoModalProps) {
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
    return () => {
      if (vistaPrevia) {
        URL.revokeObjectURL(vistaPrevia);
      }
    };
  }, [vistaPrevia]);

  function limpiarFormulario() {
    setTitulo("");
    setDescripcion("");
    setEstado(true);
    setFotoSeleccionada(null);
    setVistaPrevia("");
    setError("");
    setMensaje("");
  }

  function cerrarModal() {
    if (guardando) {
      return;
    }

    limpiarFormulario();
    onCerrar();
  }

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

  async function crearEmprendimiento(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

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
      const respuesta = await fetch("/api/emprendimientos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          titulo,
          descripcion,
          estado,
        }),
      });

      const resultado =
        (await respuesta.json()) as RespuestaCrearEmprendimiento;

      if (!respuesta.ok) {
        setError(
          resultado.error ??
            "No se pudo crear el emprendimiento."
        );
        setGuardando(false);
        return;
      }

      if (fotoSeleccionada && resultado.emprendimiento?.id) {
        setMensaje("Subiendo imagen del emprendimiento...");

        const formulario = new FormData();
        formulario.append("foto", fotoSeleccionada);

        const respuestaFoto = await fetch(
          `/api/emprendimientos/${resultado.emprendimiento.id}/foto`,
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
              "El emprendimiento se creo, pero no se pudo subir la imagen."
          );
          setGuardando(false);
          onEmprendimientoCreado();
          return;
        }
      }

      setMensaje(
        fotoSeleccionada
          ? "Emprendimiento e imagen creados correctamente."
          : "Emprendimiento creado correctamente."
      );
      onEmprendimientoCreado();

      window.setTimeout(() => {
        setGuardando(false);
        cerrarModal();
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
      titulo="Nuevo emprendimiento"
      descripcion="Publica un emprendimiento para la comunidad educativa."
      onCerrar={cerrarModal}
    >
      <form
        onSubmit={crearEmprendimiento}
        className="space-y-5"
      >
        <FormField label="Titulo">
          <Input
            value={titulo}
            onChange={(event) => setTitulo(event.target.value)}
            placeholder="Ejemplo: Cafeteria artesanal"
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
            placeholder="Describe el producto o servicio"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus-primary"
          />
        </FormField>

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

          <FormField label="Foto">
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={seleccionarFoto}
              disabled={guardando}
            />
          </FormField>
        </div>

        {vistaPrevia && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
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
            onClick={cerrarModal}
            disabled={guardando}
            className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={guardando}
            className="inline-flex items-center justify-center gap-2 rounded-xl btn-primary px-5 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardando ? (
              <LoaderCircle size={20} className="animate-spin" />
            ) : (
              <Store size={20} />
            )}
            {guardando ? "Publicando..." : "Publicar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
