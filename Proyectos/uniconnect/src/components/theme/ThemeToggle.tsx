"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Tema = "light" | "dark";

function obtenerTemaActual(): Tema {
  if (typeof document === "undefined") {
    return "light";
  }

  return document.documentElement.classList.contains("dark")
    ? "dark"
    : "light";
}

function aplicarTema(tema: Tema) {
  document.documentElement.classList.toggle("dark", tema === "dark");
  window.localStorage.setItem("theme", tema);
}

export default function ThemeToggle() {
  const [tema, setTema] = useState<Tema>("light");

  useEffect(() => {
    setTema(obtenerTemaActual());
  }, []);

  function alternarTema() {
    const siguienteTema: Tema = tema === "dark" ? "light" : "dark";
    aplicarTema(siguienteTema);
    setTema(siguienteTema);
  }

  const esOscuro = tema === "dark";
  const Icono = esOscuro ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={alternarTema}
      aria-label={
        esOscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
      }
      title={esOscuro ? "Modo claro" : "Modo oscuro"}
      className="focus-primary inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      <Icono size={20} />
    </button>
  );
}
