import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Usuarios" };

export default function UsuariosLayout({ children }: { children: ReactNode }) {
  return children;
}
