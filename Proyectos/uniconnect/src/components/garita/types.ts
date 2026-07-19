export type EstudianteGarita = {
  id: string;
  nombres: string;
  apellidos: string;
  dni: string;
  codigo_estudiante: string | null;
  estado: boolean;
  rol_id: number;
  tiene_foto: boolean;
  foto_version: string;
};

export type VehiculoGarita = {
  id: number;
  usuario_id: string;
  placa: string;
  marca: string | null;
  modelo: string | null;
  color: string;
  tipo: string;
  estado: boolean;
  tiene_foto: boolean;
  foto_version: string;
};

export type SalidaReciente = {
  id: number;
  fecha: string | null;
  hora: string | null;
  created_at: string;
  estudiante: Pick<
    EstudianteGarita,
    | "id"
    | "nombres"
    | "apellidos"
    | "dni"
    | "codigo_estudiante"
    | "tiene_foto"
    | "foto_version"
  > | null;
  vehiculo: {
    id: number;
    placa: string;
    marca: string | null;
    modelo: string | null;
    color: string;
    tipo: string;
  } | null;
};
