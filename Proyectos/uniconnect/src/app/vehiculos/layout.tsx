import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Vehículos" };

export default function VehiculosLayout({ children }: { children: ReactNode }) {
  return children;
}
