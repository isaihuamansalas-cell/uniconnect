import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Configuración" };

export default function ConfiguracionLayout({ children }: { children: ReactNode }) {
  return children;
}
