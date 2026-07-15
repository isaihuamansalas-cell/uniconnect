"use client";

import { FormEvent, useEffect, useState } from "react";
import { Download, Eye, LoaderCircle, Search } from "lucide-react";

import { usePerfil } from "@/components/auth/PerfilProvider";
import MainLayout from "@/components/layout/MainLayout";
import { FormField, Input, Modal, Select } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";

type DatosAuditoria =
  | string
  | number
  | boolean
  | null
  | DatosAuditoria[]
  | { [key: string]: DatosAuditoria };

type UsuarioAuditoria = {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
};

type RegistroAuditoria = {
  id: number;
  usuario_id: string;
  accion: string;
  modulo: string;
  entidad_tipo: string;
  entidad_id: string | null;
  descripcion: string;
  datos_anteriores: DatosAuditoria | null;
  datos_nuevos: DatosAuditoria | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
  usuario: UsuarioAuditoria | null;
};

type RespuestaAuditoria = {
  auditorias?: RegistroAuditoria[];
  total?: number;
  pagina?: number;
  limite?: number;
  error?: string;
};

type FiltrosAuditoria = {
  fecha_inicio: string;
  fecha_fin: string;
  usuario_id: string;
  modulo: string;
  accion: string;
};

const filtrosIniciales: FiltrosAuditoria = {
  fecha_inicio: "",
  fecha_fin: "",
  usuario_id: "",
  modulo: "",
  accion: "",
};

const modulos = [
  "usuarios",
  "vehiculos",
  "salidas",
  "avisos",
  "emprendimientos",
  "configuracion",
  "perfil",
];

const acciones = [
  "crear",
  "editar",
  "activar",
  "desactivar",
  "cambiar_rol",
  "registrar",
  "actualizar_configuracion",
  "cambiar_logo",
  "actualizar_telefono",
  "actualizar_foto",
  "cambiar_password",
];

export default function AuditoriaPage() {
  const { perfil, session, cargandoPerfil } = usePerfil();
  const [filtros, setFiltros] =
    useState<FiltrosAuditoria>(filtrosIniciales);
  const [registros, setRegistros] = useState<RegistroAuditoria[]>(
    []
  );
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [detalle, setDetalle] =
    useState<RegistroAuditoria | null>(null);

  const puedeVerAuditoria =
    perfil?.estado === true &&
    (perfil.rol_id === 1 || perfil.rol_id === 2);

  const totalPaginas = Math.max(1, Math.ceil(total / 50));

  async function obtenerAccessToken() {
    if (session?.access_token) {
      return session.access_token;
    }

    const {
      data: { session: sesionActual },
    } = await supabase.auth.getSession();

    return sesionActual?.access_token ?? "";
  }

  async function cargarAuditoria(paginaSolicitada = pagina) {
    if (!puedeVerAuditoria) {
      return;
    }

    setCargando(true);
    setError("");

    const accessToken = await obtenerAccessToken();

    if (!accessToken) {
      setError("Tu sesion termino. Vuelve a iniciar sesion.");
      setCargando(false);
      return;
    }

    const params = new URLSearchParams({
      pagina: String(paginaSolicitada),
      limite: "50",
    });

    Object.entries(filtros).forEach(([clave, valor]) => {
      if (valor) {
        params.set(clave, valor);
      }
    });

    const respuesta = await fetch(`/api/auditoria?${params}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    const resultado = (await respuesta.json()) as RespuestaAuditoria;

    if (!respuesta.ok) {
      setError(resultado.error ?? "No se pudo cargar auditoria.");
      setCargando(false);
      return;
    }

    setRegistros(resultado.auditorias ?? []);
    setTotal(resultado.total ?? 0);
    setPagina(resultado.pagina ?? paginaSolicitada);
    setCargando(false);
  }

  useEffect(() => {
    if (!cargandoPerfil && puedeVerAuditoria) {
      void cargarAuditoria(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargandoPerfil, puedeVerAuditoria]);

  function buscar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPagina(1);
    void cargarAuditoria(1);
  }

  function actualizarFiltro(
    campo: keyof FiltrosAuditoria,
    valor: string
  ) {
    setFiltros((actuales) => ({
      ...actuales,
      [campo]: valor,
    }));
  }

  function exportarCsv() {
    const filas = registros.map((registro) => [
      formatearFecha(registro.created_at),
      obtenerNombreUsuario(registro),
      registro.modulo,
      registro.accion,
      `${registro.entidad_tipo}${registro.entidad_id ? ` #${registro.entidad_id}` : ""}`,
      registro.descripcion,
    ]);

    const contenido = [
      [
        "Fecha",
        "Usuario",
        "Modulo",
        "Accion",
        "Entidad",
        "Descripcion",
      ],
      ...filas,
    ]
      .map((fila) => fila.map(escaparCsv).join(","))
      .join("\n");

    const blob = new Blob([contenido], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = "auditoria.csv";
    enlace.click();
    URL.revokeObjectURL(url);
  }

  return (
    <MainLayout>
      <section className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">
              Seguridad
            </p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Auditoria
            </h1>
            <p className="mt-2 text-slate-600">
              Consulta acciones importantes realizadas en UniConnect.
            </p>
          </div>

          <button
            type="button"
            onClick={exportarCsv}
            disabled={registros.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download size={20} />
            Exportar CSV
          </button>
        </div>

        {!cargandoPerfil && !puedeVerAuditoria && (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-slate-600">
              No tienes permiso para consultar auditoria.
            </p>
          </div>
        )}

        {puedeVerAuditoria && (
          <>
            <form
              onSubmit={buscar}
              className="rounded-2xl bg-white p-5 shadow-sm sm:p-6"
            >
              <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
                <FormField label="Fecha inicial">
                  <Input
                    type="date"
                    value={filtros.fecha_inicio}
                    onChange={(event) =>
                      actualizarFiltro(
                        "fecha_inicio",
                        event.target.value
                      )
                    }
                  />
                </FormField>

                <FormField label="Fecha final">
                  <Input
                    type="date"
                    value={filtros.fecha_fin}
                    onChange={(event) =>
                      actualizarFiltro(
                        "fecha_fin",
                        event.target.value
                      )
                    }
                  />
                </FormField>

                <FormField label="Usuario">
                  <Input
                    value={filtros.usuario_id}
                    onChange={(event) =>
                      actualizarFiltro(
                        "usuario_id",
                        event.target.value
                      )
                    }
                    placeholder="ID del usuario"
                  />
                </FormField>

                <FormField label="Modulo">
                  <Select
                    value={filtros.modulo}
                    onChange={(event) =>
                      actualizarFiltro("modulo", event.target.value)
                    }
                  >
                    <option value="">Todos</option>
                    {modulos.map((modulo) => (
                      <option key={modulo} value={modulo}>
                        {modulo}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <FormField label="Accion">
                  <Select
                    value={filtros.accion}
                    onChange={(event) =>
                      actualizarFiltro("accion", event.target.value)
                    }
                  >
                    <option value="">Todas</option>
                    {acciones.map((accion) => (
                      <option key={accion} value={accion}>
                        {accion}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="submit"
                  disabled={cargando}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
                >
                  {cargando ? (
                    <LoaderCircle size={20} className="animate-spin" />
                  ) : (
                    <Search size={20} />
                  )}
                  Buscar
                </button>
              </div>
            </form>

            <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
              {error && (
                <p className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
                  {error}
                </p>
              )}

              {cargando ? (
                <p className="text-slate-500">Cargando auditoria...</p>
              ) : registros.length === 0 ? (
                <p className="py-10 text-center text-slate-500">
                  No se encontraron registros de auditoria.
                </p>
              ) : (
                <div className="max-w-full overflow-x-auto">
                  <table className="w-full min-w-[950px] text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-sm text-slate-500">
                        <th className="px-4 py-3 font-medium">
                          Fecha/hora
                        </th>
                        <th className="px-4 py-3 font-medium">
                          Usuario
                        </th>
                        <th className="px-4 py-3 font-medium">
                          Modulo
                        </th>
                        <th className="px-4 py-3 font-medium">
                          Accion
                        </th>
                        <th className="px-4 py-3 font-medium">
                          Entidad
                        </th>
                        <th className="px-4 py-3 font-medium">
                          Descripcion
                        </th>
                        <th className="px-4 py-3 font-medium">
                          Detalles
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {registros.map((registro) => (
                        <tr
                          key={registro.id}
                          className="border-b border-slate-100"
                        >
                          <td className="px-4 py-4 text-sm text-slate-700">
                            {formatearFecha(registro.created_at)}
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-semibold text-slate-900">
                              {obtenerNombreUsuario(registro)}
                            </p>
                            <p className="text-xs text-slate-500">
                              {registro.usuario?.correo ?? ""}
                            </p>
                          </td>
                          <td className="px-4 py-4 text-slate-700">
                            {registro.modulo}
                          </td>
                          <td className="px-4 py-4 text-slate-700">
                            {registro.accion}
                          </td>
                          <td className="px-4 py-4 text-slate-700">
                            {registro.entidad_tipo}
                            {registro.entidad_id
                              ? ` #${registro.entidad_id}`
                              : ""}
                          </td>
                          <td className="px-4 py-4 text-slate-700">
                            {registro.descripcion}
                          </td>
                          <td className="px-4 py-4">
                            <button
                              type="button"
                              onClick={() => setDetalle(registro)}
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              <Eye size={17} />
                              Ver
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-5 flex items-center justify-between gap-3 text-sm text-slate-600">
                <span>
                  Pagina {pagina} de {totalPaginas}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void cargarAuditoria(pagina - 1)}
                    disabled={pagina <= 1 || cargando}
                    className="rounded-lg border border-slate-300 px-3 py-2 font-semibold disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => void cargarAuditoria(pagina + 1)}
                    disabled={pagina >= totalPaginas || cargando}
                    className="rounded-lg border border-slate-300 px-3 py-2 font-semibold disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      <Modal
        abierto={Boolean(detalle)}
        titulo="Detalles de auditoria"
        onCerrar={() => setDetalle(null)}
      >
        {detalle && (
          <div className="space-y-4">
            <Detalle titulo="Datos anteriores" datos={detalle.datos_anteriores} />
            <Detalle titulo="Datos nuevos" datos={detalle.datos_nuevos} />
            <Detalle
              titulo="Contexto"
              datos={{
                ip: detalle.ip,
                user_agent: detalle.user_agent,
              }}
            />
          </div>
        )}
      </Modal>
    </MainLayout>
  );
}

function obtenerNombreUsuario(registro: RegistroAuditoria) {
  if (!registro.usuario) {
    return "Usuario no disponible";
  }

  return `${registro.usuario.nombres} ${registro.usuario.apellidos}`;
}

function formatearFecha(fecha: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(fecha));
}

function escaparCsv(valor: string) {
  return `"${valor.replace(/"/g, '""')}"`;
}

function Detalle({
  titulo,
  datos,
}: {
  titulo: string;
  datos: DatosAuditoria | null;
}) {
  return (
    <div>
      <h3 className="mb-2 font-semibold text-slate-900">{titulo}</h3>
      <pre className="max-h-64 overflow-auto rounded-xl bg-slate-100 p-4 text-sm text-slate-700">
        {JSON.stringify(datos ?? {}, null, 2)}
      </pre>
    </div>
  );
}
