"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Car,
  CheckCircle2,
  LoaderCircle,
  Search,
  UserRound,
} from "lucide-react";

import MainLayout from "@/components/layout/MainLayout";
import FotoVehiculo from "@/components/vehiculos/FotoVehiculo";
import { FormField, Input } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";

type Estudiante = {
  id: string;
  nombres: string;
  apellidos: string;
  dni: string;
  codigo_estudiante: string | null;
  foto: string | null;
  estado: boolean;
  rol_id: number;
};

type Vehiculo = {
  id: number;
  usuario_id: string;
  placa: string;
  marca: string | null;
  modelo: string | null;
  color: string;
  tipo: string;
  foto: string | null;
  estado: boolean;
};

type ResultadoBusqueda = {
  estudiante?: Estudiante;
  vehiculos?: Vehiculo[];
  error?: string;
};

type ResultadoSalida = {
  mensaje?: string;
  error?: string;
};

function fotoEstudianteValida(
  foto: string | null
): foto is string {
  if (!foto) {
    return false;
  }

  return (
    foto.startsWith("http://") ||
    foto.startsWith("https://") ||
    foto.startsWith("/")
  );
}

export default function GaritaPage() {
  const router = useRouter();

  const [busqueda, setBusqueda] = useState("");
  const [estudiante, setEstudiante] =
    useState<Estudiante | null>(null);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [vehiculoSeleccionado, setVehiculoSeleccionado] =
    useState<number | null>(null);
  const [accessToken, setAccessToken] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [autorizando, setAutorizando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    async function cargarSesion() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      setAccessToken(session.access_token);
    }

    cargarSesion();
  }, [router]);

  async function buscarEstudiante(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const texto = busqueda.trim();

    if (!texto) {
      setError("Ingresa un DNI o codigo institucional.");
      return;
    }

    setBuscando(true);
    setError("");
    setMensaje("");
    setEstudiante(null);
    setVehiculos([]);
    setVehiculoSeleccionado(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.replace("/login");
      return;
    }

    setAccessToken(session.access_token);

    try {
      const respuesta = await fetch(
        `/api/garita/buscar?busqueda=${encodeURIComponent(
          texto
        )}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const resultado =
        (await respuesta.json()) as ResultadoBusqueda;

      if (!respuesta.ok || !resultado.estudiante) {
        setError(
          resultado.error ??
            "No se pudo consultar la informacion."
        );
        return;
      }

      const vehiculosActivos = resultado.vehiculos ?? [];

      setEstudiante(resultado.estudiante);
      setVehiculos(vehiculosActivos);
      setVehiculoSeleccionado(
        vehiculosActivos[0]?.id ?? null
      );
    } catch (errorInesperado) {
      console.error(errorInesperado);
      setError("No se pudo conectar con el servidor.");
    } finally {
      setBuscando(false);
    }
  }

  async function autorizarSalida() {
    if (!estudiante || !vehiculoSeleccionado) {
      setError("Selecciona un vehiculo para autorizar la salida.");
      return;
    }

    setAutorizando(true);
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
      const respuesta = await fetch("/api/garita/salidas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          vehiculo_id: vehiculoSeleccionado,
          estudiante_id: estudiante.id,
        }),
      });

      const resultado =
        (await respuesta.json()) as ResultadoSalida;

      if (!respuesta.ok) {
        setError(
          resultado.error ?? "No se pudo registrar la salida."
        );
        return;
      }

      setMensaje(
        resultado.mensaje ?? "Salida autorizada correctamente."
      );
    } catch (errorInesperado) {
      console.error(errorInesperado);
      setError("No se pudo conectar con el servidor.");
    } finally {
      setAutorizando(false);
    }
  }

  return (
    <MainLayout>
      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">
              Control de garita
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Autorizar salida
            </h1>

            <p className="mt-2 text-slate-600">
              Busca al estudiante y registra la salida del vehiculo
              autorizado.
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl bg-white p-4 shadow-sm sm:p-6">
          <form
            onSubmit={buscarEstudiante}
            className="flex flex-col gap-4 lg:flex-row lg:items-end"
          >
            <div className="flex-1">
              <FormField label="DNI o codigo institucional">
                <div className="relative">
                  <Search
                    size={20}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <Input
                    value={busqueda}
                    onChange={(event) =>
                      setBusqueda(event.target.value)
                    }
                    placeholder="Ingresa DNI o codigo"
                    className="pl-11"
                  />
                </div>
              </FormField>
            </div>

            <button
              type="submit"
              disabled={buscando}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl btn-primary px-5 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
            >
              {buscando ? (
                <LoaderCircle
                  size={20}
                  className="animate-spin"
                />
              ) : (
                <Search size={20} />
              )}

              {buscando ? "Buscando..." : "Buscar"}
            </button>
          </form>

          {error && (
            <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
              {error}
            </p>
          )}

          {mensaje && (
            <p className="mt-5 rounded-xl bg-primary-soft p-4 text-sm font-medium text-primary">
              {mensaje}
            </p>
          )}
        </div>

        {estudiante && (
          <div className="mt-8 grid gap-6 xl:grid-cols-[360px_1fr]">
            <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
              <div className="flex items-start gap-4">
                {fotoEstudianteValida(estudiante.foto) ? (
                  <Image
                    src={estudiante.foto}
                    alt="Foto del estudiante"
                    width={80}
                    height={80}
                    unoptimized
                    className="h-20 w-20 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                    <UserRound size={34} />
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-primary">
                    Estudiante
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-slate-900">
                    {estudiante.nombres} {estudiante.apellidos}
                  </h2>

                  <span
                    className={
                      estudiante.estado
                        ? "mt-3 inline-flex rounded-full bg-primary-soft px-3 py-1 text-sm font-medium text-primary"
                        : "mt-3 inline-flex rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700"
                    }
                  >
                    {estudiante.estado ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-3 text-sm">
                <div>
                  <p className="font-medium text-slate-500">DNI</p>
                  <p className="font-semibold text-slate-900">
                    {estudiante.dni}
                  </p>
                </div>

                <div>
                  <p className="font-medium text-slate-500">
                    Codigo institucional
                  </p>
                  <p className="font-semibold text-slate-900">
                    {estudiante.codigo_estudiante ?? "No registrado"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Vehiculos activos
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Selecciona el vehiculo que saldra por garita.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={autorizarSalida}
                  disabled={
                    autorizando ||
                    !vehiculoSeleccionado ||
                    !estudiante.estado
                  }
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl btn-primary px-5 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {autorizando ? (
                    <LoaderCircle
                      size={20}
                      className="animate-spin"
                    />
                  ) : (
                    <CheckCircle2 size={20} />
                  )}

                  {autorizando
                    ? "Autorizando..."
                    : "Autorizar salida"}
                </button>
              </div>

              {vehiculos.length === 0 ? (
                <div className="mt-8 rounded-xl bg-slate-50 p-8 text-center text-slate-500">
                  <Car size={34} className="mx-auto text-slate-300" />
                  <p className="mt-3">
                    El estudiante no tiene vehiculos activos.
                  </p>
                </div>
              ) : (
                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  {vehiculos.map((vehiculo) => {
                    const seleccionado =
                      vehiculoSeleccionado === vehiculo.id;

                    return (
                      <button
                        key={vehiculo.id}
                        type="button"
                        onClick={() =>
                          setVehiculoSeleccionado(vehiculo.id)
                        }
                        className={
                          seleccionado
                            ? "rounded-2xl border-2 border-primary bg-primary-soft p-4 text-left shadow-sm transition"
                            : "rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-primary hover:bg-slate-50"
                        }
                      >
                        <div className="flex gap-4">
                          {vehiculo.foto && accessToken ? (
                            <FotoVehiculo
                              vehiculoId={vehiculo.id}
                              version={vehiculo.foto}
                              accessToken={accessToken}
                              className="h-16 w-16 rounded-xl object-cover"
                              fallbackClassName="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100 text-slate-500"
                              iconSize={26}
                            />
                          ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                              <Car size={26} />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <p className="text-lg font-bold uppercase text-slate-900">
                              {vehiculo.placa}
                            </p>

                            <p className="mt-1 text-sm font-medium text-slate-700">
                              {vehiculo.marca ?? "Sin marca"}{" "}
                              {vehiculo.modelo ?? ""}
                            </p>

                            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-slate-500">
                                  Color
                                </p>
                                <p className="font-semibold text-slate-800">
                                  {vehiculo.color}
                                </p>
                              </div>

                              <div>
                                <p className="text-slate-500">
                                  Tipo
                                </p>
                                <p className="font-semibold text-slate-800">
                                  {vehiculo.tipo}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </MainLayout>
  );
}
