import { NextResponse } from "next/server";

import { autorizarApi } from "@/lib/auth/autorizarApi";
import {
  ErrorHistorial,
  consultarPaginaHistorial,
  validarParametrosHistorial,
  type RegistroHistorial,
} from "@/lib/historial/consultarHistorial";

const rolesReportes = [1, 2, 3, 4] as const;

function adaptarRegistro(registro: RegistroHistorial, rolId: number) {
  const estudiante = registro.estudiante
    ? rolId === 4
      ? { ...registro.estudiante, nombres: "Restringido", apellidos: "", dni: "Restringido", codigo_estudiante: registro.estudiante.codigo_estudiante ? "Restringido" : null }
      : registro.estudiante
    : null;
  return {
    id: registro.id,
    vehiculo_id: registro.vehiculo?.id ?? 0,
    estudiante_id: registro.estudiante?.id ?? "",
    garita_id: registro.responsable?.id ?? "",
    fecha: registro.fecha,
    hora: registro.hora,
    created_at: registro.created_at,
    estudiante,
    garita: registro.responsable,
    vehiculo: registro.vehiculo,
  };
}

export async function GET(request: Request) {
  try {
    const autorizacion = await autorizarApi(request, rolesReportes);
    if (!autorizacion.autorizado) {
      return NextResponse.json(
        { error: autorizacion.status === 401 ? "La sesion no es valida o ha vencido." : "No tienes permiso para ver reportes." },
        { status: autorizacion.status }
      );
    }
    const rolId = autorizacion.usuario.rol_id;
    if (rolId === 3) {
      return NextResponse.json(
        { error: "Los profesores solo pueden ver estadisticas generales.", rol_id: rolId },
        { status: 403 }
      );
    }
    const parametros = validarParametrosHistorial(new URL(request.url));
    const resultado = await consultarPaginaHistorial(parametros);
    return NextResponse.json({
      salidas: resultado.registros.map((registro) => adaptarRegistro(registro, rolId)),
      rol_id: rolId,
      page: resultado.page,
      pageSize: resultado.pageSize,
      total: resultado.total,
      totalPages: resultado.totalPages,
    });
  } catch (error) {
    if (error instanceof ErrorHistorial) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error al cargar salidas de reportes:", error);
    return NextResponse.json({ error: "No se pudo cargar la informacion." }, { status: 500 });
  }
}
