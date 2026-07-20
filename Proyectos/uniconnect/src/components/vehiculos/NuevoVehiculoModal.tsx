"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import {
  Car,
  LoaderCircle,
  Search,
} from "lucide-react";

import {
  FormField,
  Input,
  Modal,
  Select,
} from "@/components/ui";
import { supabase } from "@/lib/supabase/client";

type Propietario = {
  id: string;
  nombres: string;
  apellidos: string;
  dni: string;
  codigo_estudiante: string | null;
};

type NuevoVehiculoModalProps = {
  abierto: boolean;
  onCerrar: () => void;
  onVehiculoCreado: () => void;
};

const anioActual = new Date().getFullYear();
const tiposImagenPermitidos = [
  "image/jpeg",
  "image/png",
  "image/webp",
];
const tamanoMaximoImagen = 5 * 1024 * 1024;

type VehiculoCreado = {
  id: number;
  foto: string | null;
};
type RespuestaPropietarios = { propietarios?: Propietario[]; error?: string };

type RespuestaCrearVehiculo = {
  error?: string;
  mensaje?: string;
  vehiculo?: VehiculoCreado;
};

type RespuestaApi = {
  error?: string;
  mensaje?: string;
};

export default function NuevoVehiculoModal({
  abierto,
  onCerrar,
  onVehiculoCreado,
}: NuevoVehiculoModalProps) {
  const [propietarios, setPropietarios] = useState<
    Propietario[]
  >([]);

  const [propietarioId, setPropietarioId] = useState("");
  const [busquedaPropietario, setBusquedaPropietario] =
    useState("");

  const [placa, setPlaca] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [color, setColor] = useState("");
  const [tipo, setTipo] = useState("Moto");
  const [anio, setAnio] = useState("");
  const [fotoSeleccionada, setFotoSeleccionada] =
    useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState("");

  const [cargandoPropietarios, setCargandoPropietarios] =
    useState(false);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const solicitudPropietariosRef = useRef(0);

  useEffect(() => {
    const texto = busquedaPropietario.trim();
    if (!abierto || texto.length < 2) {
      setCargandoPropietarios(false);
      if (!propietarioId) setPropietarios([]);
      return;
    }
    const controlador = new AbortController();
    const solicitud = ++solicitudPropietariosRef.current;
    const temporizador = window.setTimeout(async () => {
      setCargandoPropietarios(true);
      setError("");

      const {
        data: { session },
        error: errorSesion,
      } = await supabase.auth.getSession();

      if (errorSesion || !session) {
        setError(
          "Tu sesión terminó. Vuelve a iniciar sesión."
        );
        return;
      }

      try {
        const respuesta = await fetch(
          `/api/vehiculos/propietarios?q=${encodeURIComponent(texto)}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            signal: controlador.signal,
          }
        );

        const resultado = (await respuesta.json()) as RespuestaPropietarios;
        if (controlador.signal.aborted || solicitud !== solicitudPropietariosRef.current) return;

        if (!respuesta.ok) {
          setError(
            resultado.error ??
              "No se pudieron cargar los propietarios."
          );
          return;
        }

        setPropietarios((actuales) => {
          const seleccionado = actuales.find((item) => item.id === propietarioId);
          const nuevos = resultado.propietarios ?? [];
          return seleccionado && !nuevos.some((item) => item.id === seleccionado.id)
            ? [seleccionado, ...nuevos] : nuevos;
        });
      } catch (errorInesperado) {
        if (errorInesperado instanceof DOMException && errorInesperado.name === "AbortError") return;
        console.error(errorInesperado);
        setError(
          "No se pudo conectar con el servidor."
        );
      } finally {
        if (solicitud === solicitudPropietariosRef.current) setCargandoPropietarios(false);
      }
    }, 350);
    return () => { window.clearTimeout(temporizador); controlador.abort(); };
  }, [abierto, busquedaPropietario, propietarioId]);

  function limpiarFormulario() {
    setPropietarioId("");
    setPropietarios([]);
    setBusquedaPropietario("");
    setPlaca("");
    setMarca("");
    setModelo("");
    setColor("");
    setTipo("Moto");
    setAnio("");
    setFotoSeleccionada(null);
    setVistaPrevia("");
    setError("");
    setMensaje("");
  }

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

  function cerrarModal() {
    if (guardando) {
      return;
    }

    limpiarFormulario();
    onCerrar();
  }

  async function registrarVehiculo(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setGuardando(true);
    setError("");
    setMensaje("");

    const placaNormalizada = placa
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");

    if (!propietarioId || !propietarios.some((item) => item.id === propietarioId)) {
      setError("Selecciona un propietario.");
      setGuardando(false);
      return;
    }

    if (
      placaNormalizada.length < 5 ||
      placaNormalizada.length > 10
    ) {
      setError("Ingresa una placa válida.");
      setGuardando(false);
      return;
    }

    if (!color.trim()) {
      setError("El color es obligatorio.");
      setGuardando(false);
      return;
    }

    const {
      data: { session },
      error: errorSesion,
    } = await supabase.auth.getSession();

    if (errorSesion || !session) {
      setError(
        "Tu sesión terminó. Vuelve a iniciar sesión."
      );
      setGuardando(false);
      return;
    }

    try {
      const respuesta = await fetch("/api/vehiculos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          usuario_id: propietarioId,
          placa: placaNormalizada,
          marca: marca.trim() || null,
          modelo: modelo.trim() || null,
          color: color.trim(),
          tipo,
          anio: anio ? Number(anio) : null,
        }),
      });

      const resultado =
        (await respuesta.json()) as RespuestaCrearVehiculo;

      if (!respuesta.ok) {
        setError(
          resultado.error ??
            "No se pudo registrar el vehículo."
        );
        setGuardando(false);
        return;
      }

      if (fotoSeleccionada && resultado.vehiculo?.id) {
        setMensaje("Subiendo foto del vehiculo...");

        const formulario = new FormData();
        formulario.append("foto", fotoSeleccionada);

        const respuestaFoto = await fetch(
          `/api/vehiculos/${resultado.vehiculo.id}/foto`,
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
              "El vehiculo se registro, pero no se pudo subir la foto."
          );
          setGuardando(false);
          onVehiculoCreado();
          return;
        }
      }

      setMensaje(
        "Vehículo registrado correctamente."
      );

      onVehiculoCreado();

      window.setTimeout(() => {
        setGuardando(false);
        cerrarModal();
      }, 900);
    } catch (errorInesperado) {
      console.error(errorInesperado);
      setError(
        "No se pudo conectar con el servidor."
      );
      setGuardando(false);
    }
  }

  return (
    <Modal
      abierto={abierto}
      titulo="Nuevo vehículo"
      descripcion="Registra el vehículo de un estudiante o profesor."
      onCerrar={cerrarModal}
    >
      <form
        onSubmit={registrarVehiculo}
        className="space-y-5"
      >
        <FormField label="Buscar propietario">
          <div className="relative">
            <Search
              size={19}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <Input
              value={busquedaPropietario}
              onChange={(event) =>
                setBusquedaPropietario(
                  event.target.value
                )
              }
              placeholder="Nombre, DNI o código"
              className="pl-10"
            />
          </div>
        </FormField>

        <FormField label="Propietario">
          <Select
            value={propietarioId}
            onChange={(event) =>
              setPropietarioId(event.target.value)
            }
            disabled={cargandoPropietarios}
            required
          >
            <option value="">
              {cargandoPropietarios
                ? "Cargando propietarios..."
                : "Selecciona un propietario"}
            </option>

            {propietarios.map(
              (propietario) => (
                <option
                  key={propietario.id}
                  value={propietario.id}
                >
                  {propietario.nombres}{" "}
                  {propietario.apellidos} — DNI{" "}
                  {propietario.dni}
                  {propietario.codigo_estudiante
                    ? ` — Código ${propietario.codigo_estudiante}`
                    : ""}
                </option>
              )
            )}
          </Select>
        </FormField>

        {!cargandoPropietarios &&
          busquedaPropietario.trim().length >= 2 &&
          propietarios.length === 0 && (
            <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              No se encontraron propietarios activos con esos datos.
            </p>
          )}

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Placa">
            <Input
              value={placa}
              onChange={(event) =>
                setPlaca(
                  event.target.value
                    .toUpperCase()
                    .replace(/\s/g, "")
                    .slice(0, 10)
                )
              }
              placeholder="Ejemplo: 1234-AB"
              required
            />
          </FormField>

          <FormField label="Tipo">
            <Select
              value={tipo}
              onChange={(event) =>
                setTipo(event.target.value)
              }
              required
            >
              <option value="Moto">Moto</option>
              <option value="Automóvil">
                Automóvil
              </option>
              <option value="Mototaxi">
                Mototaxi
              </option>
              <option value="Bicicleta">
                Bicicleta
              </option>
              <option value="Otro">Otro</option>
            </Select>
          </FormField>

          <FormField label="Marca">
            <Input
              value={marca}
              onChange={(event) =>
                setMarca(event.target.value)
              }
              placeholder="Ejemplo: Honda"
            />
          </FormField>

          <FormField label="Modelo">
            <Input
              value={modelo}
              onChange={(event) =>
                setModelo(event.target.value)
              }
              placeholder="Ejemplo: CB 190R"
            />
          </FormField>

          <FormField label="Color">
            <Input
              value={color}
              onChange={(event) =>
                setColor(event.target.value)
              }
              placeholder="Ejemplo: Negro"
              required
            />
          </FormField>

          <FormField label="Año">
            <Input
              type="number"
              value={anio}
              onChange={(event) =>
                setAnio(event.target.value)
              }
              min={1950}
              max={anioActual + 1}
              placeholder={String(anioActual)}
            />
          </FormField>
        </div>

        <FormField label="Foto del vehiculo">
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={seleccionarFoto}
            disabled={guardando}
          />
        </FormField>

        {vistaPrevia && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
            <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">
              Vista previa
            </p>

            <Image
              src={vistaPrevia}
              alt="Vista previa del vehiculo"
              width={640}
              height={320}
              unoptimized
              className="h-44 w-full rounded-xl object-cover"
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

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 dark:border-slate-700 sm:flex-row sm:justify-end">
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
            disabled={
              guardando ||
              cargandoPropietarios ||
              !propietarioId ||
              !propietarios.some((item) => item.id === propietarioId)
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl btn-primary px-5 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardando ? (
              <LoaderCircle
                size={20}
                className="animate-spin"
              />
            ) : (
              <Car size={20} />
            )}

            {guardando
              ? "Registrando..."
              : "Registrar vehículo"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
