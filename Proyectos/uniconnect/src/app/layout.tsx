import type { Metadata } from "next";
import  "./globals.css";

import { PerfilProvider } from "@/components/auth/PerfilProvider";
import { ConfiguracionProvider } from "@/components/configuracion/ConfiguracionProvider";
import ThemeScript from "@/components/theme/ThemeScript";

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
    <html lang="es" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="antialiased">
        <ConfiguracionProvider>
          <PerfilProvider>
            {children}
          </PerfilProvider>
        </ConfiguracionProvider>
      </body>
    </html>
  );
}
