"use client";

type EntradaCache = {
  consumidores: number;
  controlador: AbortController;
  promesa: Promise<string>;
  objectUrl: string | null;
  temporizador: number | null;
};

const cache = new Map<string, EntradaCache>();
const permanenciaSinUsoMs = 30_000;

type SolicitudFoto = {
  clave: string;
  endpoint: string;
  accessToken: string;
};

function eliminarEntrada(clave: string, entrada: EntradaCache) {
  if (cache.get(clave) !== entrada) return;
  if (entrada.temporizador !== null) window.clearTimeout(entrada.temporizador);
  entrada.controlador.abort();
  if (entrada.objectUrl) URL.revokeObjectURL(entrada.objectUrl);
  cache.delete(clave);
}

export function adquirirFotoPrivada({ clave, endpoint, accessToken }: SolicitudFoto) {
  let entrada = cache.get(clave);
  if (!entrada) {
    const controlador = new AbortController();
    const nuevaEntrada: EntradaCache = {
      consumidores: 0,
      controlador,
      objectUrl: null,
      temporizador: null,
      promesa: Promise.resolve(""),
    };
    nuevaEntrada.promesa = fetch(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: controlador.signal,
    }).then(async (respuesta) => {
      if (!respuesta.ok) throw new Error("No se pudo cargar la imagen.");
      const objectUrl = URL.createObjectURL(await respuesta.blob());
      if (cache.get(clave) !== nuevaEntrada) {
        URL.revokeObjectURL(objectUrl);
        throw new DOMException("Solicitud cancelada", "AbortError");
      }
      nuevaEntrada.objectUrl = objectUrl;
      return objectUrl;
    }).catch((error: unknown) => {
      if (cache.get(clave) === nuevaEntrada && nuevaEntrada.consumidores === 0) {
        eliminarEntrada(clave, nuevaEntrada);
      }
      throw error;
    });
    entrada = nuevaEntrada;
    cache.set(clave, entrada);
  }

  if (entrada.temporizador !== null) {
    window.clearTimeout(entrada.temporizador);
    entrada.temporizador = null;
  }
  entrada.consumidores += 1;
  let liberado = false;

  return {
    promesa: entrada.promesa,
    liberar() {
      if (liberado) return;
      liberado = true;
      const actual = cache.get(clave);
      if (!actual) return;
      actual.consumidores = Math.max(0, actual.consumidores - 1);
      if (actual.consumidores > 0) return;
      if (!actual.objectUrl) {
        eliminarEntrada(clave, actual);
        return;
      }
      actual.temporizador = window.setTimeout(
        () => eliminarEntrada(clave, actual),
        permanenciaSinUsoMs
      );
    },
  };
}

export function limpiarCacheFotosPrivadas() {
  for (const [clave, entrada] of cache) eliminarEntrada(clave, entrada);
}
