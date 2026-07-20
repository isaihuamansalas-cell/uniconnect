"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export type TamanoPaginaComun = 10 | 20 | 50;

type PaginacionProps = {
  page: number;
  pageSize: TamanoPaginaComun;
  total: number;
  totalPages: number;
  cargando?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: TamanoPaginaComun) => void;
};

export default function Paginacion({
  page,
  pageSize,
  total,
  totalPages,
  cargando = false,
  onPageChange,
  onPageSizeChange,
}: PaginacionProps) {
  const desde = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const hasta = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {desde}-{hasta} de {total}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          Por pagina
          <select
            value={pageSize}
            disabled={cargando}
            onChange={(event) =>
              onPageSizeChange(Number(event.target.value) as TamanoPaginaComun)
            }
            className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-900 outline-none focus-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </label>

        <button
          type="button"
          aria-label="Pagina anterior"
          disabled={cargando || page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ChevronLeft size={20} />
        </button>

        <span className="min-w-24 text-center text-sm font-medium text-slate-700 dark:text-slate-200">
          {totalPages === 0 ? 0 : page} / {totalPages}
        </span>

        <button
          type="button"
          aria-label="Pagina siguiente"
          disabled={cargando || totalPages === 0 || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
