import { NextResponse } from "next/server";

import {
  autorizarHistorial,
  consultarPaginaHistorial,
  ErrorHistorial,
  validarParametrosHistorial,
} from "@/lib/historial/consultarHistorial";

export async function GET(request: Request) {
  try {
    await autorizarHistorial(request);
    const parametros = validarParametrosHistorial(new URL(request.url));
    const resultado = await consultarPaginaHistorial(parametros);
    return NextResponse.json(resultado);
  } catch (error) {
    if (error instanceof ErrorHistorial) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Error inesperado en API de historial:", error);
    return NextResponse.json(
      { error: "Ocurrio un error interno." },
      { status: 500 }
    );
  }
}
