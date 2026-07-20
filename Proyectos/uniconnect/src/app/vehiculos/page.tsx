"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Car,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { usePerfil } from "@/components/auth/PerfilProvider";
import MainLayout from "@/components/layout/MainLayout";

import EliminarVehiculoModal from "@/components/vehiculos/EliminarVehiculoModal";
import FotoVehiculo from "@/components/vehiculos/FotoVehiculo";
import NuevoVehiculoModal from "@/components/vehiculos/NuevoVehiculoModal";

import EditarVehiculoModal, {
  type VehiculoEditable,
} from "@/components/vehiculos/EditarVehiculoModal";

import { supabase } from "@/lib/supabase/client";

type Propietario = {
  nombres: string;
  apellidos: string;
  dni: string;
  codigo_estudiante: string | null;
};

type VehiculoConsulta = {
  id: number;
  usuario_id: string;
  placa: string;
  marca: string | null;
  modelo: string | null;
  color: string;
  tipo: string;
  anio: number | null;
  foto: string | null;
  estado: boolean;
  created_at: string;
  usuarios: Propietario | Propietario[] | null;
};

type Vehiculo = Omit<VehiculoConsulta, "usuarios"> & {
  usuarios: Propietario | null;
};

export default function VehiculosPage() {
  const { perfil } = usePerfil();
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);

  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [modalNuevoAbierto, setModalNuevoAbierto] =
    useState(false);

  const [modalEditarAbierto, setModalEditarAbierto] =
    useState(false);

  const [vehiculoSeleccionado, setVehiculoSeleccionado] =
    useState<VehiculoEditable | null>(null);
  const [vehiculoEliminar, setVehiculoEliminar] =
    useState<Vehiculo | null>(null);
  const [modalEliminarAbierto, setModalEliminarAbierto] =
    useState(false);

  const [actualizacion, setActualizacion] = useState(0);

  const cargarVehiculos = useCallback(async () => {
    setCargando(true);
    setError("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const respuesta = await fetch("/api/vehiculos", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    });
    const resultado = (await respuesta.json()) as {
      vehiculos?: VehiculoConsulta[];
      error?: string;
    };

    if (!respuesta.ok) {
      console.error(
        "Error al cargar vehículos:",
        resultado.error
      );

      setError(
        "No se pudo cargar la lista de vehículos."
      );

      setCargando(false);
      return;
    }

    const datos = resultado.vehiculos ?? [];

    const vehiculosNormalizados: Vehiculo[] = datos.map(
      (vehiculo) => ({
        ...vehiculo,
        usuarios: Array.isArray(vehiculo.usuarios)
          ? vehiculo.usuarios[0] ?? null
          : vehiculo.usuarios ?? null,
      })
    );

    setVehiculos(vehiculosNormalizados);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargarVehiculos();
  }, [cargarVehiculos, actualizacion]);

  const vehiculosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) {
      return vehiculos;
    }

    return vehiculos.filter((vehiculo) => {
      const propietario = vehiculo.usuarios
        ? `${vehiculo.usuarios.nombres} ${vehiculo.usuarios.apellidos}`.toLowerCase()
        : "";

      const dni = vehiculo.usuarios?.dni ?? "";

      const codigo =
        vehiculo.usuarios?.codigo_estudiante?.toLowerCase() ??
        "";

      return (
        vehiculo.placa.toLowerCase().includes(texto) ||
        (vehiculo.marca ?? "")
          .toLowerCase()
          .includes(texto) ||
        (vehiculo.modelo ?? "")
          .toLowerCase()
          .includes(texto) ||
        vehiculo.color.toLowerCase().includes(texto) ||
        vehiculo.tipo.toLowerCase().includes(texto) ||
        propietario.includes(texto) ||
        dni.includes(texto) ||
        codigo.includes(texto)
      );
    });
  }, [busqueda, vehiculos]);

  function actualizarLista() {
    setActualizacion(
      (valorActual) => valorActual + 1
    );
  }

  function abrirModalEditar(vehiculo: Vehiculo) {
    setVehiculoSeleccionado({
      id: vehiculo.id,
      usuario_id: vehiculo.usuario_id,
      propietario: {
        nombres: vehiculo.usuarios?.nombres ?? "Propietario",
        apellidos: vehiculo.usuarios?.apellidos ?? "actual",
        dni: vehiculo.usuarios?.dni ?? "",
        codigo_estudiante: vehiculo.usuarios?.codigo_estudiante ?? null,
      },
      placa: vehiculo.placa,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      color: vehiculo.color,
      tipo: vehiculo.tipo,
      anio: vehiculo.anio,
      foto: vehiculo.foto,
      estado: vehiculo.estado,
    });

    setModalEditarAbierto(true);
  }

  function cerrarModalEditar() {
    setModalEditarAbierto(false);
    setVehiculoSeleccionado(null);
  }

  function abrirModalEliminar(vehiculo: Vehiculo) {
    setVehiculoEliminar(vehiculo);
    setModalEliminarAbierto(true);
  }

  function cerrarModalEliminar() {
    setModalEliminarAbierto(false);
    setVehiculoEliminar(null);
  }

  const puedeEliminar =
    perfil?.rol_id === 1 && perfil.estado === true;

  return (
    <MainLayout>
      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">
              Control vehicular
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">
              Vehículos
            </h1>

            <p className="mt-2 text-slate-600 dark:text-slate-300">
              Consulta y administra los vehículos de estudiantes
              y profesores.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setModalNuevoAbierto(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl btn-primary px-5 py-3 font-semibold text-white transition sm:w-auto"
          >
            <Plus size={20} />
            Nuevo vehículo
          </button>
        </div>

        <div className="mt-8 rounded-2xl bg-white p-4 shadow-sm dark:border dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="relative max-w-lg">
            <Search
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
            />

            <input
              type="search"
              value={busqueda}
              onChange={(event) =>
                setBusqueda(event.target.value)
              }
              placeholder="Buscar por placa, propietario, DNI o código"
              className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          {error && (
            <p className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">
              {error}
            </p>
          )}

          {cargando ? (
            <p className="mt-8 text-slate-500 dark:text-slate-400">
              Cargando vehículos...
            </p>
          ) : (
            <div className="mt-6 max-w-full overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
                    <th className="px-4 py-3 font-medium">
                      Vehículo
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Propietario
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Placa
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Color
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Tipo
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Estado
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {vehiculosFiltrados.map((vehiculo) => (
                    <tr
                      key={vehiculo.id}
                      className="border-b border-slate-100 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {vehiculo.foto ? (
                            <FotoVehiculo
                              vehiculoId={vehiculo.id}
                              version={`${vehiculo.foto}-${actualizacion}`}
                            />
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              <Car size={22} />
                            </div>
                          )}

                          <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">
                              {vehiculo.marca ?? "Sin marca"}{" "}
                              {vehiculo.modelo ?? ""}
                            </p>

                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {vehiculo.anio ??
                                "Año no registrado"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        {vehiculo.usuarios ? (
                          <>
                            <p className="font-medium text-slate-800 dark:text-slate-100">
                              {vehiculo.usuarios.nombres}{" "}
                              {vehiculo.usuarios.apellidos}
                            </p>

                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              DNI: {vehiculo.usuarios.dni}
                            </p>
                          </>
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400">
                            Sin propietario
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 font-semibold uppercase text-slate-900 dark:text-slate-100">
                        {vehiculo.placa}
                      </td>

                      <td className="px-4 py-4 text-slate-700 dark:text-slate-200">
                        {vehiculo.color}
                      </td>

                      <td className="px-4 py-4 text-slate-700 dark:text-slate-200">
                        {vehiculo.tipo}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={
                            vehiculo.estado
                              ? "rounded-full bg-primary-soft px-3 py-1 text-sm font-medium text-primary"
                              : "rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300"
                          }
                        >
                          {vehiculo.estado
                            ? "Activo"
                            : "Inactivo"}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              abrirModalEditar(vehiculo)
                            }
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            <Pencil size={17} />
                            Editar
                          </button>

                          {puedeEliminar && (
                            <button
                              type="button"
                              onClick={() =>
                                abrirModalEliminar(vehiculo)
                              }
                              className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-900/70 dark:text-red-300 dark:hover:bg-red-950/40"
                            >
                              <Trash2 size={17} />
                              Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {vehiculosFiltrados.length === 0 && (
                <div className="py-12 text-center">
                  <Car
                    size={38}
                    className="mx-auto text-slate-300 dark:text-slate-600"
                  />

                  <p className="mt-3 text-slate-500 dark:text-slate-400">
                    No se encontraron vehículos registrados.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <NuevoVehiculoModal
        abierto={modalNuevoAbierto}
        onCerrar={() =>
          setModalNuevoAbierto(false)
        }
        onVehiculoCreado={actualizarLista}
      />

      <EditarVehiculoModal
        abierto={modalEditarAbierto}
        vehiculo={vehiculoSeleccionado}
        onCerrar={cerrarModalEditar}
        onVehiculoActualizado={actualizarLista}
      />

      <EliminarVehiculoModal
        abierto={modalEliminarAbierto}
        vehiculo={vehiculoEliminar}
        onCerrar={cerrarModalEliminar}
        onVehiculoEliminado={actualizarLista}
      />
    </MainLayout>
  );
}
