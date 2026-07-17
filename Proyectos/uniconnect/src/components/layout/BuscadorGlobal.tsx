"use client";

import {
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Car,
  LoaderCircle,
  Megaphone,
  Search,
  Store,
  UserRound,
  X,
} from "lucide-react";

type ModuloBusqueda =
  | "usuarios"
  | "vehiculos"
  | "avisos"
  | "emprendimientos";

type ResultadoBusqueda = {
  id: string;
  titulo: string;
  descripcion: string;
  detalle: string;
  ruta: string;
};

type RespuestaBusqueda = {
  resultados?: Record<ModuloBusqueda, ResultadoBusqueda[]>;
  error?: string;
};

type ResultadoConModulo = ResultadoBusqueda & {
  modulo: ModuloBusqueda;
};

type BuscadorGlobalProps = {
  accessToken: string;
};

const modulos: {
  id: ModuloBusqueda;
  titulo: string;
  icono: typeof UserRound;
}[] = [
  { id: "usuarios", titulo: "Usuarios", icono: UserRound },
  { id: "vehiculos", titulo: "Vehiculos", icono: Car },
  { id: "avisos", titulo: "Avisos", icono: Megaphone },
  { id: "emprendimientos", titulo: "Emprendimientos", icono: Store },
];

const longitudMinima = 2;
const debounceMs = 350;

function crearResultadosVacios(): Record<
  ModuloBusqueda,
  ResultadoBusqueda[]
> {
  return {
    usuarios: [],
    vehiculos: [],
    avisos: [],
    emprendimientos: [],
  };
}

export default function BuscadorGlobal({
  accessToken,
}: BuscadorGlobalProps) {
  const router = useRouter();
  const contenedorRef = useRef<HTMLDivElement | null>(null);
  const inputMovilRef = useRef<HTMLInputElement | null>(null);
  const solicitudActual = useRef(0);

  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<
    Record<ModuloBusqueda, ResultadoBusqueda[]>
  >(crearResultadosVacios);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [panelMovilAbierto, setPanelMovilAbierto] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(-1);

  const textoNormalizado = busqueda.trim();

  const resultadosPlanos = useMemo<ResultadoConModulo[]>(
    () =>
      modulos.flatMap((modulo) =>
        resultados[modulo.id].map((resultado) => ({
          ...resultado,
          modulo: modulo.id,
        }))
      ),
    [resultados]
  );

  const tieneResultados = resultadosPlanos.length > 0;
  const puedeBuscar = textoNormalizado.length >= longitudMinima;

  function cerrarPaneles() {
    setPanelAbierto(false);
    setPanelMovilAbierto(false);
    setIndiceActivo(-1);
  }

  function seleccionarResultado(resultado: ResultadoBusqueda) {
    cerrarPaneles();
    setBusqueda("");
    router.push(resultado.ruta);
  }

  useEffect(() => {
    if (!panelMovilAbierto) {
      return;
    }

    const temporizador = window.setTimeout(() => {
      inputMovilRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(temporizador);
  }, [panelMovilAbierto]);

  useEffect(() => {
    function manejarClickFuera(event: MouseEvent) {
      if (
        contenedorRef.current &&
        !contenedorRef.current.contains(event.target as Node)
      ) {
        cerrarPaneles();
      }
    }

    function manejarEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        cerrarPaneles();
      }
    }

    document.addEventListener("mousedown", manejarClickFuera);
    window.addEventListener("keydown", manejarEscape);

    return () => {
      document.removeEventListener("mousedown", manejarClickFuera);
      window.removeEventListener("keydown", manejarEscape);
    };
  }, []);

  useEffect(() => {
    const texto = textoNormalizado.slice(0, 60);

    if (!accessToken || texto.length < longitudMinima) {
      setResultados(crearResultadosVacios());
      setCargando(false);
      setError("");
      return;
    }

    const controlador = new AbortController();
    const idSolicitud = solicitudActual.current + 1;
    solicitudActual.current = idSolicitud;

    const temporizador = window.setTimeout(async () => {
      setCargando(true);
      setError("");

      try {
        const respuesta = await fetch(
          `/api/buscar?q=${encodeURIComponent(texto)}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            cache: "no-store",
            signal: controlador.signal,
          }
        );

        const resultado =
          (await respuesta.json()) as RespuestaBusqueda;

        if (
          controlador.signal.aborted ||
          solicitudActual.current !== idSolicitud
        ) {
          return;
        }

        if (!respuesta.ok) {
          setResultados(crearResultadosVacios());
          setError(resultado.error ?? "No se pudo buscar.");
          return;
        }

        setResultados(
          resultado.resultados ?? crearResultadosVacios()
        );
        setIndiceActivo(-1);
      } catch (errorDesconocido) {
        if (
          controlador.signal.aborted ||
          solicitudActual.current !== idSolicitud
        ) {
          return;
        }

        console.error(errorDesconocido);
        setResultados(crearResultadosVacios());
        setError("No se pudo conectar con el servidor.");
      } finally {
        if (
          !controlador.signal.aborted &&
          solicitudActual.current === idSolicitud
        ) {
          setCargando(false);
        }
      }
    }, debounceMs);

    return () => {
      window.clearTimeout(temporizador);
      controlador.abort();
    };
  }, [accessToken, textoNormalizado]);

  function manejarTeclado(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      cerrarPaneles();
      return;
    }

    if (!tieneResultados) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setPanelAbierto(true);
      setIndiceActivo((indice) =>
        indice + 1 >= resultadosPlanos.length ? 0 : indice + 1
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setPanelAbierto(true);
      setIndiceActivo((indice) =>
        indice <= 0 ? resultadosPlanos.length - 1 : indice - 1
      );
      return;
    }

    if (event.key === "Enter" && indiceActivo >= 0) {
      event.preventDefault();
      seleccionarResultado(resultadosPlanos[indiceActivo]);
    }
  }

  const panelResultados = (
    <div className="max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
      {cargando && (
        <div className="flex items-center gap-2 px-3 py-4 text-sm text-slate-500">
          <LoaderCircle size={18} className="animate-spin" />
          Buscando...
        </div>
      )}

      {!cargando && error && (
        <p className="px-3 py-4 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      {!cargando && !error && !puedeBuscar && (
        <p className="px-3 py-4 text-sm text-slate-500">
          Ingresa al menos 2 caracteres.
        </p>
      )}

      {!cargando && !error && puedeBuscar && !tieneResultados && (
        <p className="px-3 py-4 text-sm text-slate-500">
          Sin resultados.
        </p>
      )}

      {!cargando &&
        !error &&
        modulos.map((modulo) => {
          const resultadosModulo = resultados[modulo.id];

          if (resultadosModulo.length === 0) {
            return null;
          }

          const Icono = modulo.icono;

          return (
            <div key={modulo.id} className="py-1">
              <div className="flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                <Icono size={15} />
                {modulo.titulo}
              </div>

              <div className="space-y-1">
                {resultadosModulo.map((resultado) => {
                  const indice = resultadosPlanos.findIndex(
                    (item) =>
                      item.modulo === modulo.id &&
                      item.id === resultado.id
                  );
                  const activo = indice === indiceActivo;

                  return (
                    <Link
                      key={`${modulo.id}-${resultado.id}`}
                      href={resultado.ruta}
                      onClick={() => {
                        cerrarPaneles();
                        setBusqueda("");
                      }}
                      className={`block rounded-xl px-3 py-2 transition ${
                        activo
                          ? "bg-emerald-50"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <p className="line-clamp-1 text-sm font-semibold text-slate-900">
                        {resultado.titulo}
                      </p>
                      <p className="line-clamp-1 text-xs text-slate-500">
                        {resultado.descripcion}
                      </p>
                      <p className="line-clamp-1 text-xs font-medium text-emerald-700">
                        {resultado.detalle}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
    </div>
  );

  return (
    <div ref={contenedorRef} className="relative">
      <button
        type="button"
        aria-label="Abrir buscador"
        onClick={() => {
          setPanelMovilAbierto(true);
          setPanelAbierto(true);
        }}
        className="rounded-lg p-2 text-slate-700 transition hover:bg-slate-100 md:hidden"
      >
        <Search size={21} />
      </button>

      <div className="relative hidden w-72 md:block xl:w-96">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="search"
          value={busqueda}
          onFocus={() => setPanelAbierto(true)}
          onChange={(event) => {
            setBusqueda(event.target.value);
            setPanelAbierto(true);
          }}
          onKeyDown={manejarTeclado}
          placeholder="Buscar en UniConnect"
          aria-label="Buscar en UniConnect"
          className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        />

        {panelAbierto && (
          <div className="absolute right-0 top-full z-30 mt-2 w-full">
            {panelResultados}
          </div>
        )}
      </div>

      {panelMovilAbierto && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 p-4 md:hidden"
          onMouseDown={cerrarPaneles}
        >
          <div
            className="rounded-2xl bg-white p-3 shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  ref={inputMovilRef}
                  type="search"
                  value={busqueda}
                  onChange={(event) => {
                    setBusqueda(event.target.value);
                    setPanelAbierto(true);
                  }}
                  onKeyDown={manejarTeclado}
                  placeholder="Buscar en UniConnect"
                  aria-label="Buscar en UniConnect"
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <button
                type="button"
                aria-label="Cerrar buscador"
                onClick={cerrarPaneles}
                className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
              >
                <X size={21} />
              </button>
            </div>

            <div className="mt-3">{panelResultados}</div>
          </div>
        </div>
      )}
    </div>
  );
}
