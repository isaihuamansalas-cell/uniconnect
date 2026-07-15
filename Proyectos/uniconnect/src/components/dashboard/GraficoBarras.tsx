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
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-bold text-slate-900">{titulo}</h2>
        <p className="mt-1 text-sm text-slate-500">{descripcion}</p>
      </div>

      {!tieneDatos ? (
        <p className="mt-8 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
          No hay datos para mostrar.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <svg
            role="img"
            aria-label={`${titulo}. ${descripcion}`}
            viewBox={`0 0 ${ancho} ${alto}`}
            className="h-52 min-w-full"
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
                    className="fill-emerald-600"
                  />
                  <text
                    x={x + barWidth / 2}
                    y={y - 8}
                    textAnchor="middle"
                    className="fill-slate-700 text-[12px] font-semibold"
                  >
                    {punto.valor}
                  </text>
                  <text
                    x={x + barWidth / 2}
                    y={160}
                    textAnchor="middle"
                    className="fill-slate-500 text-[12px]"
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
