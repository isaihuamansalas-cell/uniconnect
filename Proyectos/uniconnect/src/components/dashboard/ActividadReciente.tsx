import Link from "next/link";

type Actividad = {
  id: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  tipo: string;
  ruta: string;
};

type ActividadRecienteProps = {
  titulo: string;
  actividades: Actividad[];
};

const formatoFecha = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "short",
  timeStyle: "short",
});

export default function ActividadReciente({
  titulo,
  actividades,
}: ActividadRecienteProps) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">{titulo}</h2>

      {actividades.length === 0 ? (
        <p className="mt-6 rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">
          No hay actividad reciente.
        </p>
      ) : (
        <div className="mt-4 divide-y divide-slate-100">
          {actividades.map((actividad) => (
            <Link
              key={`${actividad.tipo}-${actividad.id}`}
              href={actividad.ruta}
              className="block py-4 transition hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">
                    {actividad.titulo}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {actividad.descripcion}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                  {actividad.tipo}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                {formatoFecha.format(new Date(actividad.fecha))}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
