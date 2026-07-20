import "server-only";

import { NextResponse } from "next/server";

export type MensajeErrorApi =
  | "No se pudo completar la operacion."
  | "No se pudo cargar la informacion."
  | "No se pudo guardar el registro."
  | "No se encontro el recurso."
  | "No tienes permiso para realizar esta accion.";

export function respuestaErrorApi(
  contexto: string,
  errorReal: unknown,
  mensaje: MensajeErrorApi = "No se pudo completar la operacion.",
  status = 500
) {
  console.error(`[API] ${contexto}:`, errorReal);
  return NextResponse.json({ error: mensaje }, { status });
}
