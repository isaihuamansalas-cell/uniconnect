type PuntoGrafico = {
  etiqueta: string;
  valor: number;
};

type GraficoDistribucionProps = {
  titulo: string;
  descripcion: string;
  datos: PuntoGrafico[];
};

export default function GraficoDistribucion({
  titulo,
  descripcion,
  datos,
}: GraficoDistribucionProps) {
  const maximo = Math.max(...datos.map((punto) => punto.valor), 0);

  return (
    <section className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-lg font-bold text-slate-900">{titulo}</h2>
      <p className="mt-1 text-sm text-slate-500">{descripcion}</p>

      {maximo === 0 ? (
        <p className="mt-8 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
          No hay datos para mostrar.
        </p>
      ) : (
        <div className="mt-5 min-w-0 max-w-full space-y-4">
          {datos.map((punto) => {
            const porcentaje = Math.max(
              4,
              Math.round((punto.valor / maximo) * 100)
            );

            return (
              <div key={punto.etiqueta} className="min-w-0 max-w-full">
                <div className="flex min-w-0 items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 break-words font-medium text-slate-700">
                    {punto.etiqueta}
                  </span>
                  <span className="font-semibold text-slate-900">
                    {punto.valor}
                  </span>
                </div>
                <div
                  className="mt-2 h-3 max-w-full overflow-hidden rounded-full bg-slate-100"
                  aria-label={`${punto.etiqueta}: ${punto.valor}`}
                >
                  <div
                    className="h-3 rounded-full bg-emerald-600"
                    style={{ width: `${porcentaje}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
