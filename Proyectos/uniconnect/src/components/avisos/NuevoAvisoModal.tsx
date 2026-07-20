"use client";

import { FormEvent, useState } from "react";
import { LoaderCircle, Megaphone } from "lucide-react";

import {
  FormField,
  Input,
  Modal,
  Select,
} from "@/components/ui";
import { supabase } from "@/lib/supabase/client";

type NuevoAvisoModalProps = {
  abierto: boolean;
  onCerrar: () => void;
  onAvisoCreado: () => void;
};

type RespuestaApi = {
  error?: string;
  mensaje?: string;
};

const tiposAviso = [
  "Comunicado",
  "Clases",
  "Examen",
  "Reunión",
  "Suspensión",
  "Emergencia",
  "Otro",
];

const destinatariosAviso = [
  "Todos",
  "Area academica",
  "Ciclo especifico",
];

export default function NuevoAvisoModal({
  abierto,
  onCerrar,
  onAvisoCreado,
}: NuevoAvisoModalProps) {
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [tipo, setTipo] = useState("Comunicado");
  const [destinatario, setDestinatario] = useState("Todos");
  const [areaAcademica, setAreaAcademica] = useState("");
  const [ciclo, setCiclo] = useState("");
  const [estado, setEstado] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  function limpiarFormulario() {
    setTitulo("");
    setContenido("");
    setTipo("Comunicado");
    setDestinatario("Todos");
    setAreaAcademica("");
    setCiclo("");
    setEstado(true);
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

  async function crearAviso(event: FormEvent<HTMLFormElement>) {
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
      const respuesta = await fetch("/api/avisos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          titulo,
          contenido,
          tipo,
          destinatario,
          area_academica:
            destinatario === "Area academica"
              ? areaAcademica
              : null,
          ciclo:
            destinatario === "Ciclo especifico" ? ciclo : null,
          estado,
        }),
      });

      const resultado = (await respuesta.json()) as RespuestaApi;

      if (!respuesta.ok) {
        setError(
          resultado.error ?? "No se pudo crear el aviso."
        );
        setGuardando(false);
        return;
      }

      setMensaje("Aviso creado correctamente.");
      onAvisoCreado();

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
      titulo="Nuevo aviso"
      descripcion="Publica un comunicado para la comunidad educativa."
      onCerrar={cerrarModal}
    >
      <form onSubmit={crearAviso} className="space-y-5">
        <FormField label="Titulo">
          <Input
            value={titulo}
            onChange={(event) => setTitulo(event.target.value)}
            placeholder="Ejemplo: Reunion academica"
            required
          />
        </FormField>

        <FormField label="Contenido">
          <textarea
            value={contenido}
            onChange={(event) =>
              setContenido(event.target.value)
            }
            rows={5}
            required
            placeholder="Escribe el contenido del aviso"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400"
          />
        </FormField>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Tipo de aviso">
            <Select
              value={tipo}
              onChange={(event) => setTipo(event.target.value)}
              required
            >
              {tiposAviso.map((tipoAviso) => (
                <option key={tipoAviso} value={tipoAviso}>
                  {tipoAviso}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Destinatario">
            <Select
              value={destinatario}
              onChange={(event) =>
                setDestinatario(event.target.value)
              }
              required
            >
              {destinatariosAviso.map((destino) => (
                <option key={destino} value={destino}>
                  {destino}
                </option>
              ))}
            </Select>
          </FormField>

          {destinatario === "Area academica" && (
            <FormField label="Area academica">
              <Input
                value={areaAcademica}
                onChange={(event) =>
                  setAreaAcademica(event.target.value)
                }
                placeholder="Ejemplo: Computacion"
                required
              />
            </FormField>
          )}

          {destinatario === "Ciclo especifico" && (
            <FormField label="Ciclo">
              <Input
                value={ciclo}
                onChange={(event) => setCiclo(event.target.value)}
                placeholder="Ejemplo: III"
                required
              />
            </FormField>
          )}

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
            onClick={cerrarModal}
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
            {guardando ? (
              <LoaderCircle size={20} className="animate-spin" />
            ) : (
              <Megaphone size={20} />
            )}
            {guardando ? "Publicando..." : "Publicar aviso"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
