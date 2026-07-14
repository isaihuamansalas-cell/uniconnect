import type { Metadata } from "next";
import  "./globals.css";

import { ConfiguracionProvider } from "@/components/configuracion/ConfiguracionProvider";

export const metadata: Metadata = {
  title: "UniConnect",
  description: "Sistema de Seguridad y Comunicacion",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        <ConfiguracionProvider>
          {children}
        </ConfiguracionProvider>
      </body>
    </html>
  );
}
