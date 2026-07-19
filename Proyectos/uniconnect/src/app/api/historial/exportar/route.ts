import { NextResponse } from "next/server";

import {
  autorizarHistorial,
  consultarLoteHistorial,
  contarHistorial,
  ErrorHistorial,
  type RegistroHistorial,
  validarParametrosHistorial,
} from "@/lib/historial/consultarHistorial";

const tamanoLote = 500;
const maximoExportacion = 10_000;
const maximoSinRangoCompleto = 5_000;

function escaparCsv(valor: string | number | null | undefined) {
  return `"${String(valor ?? "").replace(/"/g, '""')}"`;
}

function obtenerFecha(registro: RegistroHistorial) {
  if (registro.fecha) return registro.fecha;
  const fecha = new Date(registro.created_at);
  return Number.isNaN(fecha.getTime()) ? "" : fecha.toLocaleDateString("es-PE", { timeZone: "America/Lima" });
}

function obtenerHora(registro: RegistroHistorial) {
  if (registro.hora) return registro.hora;
  const fecha = new Date(registro.created_at);
  return Number.isNaN(fecha.getTime())
    ? ""
    : fecha.toLocaleTimeString("es-PE", {
        timeZone: "America/Lima",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function filaCsv(registro: RegistroHistorial) {
  const estudiante = registro.estudiante
    ? `${registro.estudiante.nombres} ${registro.estudiante.apellidos}`.trim()
    : "";
  const responsable = registro.responsable
    ? `${registro.responsable.nombres} ${registro.responsable.apellidos}`.trim()
    : "";
  return [
    obtenerFecha(registro),
    obtenerHora(registro),
    estudiante,
    registro.estudiante?.dni,
    registro.estudiante?.codigo_estudiante,
    registro.vehiculo?.placa,
    registro.vehiculo?.marca,
    registro.vehiculo?.modelo,
    registro.vehiculo?.color,
    registro.vehiculo?.tipo,
    responsable,
  ]
    .map(escaparCsv)
    .join(",");
}

export async function GET(request: Request) {
  try {
    await autorizarHistorial(request);
    const parametros = validarParametrosHistorial(new URL(request.url));
    const { total, filtros } = await contarHistorial(parametros.filtros);

    if (
      total > maximoSinRangoCompleto &&
      (!parametros.filtros.fechaInicio || !parametros.filtros.fechaFin)
    ) {
      throw new ErrorHistorial(
        "La exportacion es demasiado amplia. Selecciona una fecha inicial y una fecha final.",
        400
      );
    }
    if (total > maximoExportacion) {
      throw new ErrorHistorial(
        "La exportacion supera 10000 registros. Reduce el rango de fechas o agrega mas filtros.",
        400
      );
    }

    const lineas = [
      [
        "Fecha",
        "Hora",
        "Estudiante",
        "DNI",
        "Codigo institucional",
        "Placa",
        "Marca",
        "Modelo",
        "Color",
        "Tipo",
        "Responsable de Garita",
      ]
        .map(escaparCsv)
        .join(","),
    ];

    for (let desde = 0; desde < total; desde += tamanoLote) {
      const lote = await consultarLoteHistorial(filtros, desde, tamanoLote);
      lineas.push(...lote.map(filaCsv));
    }

    const fechaArchivo = new Date().toISOString().slice(0, 10);
    return new Response(`\uFEFF${lineas.join("\r\n")}`, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="historial-salidas-${fechaArchivo}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof ErrorHistorial) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Error inesperado al exportar historial:", error);
    return NextResponse.json(
      { error: "Ocurrio un error interno." },
      { status: 500 }
    );
  }
}
