type PuntoGrafico = {
  etiqueta: string;
  valor: number;
};

type GraficoBarrasProps = {
  titulo: string;
  descripcion: string;
  datos: PuntoGrafico[];
};

export default function GraficoBarras({
  titulo,
  descripcion,
  datos,
}: GraficoBarrasProps) {
  const maximo = Math.max(...datos.map((punto) => punto.valor), 0);
  const tieneDatos = maximo > 0;
  const ancho = Math.max(datos.length * 48, 320);
  const alto = 180;

  return (
    <section className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl bg-white p-4 shadow-sm dark:border dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{titulo}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{descripcion}</p>
      </div>

      {!tieneDatos ? (
        <p className="mt-8 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          No hay datos para mostrar.
        </p>
      ) : (
        <div className="mt-5 flex w-full min-w-0 max-w-full justify-center overflow-hidden">
          <svg
            role="img"
            aria-label={`${titulo}. ${descripcion}`}
            width="100%"
            preserveAspectRatio="xMidYMid meet"
            viewBox={`0 0 ${ancho} ${alto}`}
            className="block h-auto w-full max-w-full"
          >
            {datos.map((punto, indice) => {
              const barWidth = 28;
              const gap = ancho / datos.length;
              const barHeight = (punto.valor / maximo) * 110;
              const x = indice * gap + gap / 2 - barWidth / 2;
              const y = 130 - barHeight;

              return (
                <g key={punto.etiqueta}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx={6}
                    className="fill-primary"
                  />
                  <text
                    x={x + barWidth / 2}
                    y={y - 8}
                    textAnchor="middle"
                    className="fill-slate-700 text-[12px] font-semibold dark:fill-slate-200"
                  >
                    {punto.valor}
                  </text>
                  <text
                    x={x + barWidth / 2}
                    y={160}
                    textAnchor="middle"
                    className="fill-slate-500 text-[12px] dark:fill-slate-400"
                  >
                    {punto.etiqueta}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </section>
  );
}
