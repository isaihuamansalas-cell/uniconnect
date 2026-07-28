import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Auditoría" };

export default function AuditoriaLayout({ children }: { children: ReactNode }) {
  return children;
}
