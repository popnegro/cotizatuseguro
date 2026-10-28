import type { Metadata, Viewport } from "next";
import "./globals.css";

const productionSiteUrl = "https://cotizatuseguro.com.ar";
const isProductionDeployment = process.env.VERCEL_ENV === "production";

export const metadata: Metadata = {
  title: "Cotizá tu seguro | Agustín Montes",
  description: "Solicitá asesoramiento y cotización de seguros para autos, motos, hogar, consorcio, bicicletas y caución de alquiler con Agustín Montes en Mendoza.",
  metadataBase: new URL(productionSiteUrl),
  alternates: { canonical: "/" },
  openGraph: {
    title: "Cotizá tu seguro | Agustín Montes",
    description: "Seguros para autos, motos, hogar, consorcio, bicicletas y caución de alquiler. Solicitá una cotización.",
    type: "website",
    locale: "es_AR",
    url: productionSiteUrl,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Cotizá tu seguro con Agustín Montes" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Cotizá tu seguro | Agustín Montes",
    description: "Seguros para autos, motos, hogar, consorcio, bicicletas y caución de alquiler en Mendoza.",
    images: ["/opengraph-image"]
  },
  robots: isProductionDeployment ? { index: true, follow: true } : { index: false, follow: false }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#102a43"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es-AR"><body>{children}</body></html>;
}
