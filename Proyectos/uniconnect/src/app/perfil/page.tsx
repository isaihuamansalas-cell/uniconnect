"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import {
  Camera,
  CheckCircle2,
  LoaderCircle,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import {
  type PerfilUsuario,
  usePerfil,
} from "@/components/auth/PerfilProvider";
import { useConfiguracion } from "@/components/configuracion/ConfiguracionProvider";
import MainLayout from "@/components/layout/MainLayout";
import { FormField, Input, Modal } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";

type RespuestaPerfil = {
  perfil?: PerfilUsuario;
  mensaje?: string;
  error?: string;
};

type RespuestaPassword = {
  mensaje?: string;
  error?: string;
};

const nombresRoles: Record<number, string> = {
  1: "Administrador",
  2: "Director",
  3: "Profesor",
  4: "Garita",
  5: "Estudiante",
};

const tiposImagenPermitidos = [
  "image/jpeg",
  "image/png",
  "image/webp",
];
const maximoImagenBytes = 2 * 1024 * 1024;

export default function PerfilPage() {
  const {
    perfil,
    session,
    cargandoPerfil,
    actualizarPerfilLocal,
  } = usePerfil();
  const { configuracion } = useConfiguracion();

  const [telefono, setTelefono] = useState("");
  const [guardandoTelefono, setGuardandoTelefono] = useState(false);
  const [mensajeTelefono, setMensajeTelefono] = useState("");
  const [errorTelefono, setErrorTelefono] = useState("");

  const [fotoSeleccionada, setFotoSeleccionada] =
    useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState("");
  const [modalFotoAbierto, setModalFotoAbierto] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [mensajeFoto, setMensajeFoto] = useState("");
  const [errorFoto, setErrorFoto] = useState("");

  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [cambiandoPassword, setCambiandoPassword] = useState(false);
  const [mensajePassword, setMensajePassword] = useState("");
  const [errorPassword, setErrorPassword] = useState("");

  useEffect(() => {
    setTelefono(perfil?.telefono ?? "");
  }, [perfil?.telefono]);

  useEffect(() => {
    if (!fotoSeleccionada) {
      setVistaPrevia("");
      return;
    }

    const url = URL.createObjectURL(fotoSeleccionada);
    setVistaPrevia(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [fotoSeleccionada]);

  async function obtenerAccessToken() {
    if (session?.access_token) {
      return session.access_token;
    }

    const {
      data: { session: sesionActual },
    } = await supabase.auth.getSession();

    return sesionActual?.access_token ?? "";
  }

  async function guardarTelefono(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGuardandoTelefono(true);
    setMensajeTelefono("");
    setErrorTelefono("");

    const accessToken = await obtenerAccessToken();

    if (!accessToken) {
      setErrorTelefono("Tu sesion termino. Vuelve a iniciar sesion.");
      setGuardandoTelefono(false);
      return;
    }

    const respuesta = await fetch("/api/perfil", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        telefono: telefono.trim() || null,
      }),
    });

    const resultado = (await respuesta.json()) as RespuestaPerfil;

    if (!respuesta.ok || !resultado.perfil) {
      setErrorTelefono(
        resultado.error ?? "No se pudo actualizar el telefono."
      );
      setGuardandoTelefono(false);
      return;
    }

    actualizarPerfilLocal(resultado.perfil);
    setMensajeTelefono("Telefono actualizado correctamente.");
    setGuardandoTelefono(false);
  }

  function seleccionarFoto(event: ChangeEvent<HTMLInputElement>) {
    const archivo = event.target.files?.[0] ?? null;
    event.target.value = "";
    setMensajeFoto("");
    setErrorFoto("");

    if (!archivo) {
      return;
    }

    if (!tiposImagenPermitidos.includes(archivo.type)) {
      setErrorFoto("La imagen debe ser JPG, PNG o WEBP.");
      return;
    }

    if (archivo.size > maximoImagenBytes) {
      setErrorFoto("La imagen no puede superar los 2 MB.");
      return;
    }

    setFotoSeleccionada(archivo);
    setModalFotoAbierto(true);
  }

  function cancelarFoto() {
    if (subiendoFoto) {
      return;
    }

    setFotoSeleccionada(null);
    setModalFotoAbierto(false);
  }

  async function guardarFoto() {
    if (!fotoSeleccionada) {
      return;
    }

    setSubiendoFoto(true);
    setMensajeFoto("");
    setErrorFoto("");

    const accessToken = await obtenerAccessToken();

    if (!accessToken) {
      setErrorFoto("Tu sesion termino. Vuelve a iniciar sesion.");
      setSubiendoFoto(false);
      return;
    }

    const formulario = new FormData();
    formulario.append("foto", fotoSeleccionada);

    const respuesta = await fetch("/api/perfil/foto", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formulario,
    });

    const resultado = (await respuesta.json()) as RespuestaPerfil;

    if (!respuesta.ok || !resultado.perfil) {
      setErrorFoto(
        resultado.error ?? "No se pudo actualizar la foto."
      );
      setSubiendoFoto(false);
      return;
    }

    actualizarPerfilLocal(resultado.perfil);
    setMensajeFoto("Foto actualizada correctamente.");
    setFotoSeleccionada(null);
    setModalFotoAbierto(false);
    setSubiendoFoto(false);
  }

  async function cambiarPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCambiandoPassword(true);
    setMensajePassword("");
    setErrorPassword("");

    if (passwordNueva.length < 8) {
      setErrorPassword(
        "La nueva contrasena debe tener al menos 8 caracteres."
      );
      setCambiandoPassword(false);
      return;
    }

    if (!confirmacion) {
      setErrorPassword("Confirma la nueva contrasena.");
      setCambiandoPassword(false);
      return;
    }

    if (passwordNueva !== confirmacion) {
      setErrorPassword("La confirmacion no coincide.");
      setCambiandoPassword(false);
      return;
    }

    const accessToken = await obtenerAccessToken();

    if (!accessToken) {
      setErrorPassword("Tu sesion termino. Vuelve a iniciar sesion.");
      setCambiandoPassword(false);
      return;
    }

    const respuesta = await fetch("/api/perfil/password", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        password_actual: passwordActual,
        password_nueva: passwordNueva,
        confirmacion,
      }),
    });

    const resultado = (await respuesta.json()) as RespuestaPassword;

    if (!respuesta.ok) {
      setErrorPassword(
        resultado.error ?? "No se pudo actualizar la contrasena."
      );
      setCambiandoPassword(false);
      return;
    }

    setPasswordActual("");
    setPasswordNueva("");
    setConfirmacion("");
    setMensajePassword(
      resultado.mensaje ?? "Contrasena actualizada correctamente."
    );
    setCambiandoPassword(false);
  }

  return (
    <MainLayout>
      <section className="space-y-8">
        <div>
          <p className="text-sm font-medium text-primary">
            Cuenta personal
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">
            Mi perfil
          </h1>

          <p className="mt-2 text-slate-600 dark:text-slate-300">
            {configuracion.nombre_institucion}
          </p>
        </div>

        {cargandoPerfil ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm dark:border dark:border-slate-800 dark:bg-slate-900">
            <p className="text-slate-500 dark:text-slate-400">Cargando perfil...</p>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6">
              <section className="rounded-2xl bg-white p-5 shadow-sm dark:border dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary-soft p-2 text-primary ">
                    <UserRound size={22} />
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      Informacion personal
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Estos datos solo pueden ser modificados por un
                      administrador.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <CampoLectura
                    etiqueta="Nombres"
                    valor={perfil?.nombres ?? ""}
                  />
                  <CampoLectura
                    etiqueta="Apellidos"
                    valor={perfil?.apellidos ?? ""}
                  />
                  <CampoLectura
                    etiqueta="Correo"
                    valor={perfil?.correo ?? ""}
                  />
                  <CampoLectura
                    etiqueta="DNI"
                    valor={perfil?.dni ?? ""}
                  />
                  <CampoLectura
                    etiqueta="Codigo de estudiante"
                    valor={
                      perfil?.codigo_estudiante ?? "No corresponde"
                    }
                  />
                  <CampoLectura
                    etiqueta="Rol"
                    valor={
                      perfil
                        ? nombresRoles[perfil.rol_id] ?? "Sin rol"
                        : ""
                    }
                  />
                  <CampoLectura
                    etiqueta="Estado de la cuenta"
                    valor={perfil?.estado ? "Activo" : "Inactivo"}
                  />
                </div>

                <form
                  onSubmit={guardarTelefono}
                  className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-800"
                >
                  <FormField label="Telefono">
                    <Input
                      value={telefono}
                      onChange={(event) =>
                        setTelefono(
                          event.target.value
                            .replace(/\D/g, "")
                            .slice(0, 15)
                        )
                      }
                      inputMode="numeric"
                      placeholder="Numero de telefono"
                      disabled={guardandoTelefono}
                    />
                  </FormField>

                  {errorTelefono && (
                    <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
                      {errorTelefono}
                    </p>
                  )}

                  {mensajeTelefono && (
                    <p className="mt-4 rounded-xl bg-primary-soft p-4 text-sm font-medium text-primary ">
                      {mensajeTelefono}
                    </p>
                  )}

                  <div className="mt-5 flex justify-end">
                    <button
                      type="submit"
                      disabled={guardandoTelefono}
                      className="inline-flex items-center justify-center gap-2 rounded-xl btn-primary px-5 py-3 font-semibold text-white transition disabled:opacity-60"
                    >
                      {guardandoTelefono ? (
                        <LoaderCircle
                          size={20}
                          className="animate-spin"
                        />
                      ) : (
                        <Save size={20} />
                      )}
                      {guardandoTelefono
                        ? "Guardando..."
                        : "Guardar telefono"}
                    </button>
                  </div>
                </form>
              </section>

              <section className="rounded-2xl bg-white p-5 shadow-sm dark:border dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary-soft p-2 text-primary ">
                    <ShieldCheck size={22} />
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      Seguridad y contrasena
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Cambia tu contrasena validando primero la actual.
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={cambiarPassword}
                  className="mt-6 grid gap-5"
                >
                  <FormField label="Contrasena actual">
                    <Input
                      type="password"
                      value={passwordActual}
                      onChange={(event) =>
                        setPasswordActual(event.target.value)
                      }
                      autoComplete="current-password"
                      disabled={cambiandoPassword}
                    />
                  </FormField>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField label="Nueva contrasena">
                      <Input
                        type="password"
                        value={passwordNueva}
                        onChange={(event) =>
                          setPasswordNueva(event.target.value)
                        }
                        minLength={8}
                        autoComplete="new-password"
                        disabled={cambiandoPassword}
                      />
                    </FormField>

                    <FormField label="Confirmar nueva contrasena">
                      <Input
                        type="password"
                        value={confirmacion}
                        onChange={(event) =>
                          setConfirmacion(event.target.value)
                        }
                        minLength={8}
                        autoComplete="new-password"
                        disabled={cambiandoPassword}
                      />
                    </FormField>
                  </div>

                  {errorPassword && (
                    <p className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
                      {errorPassword}
                    </p>
                  )}

                  {mensajePassword && (
                    <p className="rounded-xl bg-primary-soft p-4 text-sm font-medium text-primary ">
                      {mensajePassword}
                    </p>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={cambiandoPassword}
                      className="inline-flex items-center justify-center gap-2 rounded-xl btn-primary px-5 py-3 font-semibold text-white transition disabled:opacity-60"
                    >
                      {cambiandoPassword && (
                        <LoaderCircle
                          size={20}
                          className="animate-spin"
                        />
                      )}
                      {cambiandoPassword
                        ? "Actualizando..."
                        : "Cambiar contrasena"}
                    </button>
                  </div>
                </form>
              </section>
            </div>

            <section className="rounded-2xl bg-white p-5 shadow-sm dark:border dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary-soft p-2 text-primary ">
                  <Camera size={22} />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Foto
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Formatos permitidos: JPG, PNG o WEBP. Maximo 2 MB.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col items-center gap-5">
                <FotoPerfilGrande
                  accessToken={session?.access_token ?? ""}
                  tieneFoto={perfil?.tiene_foto ?? false}
                  version={perfil?.foto_version ?? ""}
                />

                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl btn-primary px-5 py-3 font-semibold text-white transition">
                  <Camera size={20} />
                  Seleccionar foto
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={seleccionarFoto}
                    className="sr-only"
                    disabled={subiendoFoto}
                  />
                </label>
              </div>

              {errorFoto && (
                <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
                  {errorFoto}
                </p>
              )}

              {mensajeFoto && (
                <p className="mt-5 rounded-xl bg-primary-soft p-4 text-sm font-medium text-primary ">
                  {mensajeFoto}
                </p>
              )}
            </section>
          </div>
        )}
      </section>

      <Modal
        abierto={modalFotoAbierto}
        titulo="Vista previa"
        descripcion="Revisa la imagen antes de guardarla como foto de perfil."
        onCerrar={cancelarFoto}
      >
        <div className="space-y-5">
          {vistaPrevia && (
            <Image
              src={vistaPrevia}
              alt="Vista previa de la foto de perfil"
              width={480}
              height={480}
              unoptimized
              className="mx-auto aspect-square w-full max-w-sm rounded-2xl object-cover"
            />
          )}

          {errorFoto && (
            <p className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {errorFoto}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 dark:border-slate-800 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={cancelarFoto}
              disabled={subiendoFoto}
              className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={guardarFoto}
              disabled={subiendoFoto}
              className="inline-flex items-center justify-center gap-2 rounded-xl btn-primary px-5 py-3 font-semibold text-white transition disabled:opacity-60"
            >
              {subiendoFoto ? (
                <LoaderCircle size={20} className="animate-spin" />
              ) : (
                <CheckCircle2 size={20} />
              )}
              {subiendoFoto ? "Guardando..." : "Guardar foto"}
            </button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}

type CampoLecturaProps = {
  etiqueta: string;
  valor: string;
};

function CampoLectura({ etiqueta, valor }: CampoLecturaProps) {
  return (
    <FormField label={etiqueta}>
      <Input value={valor} disabled readOnly />
    </FormField>
  );
}

type FotoPerfilGrandeProps = {
  accessToken: string;
  tieneFoto: boolean;
  version: string;
};

function FotoPerfilGrande({
  accessToken,
  tieneFoto,
  version,
}: FotoPerfilGrandeProps) {
  const [fotoUrl, setFotoUrl] = useState("");

  useEffect(() => {
    let cancelado = false;
    let urlTemporal = "";

    async function cargarFoto() {
      setFotoUrl("");

      if (!accessToken || !tieneFoto) {
        return;
      }

      const respuesta = await fetch(
        `/api/perfil/foto?v=${encodeURIComponent(version)}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        }
      );

      if (!respuesta.ok || cancelado) {
        return;
      }

      const imagen = await respuesta.blob();
      urlTemporal = URL.createObjectURL(imagen);

      if (!cancelado) {
        setFotoUrl(urlTemporal);
      }
    }

    void cargarFoto();

    return () => {
      cancelado = true;

      if (urlTemporal) {
        URL.revokeObjectURL(urlTemporal);
      }
    };
  }, [accessToken, tieneFoto, version]);

  if (!fotoUrl) {
    return (
      <div className="flex aspect-square w-full max-w-xs items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        <UserRound size={72} />
      </div>
    );
  }

  return (
    <Image
      src={fotoUrl}
      alt="Foto de perfil"
      width={320}
      height={320}
      unoptimized
      className="aspect-square w-full max-w-xs rounded-2xl object-cover"
    />
  );
}
