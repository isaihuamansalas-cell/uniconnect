import type { Metadata, Viewport } from "next";
import  "./globals.css";

import { PerfilProvider } from "@/components/auth/PerfilProvider";
import { ConfiguracionProvider } from "@/components/configuracion/ConfiguracionProvider";
import ThemeScript from "@/components/theme/ThemeScript";

export const metadata: Metadata = {
  metadataBase: new URL("https://uniconnect-opal.vercel.app"),
  title: {
    default: "UniConnect",
    template: "%s | UniConnect",
  },
  description:
    "Sistema institucional de seguridad y comunicación del Instituto Superior Tecnológico Suiza de Ucayali.",
  applicationName: "UniConnect",
  creator: "Instituto Superior Tecnológico Suiza de Ucayali",
  publisher: "Instituto Superior Tecnológico Suiza de Ucayali",
  category: "Educación y seguridad institucional",
  keywords: [
    "UniConnect",
    "Instituto Suiza de Ucayali",
    "seguridad institucional",
    "comunicación educativa",
    "control vehicular",
  ],
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  openGraph: {
    type: "website",
    locale: "es_PE",
    url: "/",
    siteName: "UniConnect",
    title: "UniConnect",
    description:
      "Sistema institucional de seguridad y comunicación del Instituto Superior Tecnológico Suiza de Ucayali.",
  },
  twitter: {
    card: "summary",
    title: "UniConnect",
    description:
      "Sistema institucional de seguridad y comunicación del Instituto Superior Tecnológico Suiza de Ucayali.",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
  appleWebApp: {
    capable: true,
    title: "UniConnect",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f5f9" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
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
