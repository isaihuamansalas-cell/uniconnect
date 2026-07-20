import { NextResponse } from "next/server";

import { autorizarApi } from "@/lib/auth/autorizarApi";
import {
  ErrorHistorial,
  contarHistorial,
  consultarLoteHistorial,
  validarParametrosHistorial,
  type RegistroHistorial,
} from "@/lib/historial/consultarHistorial";

const rolesDetalle = [1, 2, 4] as const;
const limiteExportacion = 20_000;
const tamanoLote = 500;

function csv(valor: string | number | null | undefined) {
  return `"${String(valor ?? "").replace(/"/g, '""')}"`;
}

function fila(registro: RegistroHistorial, rolId: number) {
  const restringido = rolId === 4;
  const estudiante = registro.estudiante;
  const vehiculo = registro.vehiculo;
  const responsable = registro.responsable;
  return [
    registro.fecha ?? registro.created_at.slice(0, 10),
    registro.hora?.slice(0, 8) ?? registro.created_at.slice(11, 19),
    restringido && estudiante ? "Restringido" : estudiante ? `${estudiante.nombres} ${estudiante.apellidos}`.trim() : "",
    restringido && estudiante ? "Restringido" : estudiante?.dni ?? "",
    restringido && estudiante?.codigo_estudiante ? "Restringido" : estudiante?.codigo_estudiante ?? "",
    vehiculo ? `${vehiculo.marca ?? "Sin marca"} ${vehiculo.modelo ?? ""} ${vehiculo.color} ${vehiculo.tipo}`.replace(/\s+/g, " ").trim() : "",
    vehiculo?.placa ?? "",
    responsable ? `${responsable.nombres} ${responsable.apellidos}`.trim() : "",
  ].map(csv).join(",");
}

export async function GET(request: Request) {
  try {
    const autorizacion = await autorizarApi(request, rolesDetalle);
    if (!autorizacion.autorizado) {
      return NextResponse.json(
        { error: autorizacion.status === 401 ? "La sesion no es valida o ha vencido." : "No tienes permiso para exportar reportes." },
        { status: autorizacion.status }
      );
    }
    const parametros = validarParametrosHistorial(new URL(request.url));
    const { total, filtros } = await contarHistorial(parametros.filtros);
    if (total > limiteExportacion) {
      return NextResponse.json(
        { error: `La exportacion supera el maximo de ${limiteExportacion} registros. Aplica mas filtros.` },
        { status: 413 }
      );
    }
    const filas = ["Fecha,Hora,Estudiante,DNI,Codigo,Vehiculo,Placa,Garita responsable"];
    for (let desde = 0; desde < total; desde += tamanoLote) {
      const registros = await consultarLoteHistorial(filtros, desde, tamanoLote);
      filas.push(...registros.map((registro) => fila(registro, autorizacion.usuario.rol_id)));
    }
    const fecha = new Date().toISOString().slice(0, 10);
    return new NextResponse(`\uFEFF${filas.join("\r\n")}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="reporte-salidas-${fecha}.csv"`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    if (error instanceof ErrorHistorial) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error al exportar reporte de salidas:", error);
    return NextResponse.json({ error: "No se pudo completar la operacion." }, { status: 500 });
  }
}
