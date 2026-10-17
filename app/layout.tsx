import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cotizá tu seguro | Agustín Montes",
  description: "Solicitá asesoramiento y cotización de seguros para autos, motos, hogar y comercios con Agustín Montes, Productor de Seguros en Mendoza.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://cotizatuseguro.vercel.app"),
  alternates: { canonical: "/" },
  openGraph: {
    title: "Cotizá tu seguro | Agustín Montes",
    description: "Seguros para autos, motos, hogar y comercios. Solicitá una cotización.",
    type: "website",
    locale: "es_AR"
  },
  robots: { index: true, follow: true }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#102a43"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es-AR"><body>{children}</body></html>;
}