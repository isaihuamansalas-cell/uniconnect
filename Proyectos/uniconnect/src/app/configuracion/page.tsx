"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Building2,
  ImageUp,
  LoaderCircle,
  Palette,
  Save,
  ShieldAlert,
} from "lucide-react";

import { useConfiguracion } from "@/components/configuracion/ConfiguracionProvider";
import MainLayout from "@/components/layout/MainLayout";
import { FormField, Input, Modal, Select } from "@/components/ui";
import { obtenerUrlLogo } from "@/lib/configuracion/defaults";
import { supabase } from "@/lib/supabase/client";

type Perfil = {
  id: string;
  rol_id: number;
  estado: boolean;
};

type FormularioConfiguracion = {
  nombre_sistema: string;
  nombre_institucion: string;
  correo_institucional: string;
  telefono: string;
  direccion: string;
  color_principal: string;
  color_secundario: string;
};

type RespuestaConfiguracion = {
  mensaje?: string;
  error?: string;
  configuracion?: {
    id: number;
    nombre_sistema: string;
    nombre_institucion: string;
    correo_institucional: string | null;
    telefono: string | null;
    direccion: string | null;
    logo_path: string | null;
    color_principal: string;
    color_secundario: string;
    updated_at: string;
    updated_by: string | null;
  };
};

const coloresPredefinidos = [
  {
    nombre: "Emerald",
    principal: "#047857",
    secundario: "#0f172a",
  },
  {
    nombre: "Blue",
    principal: "#1d4ed8",
    secundario: "#111827",
  },
  {
    nombre: "Rose",
    principal: "#be123c",
    secundario: "#1f2937",
  },
];

function validarImagen(archivo: File) {
  const tiposPermitidos = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/svg+xml",
  ];

  if (!tiposPermitidos.includes(archivo.type)) {
    return "El logo debe ser JPG, PNG, WEBP o SVG.";
  }

  if (archivo.size > 2 * 1024 * 1024) {
    return "El logo no debe superar los 2 MB.";
  }

  return "";
}

export default function ConfiguracionPage() {
  const router = useRouter();
  const {
    configuracion,
    actualizarConfiguracionLocal,
    recargarConfiguracion,
  } = useConfiguracion();

  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [cargandoPerfil, setCargandoPerfil] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [vistaPreviaLogo, setVistaPreviaLogo] = useState<string | null>(
    null
  );
  const [formulario, setFormulario] =
    useState<FormularioConfiguracion>({
      nombre_sistema: configuracion.nombre_sistema,
      nombre_institucion: configuracion.nombre_institucion,
      correo_institucional:
        configuracion.correo_institucional ?? "",
      telefono: configuracion.telefono ?? "",
      direccion: configuracion.direccion ?? "",
      color_principal: configuracion.color_principal,
      color_secundario: configuracion.color_secundario,
    });

  const esAdministrador =
    perfil?.rol_id === 1 && perfil.estado === true;
  const logoUrl = useMemo(
    () => obtenerUrlLogo(configuracion.logo_path),
    [configuracion.logo_path]
  );

  useEffect(() => {
    setFormulario({
      nombre_sistema: configuracion.nombre_sistema,
      nombre_institucion: configuracion.nombre_institucion,
      correo_institucional:
        configuracion.correo_institucional ?? "",
      telefono: configuracion.telefono ?? "",
      direccion: configuracion.direccion ?? "",
      color_principal: configuracion.color_principal,
      color_secundario: configuracion.color_secundario,
    });
  }, [configuracion]);

  useEffect(() => {
    async function cargarPerfil() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("usuarios")
        .select("id, rol_id, estado")
        .eq("id", user.id)
        .single();

      if (error) {
        setError("No se pudo validar tu perfil.");
        setCargandoPerfil(false);
        return;
      }

      setPerfil(data as Perfil);
      setCargandoPerfil(false);
    }

    cargarPerfil();
  }, [router]);

  function actualizarCampo(
    campo: keyof FormularioConfiguracion,
    valor: string
  ) {
    setFormulario((formularioActual) => ({
      ...formularioActual,
      [campo]: valor,
    }));
  }

  function aplicarPaleta(nombre: string) {
    const paleta = coloresPredefinidos.find(
      (color) => color.nombre === nombre
    );

    if (!paleta) {
      return;
    }

    setFormulario((formularioActual) => ({
      ...formularioActual,
      color_principal: paleta.principal,
      color_secundario: paleta.secundario,
    }));
  }

  async function guardarConfiguracion(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!esAdministrador) {
      setError("Solo un administrador activo puede editar.");
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.replace("/login");
      return;
    }

    try {
      const respuesta = await fetch("/api/configuracion", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...formulario,
          correo_institucional:
            formulario.correo_institucional.trim() || null,
          telefono: formulario.telefono.trim() || null,
          direccion: formulario.direccion.trim() || null,
        }),
      });
      const resultado =
        (await respuesta.json()) as RespuestaConfiguracion;

      if (!respuesta.ok || !resultado.configuracion) {
        setError(
          resultado.error ??
            "No se pudo actualizar la configuracion."
        );
        return;
      }

      actualizarConfiguracionLocal(resultado.configuracion);
      setMensaje(
        resultado.mensaje ??
          "Configuracion actualizada correctamente."
      );
      setModalAbierto(true);
    } catch (errorInesperado) {
      console.error(errorInesperado);
      setError("No se pudo conectar con el servidor.");
    } finally {
      setGuardando(false);
    }
  }

  async function subirLogo(event: ChangeEvent<HTMLInputElement>) {
    const archivo = event.target.files?.[0];

    if (!archivo) {
      return;
    }

    const errorImagen = validarImagen(archivo);

    if (errorImagen) {
      setError(errorImagen);
      return;
    }

    if (!esAdministrador) {
      setError("Solo un administrador activo puede subir el logo.");
      return;
    }

    setSubiendoLogo(true);
    setError("");
    setMensaje("");
    setVistaPreviaLogo(URL.createObjectURL(archivo));

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.replace("/login");
      return;
    }

    const formData = new FormData();
    formData.append("logo", archivo);

    try {
      const respuesta = await fetch("/api/configuracion/logo", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });
      const resultado =
        (await respuesta.json()) as RespuestaConfiguracion;

      if (!respuesta.ok || !resultado.configuracion) {
        setError(resultado.error ?? "No se pudo subir el logo.");
        return;
      }

      actualizarConfiguracionLocal(resultado.configuracion);
      await recargarConfiguracion();
      setMensaje("Logo actualizado correctamente.");
      setModalAbierto(true);
    } catch (errorInesperado) {
      console.error(errorInesperado);
      setError("No se pudo conectar con el servidor.");
    } finally {
      setSubiendoLogo(false);
      event.target.value = "";
    }
  }

  if (cargandoPerfil) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-950">
        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
          <LoaderCircle size={22} className="animate-spin" />
          Cargando configuracion...
        </div>
      </main>
    );
  }

  return (
    <MainLayout>
      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-primary text-sm font-medium">
              Administracion
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">
              Configuracion
            </h1>

            <p className="mt-2 text-slate-600 dark:text-slate-300">
              Administra la identidad institucional del sistema.
            </p>
          </div>
        </div>

        {!esAdministrador && (
          <div className="mt-8 flex items-start gap-3 rounded-2xl bg-amber-50 p-5 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <ShieldAlert size={22} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Solo lectura</p>
              <p className="mt-1 text-sm">
                Solo un administrador activo puede modificar la
                configuracion.
              </p>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        {mensaje && (
          <p className="mt-6 rounded-xl bg-primary-soft p-4 text-sm font-medium text-primary">
            {mensaje}
          </p>
        )}

        <div className="mt-8 grid gap-6 xl:grid-cols-[360px_1fr]">
          <div className="rounded-2xl bg-white p-4 shadow-sm dark:border dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Building2 size={22} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 dark:text-slate-100">
                  Logo institucional
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  JPG, PNG, WEBP o SVG. Maximo 2 MB.
                </p>
              </div>
            </div>

            <div className="mt-6 flex h-44 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800">
              {vistaPreviaLogo || logoUrl ? (
                <Image
                  src={vistaPreviaLogo ?? logoUrl ?? ""}
                  alt="Logo institucional"
                  width={180}
                  height={120}
                  unoptimized
                  className="max-h-36 w-auto object-contain"
                />
              ) : (
                <div className="text-center text-slate-400 dark:text-slate-500">
                  <ImageUp size={34} className="mx-auto" />
                  <p className="mt-2 text-sm">Sin logo cargado</p>
                </div>
              )}
            </div>

            <label
              className={
                esAdministrador
                  ? "btn-primary mt-5 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold transition"
                  : "mt-5 inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-300 px-5 py-3 font-semibold text-white dark:bg-slate-700 dark:text-slate-300"
              }
            >
              {subiendoLogo ? (
                <LoaderCircle size={20} className="animate-spin" />
              ) : (
                <ImageUp size={20} />
              )}
              {subiendoLogo ? "Subiendo..." : "Subir logo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                className="hidden"
                disabled={!esAdministrador || subiendoLogo}
                onChange={subirLogo}
              />
            </label>
          </div>

          <form
            onSubmit={guardarConfiguracion}
            className="rounded-2xl bg-white p-4 shadow-sm dark:border dark:border-slate-800 dark:bg-slate-900 sm:p-6"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Palette size={22} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 dark:text-slate-100">
                  Datos generales
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Estos datos se muestran en Login, Header, Sidebar y
                  Reportes.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <FormField label="Nombre del sistema">
                <Input
                  value={formulario.nombre_sistema}
                  onChange={(event) =>
                    actualizarCampo(
                      "nombre_sistema",
                      event.target.value
                    )
                  }
                  disabled={!esAdministrador}
                />
              </FormField>

              <FormField label="Nombre de la institucion">
                <Input
                  value={formulario.nombre_institucion}
                  onChange={(event) =>
                    actualizarCampo(
                      "nombre_institucion",
                      event.target.value
                    )
                  }
                  disabled={!esAdministrador}
                />
              </FormField>

              <FormField label="Correo institucional">
                <Input
                  type="email"
                  value={formulario.correo_institucional}
                  onChange={(event) =>
                    actualizarCampo(
                      "correo_institucional",
                      event.target.value
                    )
                  }
                  disabled={!esAdministrador}
                />
              </FormField>

              <FormField label="Telefono">
                <Input
                  value={formulario.telefono}
                  onChange={(event) =>
                    actualizarCampo("telefono", event.target.value)
                  }
                  disabled={!esAdministrador}
                />
              </FormField>

              <div className="md:col-span-2">
                <FormField label="Direccion">
                  <Input
                    value={formulario.direccion}
                    onChange={(event) =>
                      actualizarCampo("direccion", event.target.value)
                    }
                    disabled={!esAdministrador}
                  />
                </FormField>
              </div>

              <FormField label="Paleta sugerida">
                <Select
                  defaultValue=""
                  onChange={(event) =>
                    aplicarPaleta(event.target.value)
                  }
                  disabled={!esAdministrador}
                >
                  <option value="">Seleccionar paleta</option>
                  {coloresPredefinidos.map((color) => (
                    <option key={color.nombre} value={color.nombre}>
                      {color.nombre}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Color principal">
                <div className="flex gap-3">
                  <Input
                    type="color"
                    value={formulario.color_principal}
                    onChange={(event) =>
                      actualizarCampo(
                        "color_principal",
                        event.target.value
                      )
                    }
                    disabled={!esAdministrador}
                    className="h-12 w-16 p-1"
                  />
                  <Input
                    value={formulario.color_principal}
                    onChange={(event) =>
                      actualizarCampo(
                        "color_principal",
                        event.target.value
                      )
                    }
                    disabled={!esAdministrador}
                  />
                </div>
              </FormField>

              <FormField label="Color secundario">
                <div className="flex gap-3">
                  <Input
                    type="color"
                    value={formulario.color_secundario}
                    onChange={(event) =>
                      actualizarCampo(
                        "color_secundario",
                        event.target.value
                      )
                    }
                    disabled={!esAdministrador}
                    className="h-12 w-16 p-1"
                  />
                  <Input
                    value={formulario.color_secundario}
                    onChange={(event) =>
                      actualizarCampo(
                        "color_secundario",
                        event.target.value
                      )
                    }
                    disabled={!esAdministrador}
                  />
                </div>
              </FormField>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={!esAdministrador || guardando}
                className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {guardando ? (
                  <LoaderCircle size={20} className="animate-spin" />
                ) : (
                  <Save size={20} />
                )}
                Guardar configuracion
              </button>
            </div>
          </form>
        </div>
      </section>

      <Modal
        abierto={modalAbierto}
        titulo="Configuracion actualizada"
        descripcion="Los cambios ya estan disponibles para los modulos integrados."
        onCerrar={() => setModalAbierto(false)}
      >
        <button
          type="button"
          onClick={() => setModalAbierto(false)}
          className="btn-primary inline-flex items-center justify-center rounded-xl px-5 py-3 font-semibold transition"
        >
          Entendido
        </button>
      </Modal>
    </MainLayout>
  );
}
