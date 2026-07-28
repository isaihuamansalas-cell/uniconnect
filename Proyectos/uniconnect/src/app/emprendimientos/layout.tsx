import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Emprendimientos" };

export default function EmprendimientosLayout({ children }: { children: ReactNode }) {
  return children;
}
