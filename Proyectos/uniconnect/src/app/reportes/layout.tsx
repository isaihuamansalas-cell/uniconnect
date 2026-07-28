import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Reportes" };

export default function ReportesLayout({ children }: { children: ReactNode }) {
  return children;
}
