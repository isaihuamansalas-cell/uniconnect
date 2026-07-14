"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Search, UserPlus } from "lucide-react";

import MainLayout from "@/components/layout/MainLayout";
import EditarUsuarioModal, {
  type UsuarioEditable,
} from "@/components/usuarios/EditarUsuarioModal";
import NuevoUsuarioModal from "@/components/usuarios/NuevoUsuarioModal";
import { supabase } from "@/lib/supabase/client";

type Usuario = {
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

const nombresRoles: Record<number, string> = {
  1: "Administrador",
  2: "Director",
  3: "Profesor",
  4: "Garita",
  5: "Estudiante",
};

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [modalNuevoAbierto, setModalNuevoAbierto] =
    useState(false);

  const [modalEditarAbierto, setModalEditarAbierto] =
    useState(false);

  const [usuarioSeleccionado, setUsuarioSeleccionado] =
    useState<UsuarioEditable | null>(null);

  const [actualizacion, setActualizacion] = useState(0);

  useEffect(() => {
    async function cargarUsuarios() {
      setCargando(true);
      setError("");

      const { data, error: errorConsulta } = await supabase
        .from("usuarios")
        .select(
          `
            id,
            nombres,
            apellidos,
            correo,
            dni,
            codigo_estudiante,
            telefono,
            rol_id,
            estado
          `
        )
        .order("nombres", { ascending: true });

      if (errorConsulta) {
        console.error(
          "Error al cargar usuarios:",
          errorConsulta
        );

        setError(
          "No se pudo cargar la lista de usuarios."
        );

        setCargando(false);
        return;
      }

      setUsuarios(data ?? []);
      setCargando(false);
    }

    cargarUsuarios();
  }, [actualizacion]);

  const usuariosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) {
      return usuarios;
    }

    return usuarios.filter((usuario) => {
      const nombreCompleto =
        `${usuario.nombres} ${usuario.apellidos}`.toLowerCase();

      const codigo =
        usuario.codigo_estudiante?.toLowerCase() ?? "";

      return (
        nombreCompleto.includes(texto) ||
        usuario.correo.toLowerCase().includes(texto) ||
        usuario.dni.includes(texto) ||
        codigo.includes(texto)
      );
    });
  }, [busqueda, usuarios]);

  function abrirModalEditar(usuario: Usuario) {
    setUsuarioSeleccionado(usuario);
    setModalEditarAbierto(true);
  }

  function cerrarModalEditar() {
    setModalEditarAbierto(false);
    setUsuarioSeleccionado(null);
  }

  function actualizarLista() {
    setActualizacion((valorActual) => valorActual + 1);
  }

  return (
    <MainLayout>
      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">
              Administración
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Usuarios
            </h1>

            <p className="mt-2 text-slate-600">
              Consulta y administra las personas registradas en
              UniConnect.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setModalNuevoAbierto(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white transition hover:bg-emerald-800"
          >
            <UserPlus size={20} />
            Nuevo usuario
          </button>
        </div>

        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <div className="relative max-w-md">
            <Search
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={busqueda}
              onChange={(event) =>
                setBusqueda(event.target.value)
              }
              placeholder="Buscar por nombre, DNI, código o correo"
              className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          {error && (
            <p className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">
              {error}
            </p>
          )}

          {cargando ? (
            <p className="mt-8 text-slate-500">
              Cargando usuarios...
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-sm text-slate-500">
                    <th className="px-4 py-3 font-medium">
                      Usuario
                    </th>

                    <th className="px-4 py-3 font-medium">
                      DNI
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Código
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Rol
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
                  {usuariosFiltrados.map((usuario) => (
                    <tr
                      key={usuario.id}
                      className="border-b border-slate-100 transition hover:bg-slate-50"
                    >
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">
                          {usuario.nombres}{" "}
                          {usuario.apellidos}
                        </p>

                        <p className="text-sm text-slate-500">
                          {usuario.correo}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        {usuario.dni}
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        {usuario.codigo_estudiante ??
                          "No aplica"}
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        {nombresRoles[usuario.rol_id] ??
                          "Sin rol"}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={
                            usuario.estado
                              ? "rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700"
                              : "rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700"
                          }
                        >
                          {usuario.estado
                            ? "Activo"
                            : "Inactivo"}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            abrirModalEditar(usuario)
                          }
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          <Pencil size={17} />
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {usuariosFiltrados.length === 0 && (
                <p className="py-10 text-center text-slate-500">
                  No se encontraron usuarios.
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      <NuevoUsuarioModal
        abierto={modalNuevoAbierto}
        onCerrar={() => setModalNuevoAbierto(false)}
        onUsuarioCreado={actualizarLista}
      />

      <EditarUsuarioModal
        abierto={modalEditarAbierto}
        usuario={usuarioSeleccionado}
        onCerrar={cerrarModalEditar}
        onUsuarioActualizado={actualizarLista}
      />
    </MainLayout>
  );
}