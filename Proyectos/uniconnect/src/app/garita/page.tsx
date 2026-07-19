"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Car,
  CheckCircle2,
  LoaderCircle,
  Search,
} from "lucide-react";

import ConfirmarSalidaModal from "@/components/garita/ConfirmarSalidaModal";
import HistorialReciente from "@/components/garita/HistorialReciente";
import type {
  EstudianteGarita,
  SalidaReciente,
  VehiculoGarita,
} from "@/components/garita/types";
import MainLayout from "@/components/layout/MainLayout";
import FotoUsuario from "@/components/usuarios/FotoUsuario";
import FotoVehiculo from "@/components/vehiculos/FotoVehiculo";
import { FormField, Input } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";

type ResultadoBusqueda = {
  estudiante?: EstudianteGarita;
  vehiculos?: VehiculoGarita[];
  vehiculo_coincidente_id?: number | null;
  error?: string;
};

type ResultadoSalida = {
  mensaje?: string;
  error?: string;
};

type RespuestaHistorial = {
  salidas?: SalidaReciente[];
  error?: string;
};

const longitudMaximaBusqueda = 30;

export default function GaritaPage() {
  const router = useRouter();
  const envioEnCursoRef = useRef(false);
  const [busqueda, setBusqueda] = useState("");
  const [estudiante, setEstudiante] = useState<EstudianteGarita | null>(null);
  const [vehiculos, setVehiculos] = useState<VehiculoGarita[]>([]);
  const [vehiculoSeleccionado, setVehiculoSeleccionado] =
    useState<number | null>(null);
  const [accessToken, setAccessToken] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [fechaHoraModal, setFechaHoraModal] = useState(new Date());
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [salidasRecientes, setSalidasRecientes] = useState<SalidaReciente[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const [errorHistorial, setErrorHistorial] = useState("");

  const cargarHistorial = useCallback(async () => {
    setCargandoHistorial(true);
    setErrorHistorial("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.replace("/login");
      setCargandoHistorial(false);
      return;
    }

    setAccessToken(session.access_token);

    try {
      const respuesta = await fetch("/api/garita/salidas?vista=reciente", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const resultado = (await respuesta.json()) as RespuestaHistorial;

      if (!respuesta.ok) {
        setErrorHistorial(
          resultado.error ?? "No se pudo cargar el historial reciente."
        );
        return;
      }

      setSalidasRecientes((resultado.salidas ?? []).slice(0, 5));
    } catch (errorInesperado) {
      console.error(errorInesperado);
      setErrorHistorial("No se pudo conectar con el servidor.");
    } finally {
      setCargandoHistorial(false);
    }
  }, [router]);

  useEffect(() => {
    void cargarHistorial();
  }, [cargarHistorial]);

  async function buscar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const texto = busqueda.trim().toUpperCase();

    if (texto.length < 3 || texto.length > longitudMaximaBusqueda) {
      setError("La busqueda debe tener entre 3 y 30 caracteres.");
      return;
    }

    setBusqueda(texto);
    setBuscando(true);
    setError("");
    setMensaje("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.replace("/login");
      setBuscando(false);
      return;
    }

    setAccessToken(session.access_token);

    try {
      const respuesta = await fetch(
        `/api/garita/buscar?busqueda=${encodeURIComponent(texto)}`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        }
      );
      const resultado = (await respuesta.json()) as ResultadoBusqueda;

      if (!respuesta.ok || !resultado.estudiante) {
        setEstudiante(null);
        setVehiculos([]);
        setVehiculoSeleccionado(null);
        setError(resultado.error ?? "No se pudo consultar la informacion.");
        return;
      }

      const nuevosVehiculos = resultado.vehiculos ?? [];
      setEstudiante(resultado.estudiante);
      setVehiculos(nuevosVehiculos);
      setVehiculoSeleccionado(
        resultado.vehiculo_coincidente_id ?? nuevosVehiculos[0]?.id ?? null
      );
    } catch (errorInesperado) {
      console.error(errorInesperado);
      setError("No se pudo conectar con el servidor.");
    } finally {
      setBuscando(false);
    }
  }

  const vehiculoActual =
    vehiculos.find((vehiculo) => vehiculo.id === vehiculoSeleccionado) ?? null;

  function abrirConfirmacion() {
    if (!estudiante || !vehiculoActual) {
      setError("Selecciona un vehiculo para continuar.");
      return;
    }

    setError("");
    setMensaje("");
    setFechaHoraModal(new Date());
    setModalAbierto(true);
  }

  const cerrarConfirmacion = useCallback(() => {
    if (!envioEnCursoRef.current) setModalAbierto(false);
  }, []);

  async function confirmarSalida() {
    if (
      envioEnCursoRef.current ||
      !estudiante ||
      !vehiculoActual ||
      !estudiante.estado ||
      !vehiculoActual.estado
    ) {
      return;
    }

    envioEnCursoRef.current = true;
    setRegistrando(true);
    setError("");
    setMensaje("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const respuesta = await fetch("/api/garita/salidas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          vehiculo_id: vehiculoActual.id,
          estudiante_id: estudiante.id,
        }),
      });
      const resultado = (await respuesta.json()) as ResultadoSalida;

      if (!respuesta.ok) {
        setError(resultado.error ?? "No se pudo registrar la salida.");
        setModalAbierto(false);
        return;
      }

      setModalAbierto(false);
      setMensaje(
        `${resultado.mensaje ?? "Salida autorizada correctamente."} Placa ${vehiculoActual.placa}.`
      );
      await cargarHistorial();
    } catch (errorInesperado) {
      console.error(errorInesperado);
      setError("No se pudo conectar con el servidor.");
      setModalAbierto(false);
    } finally {
      envioEnCursoRef.current = false;
      setRegistrando(false);
    }
  }

  return (
    <MainLayout>
      <section className="min-w-0">
        <div>
          <p className="text-sm font-medium text-primary">Control de garita</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">
            Autorizar salida
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Busca por DNI, codigo institucional o placa del vehiculo.
          </p>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm dark:border dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <form
            onSubmit={buscar}
            className="flex flex-col gap-4 md:flex-row md:items-end"
          >
            <div className="min-w-0 flex-1">
              <FormField label="DNI, codigo institucional o placa">
                <div className="relative">
                  <Search
                    size={20}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <Input
                    type="search"
                    value={busqueda}
                    maxLength={longitudMaximaBusqueda}
                    onChange={(event) => setBusqueda(event.target.value)}
                    placeholder="Ejemplo: 12345678 o ABC-123"
                    className="min-h-12 pl-11 uppercase"
                    autoComplete="off"
                  />
                </div>
              </FormField>
            </div>
            <button
              type="submit"
              disabled={buscando}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl btn-primary px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
            >
              {buscando ? (
                <LoaderCircle size={20} className="animate-spin" />
              ) : (
                <Search size={20} />
              )}
              {buscando ? "Buscando..." : "Buscar"}
            </button>
          </form>

          <div aria-live="polite" aria-atomic="true">
            {error && (
              <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </p>
            )}
            {mensaje && (
              <p className="mt-5 flex items-center gap-3 rounded-xl bg-primary-soft p-4 text-sm font-semibold text-primary">
                <CheckCircle2 className="shrink-0" size={22} />
                {mensaje}
              </p>
            )}
          </div>
        </div>

        {estudiante && (
          <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
            <article className="rounded-2xl bg-white p-5 text-center shadow-sm dark:border dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <div className="flex justify-center">
                <FotoUsuario
                  usuarioId={estudiante.id}
                  version={estudiante.foto_version}
                  accessToken={accessToken}
                  className="h-36 w-36 rounded-2xl object-cover sm:h-44 sm:w-44"
                  fallbackClassName="flex h-36 w-36 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300 sm:h-44 sm:w-44"
                  iconSize={54}
                />
              </div>
              <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-primary">
                Estudiante
              </p>
              <h2 className="mt-1 break-words text-xl font-bold text-slate-900 dark:text-slate-100">
                {estudiante.nombres} {estudiante.apellidos}
              </h2>
              <span
                className={
                  estudiante.estado
                    ? "mt-3 inline-flex rounded-full bg-primary-soft px-3 py-1 text-sm font-bold text-primary"
                    : "mt-3 inline-flex rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-800 dark:bg-red-950/50 dark:text-red-200"
                }
              >
                {estudiante.estado ? "Activo" : "Inactivo"}
              </span>
              {!estudiante.estado && (
                <div className="mt-4 flex gap-2 rounded-xl bg-red-50 p-3 text-left text-sm font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-200">
                  <AlertTriangle className="shrink-0" size={20} />
                  El estudiante esta inactivo. No puede registrar salidas.
                </div>
              )}
              <dl className="mt-5 grid gap-3 text-left text-sm">
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                  <dt className="text-slate-500 dark:text-slate-400">DNI</dt>
                  <dd className="font-bold text-slate-900 dark:text-slate-100">
                    {estudiante.dni}
                  </dd>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                  <dt className="text-slate-500 dark:text-slate-400">
                    Codigo institucional
                  </dt>
                  <dd className="break-words font-bold text-slate-900 dark:text-slate-100">
                    {estudiante.codigo_estudiante ?? "No registrado"}
                  </dd>
                </div>
              </dl>
            </article>

            <section className="min-w-0 rounded-2xl bg-white p-4 shadow-sm dark:border dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Vehiculos registrados
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Se muestran vehiculos activos e inactivos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={abrirConfirmacion}
                  disabled={!vehiculoActual}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl btn-primary px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  <CheckCircle2 size={20} />
                  Revisar salida
                </button>
              </div>

              {vehiculos.length === 0 ? (
                <div className="mt-6 rounded-xl bg-slate-50 p-8 text-center text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <Car size={36} className="mx-auto" />
                  <p className="mt-3">El estudiante no tiene vehiculos registrados.</p>
                </div>
              ) : (
                <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2">
                  {vehiculos.map((vehiculo) => {
                    const seleccionado = vehiculo.id === vehiculoSeleccionado;
                    return (
                      <button
                        key={vehiculo.id}
                        type="button"
                        onClick={() => setVehiculoSeleccionado(vehiculo.id)}
                        aria-pressed={seleccionado}
                        className={
                          seleccionado
                            ? "min-w-0 rounded-2xl border-2 border-primary bg-primary-soft p-4 text-left shadow-sm"
                            : "min-w-0 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-primary dark:border-slate-700 dark:bg-slate-900 dark:hover:border-primary"
                        }
                      >
                        <div className="flex justify-center">
                          {vehiculo.tiene_foto && accessToken ? (
                            <FotoVehiculo
                              vehiculoId={vehiculo.id}
                              version={vehiculo.foto_version}
                              accessToken={accessToken}
                              className="h-36 w-full max-w-64 rounded-2xl object-cover sm:h-40"
                              fallbackClassName="flex h-36 w-full max-w-64 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300 sm:h-40"
                              iconSize={42}
                            />
                          ) : (
                            <div className="flex h-36 w-full max-w-64 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300 sm:h-40">
                              <Car size={42} />
                            </div>
                          )}
                        </div>
                        <div className="mt-4 flex items-start justify-between gap-3">
                          <p className="break-words text-2xl font-black uppercase text-slate-900 dark:text-slate-100">
                            {vehiculo.placa}
                          </p>
                          <span
                            className={
                              vehiculo.estado
                                ? "shrink-0 rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary"
                                : "shrink-0 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800 dark:bg-red-950/50 dark:text-red-200"
                            }
                          >
                            {vehiculo.estado ? "Activo" : "Inactivo"}
                          </span>
                        </div>
                        {!vehiculo.estado && (
                          <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-200">
                            Vehiculo inactivo. No puede registrar salidas.
                          </p>
                        )}
                        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <dt className="text-slate-500 dark:text-slate-400">Marca</dt>
                            <dd className="break-words font-semibold text-slate-900 dark:text-slate-100">
                              {vehiculo.marca ?? "No registrada"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500 dark:text-slate-400">Modelo</dt>
                            <dd className="break-words font-semibold text-slate-900 dark:text-slate-100">
                              {vehiculo.modelo ?? "No registrado"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500 dark:text-slate-400">Color</dt>
                            <dd className="break-words font-semibold text-slate-900 dark:text-slate-100">
                              {vehiculo.color}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500 dark:text-slate-400">Tipo</dt>
                            <dd className="break-words font-semibold text-slate-900 dark:text-slate-100">
                              {vehiculo.tipo}
                            </dd>
                          </div>
                        </dl>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        <HistorialReciente
          salidas={salidasRecientes}
          accessToken={accessToken}
          cargando={cargandoHistorial}
          error={errorHistorial}
          onActualizar={() => void cargarHistorial()}
        />

        {modalAbierto && estudiante && vehiculoActual && (
          <ConfirmarSalidaModal
            abierto={modalAbierto}
            estudiante={estudiante}
            vehiculo={vehiculoActual}
            accessToken={accessToken}
            fechaHora={fechaHoraModal}
            registrando={registrando}
            onCancelar={cerrarConfirmacion}
            onConfirmar={() => void confirmarSalida()}
          />
        )}
      </section>
    </MainLayout>
  );
}
