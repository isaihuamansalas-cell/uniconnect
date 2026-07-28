import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Garita" };

export default function GaritaLayout({ children }: { children: ReactNode }) {
  return children;
}
