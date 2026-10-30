import type { Metadata, Viewport } from "next";
import "./globals.css";

const productionSiteUrl = "https://cotizatuseguro.com.ar";
const socialImagePath = "https://cotizatuseguro.com.ar/opengraph-image.jpeg";
const socialImageAlt = "El asesoramiento profesional marca la diferencia — Agustín Montes";

const isProductionDeployment = process.env.VERCEL_ENV === "production";

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${productionSiteUrl}/#website`,
      url: productionSiteUrl,
      name: "CotizaTuSeguro",
      inLanguage: "es-AR",
      publisher: { "@id": `${productionSiteUrl}/#advisor` }
    },
    {
      "@type": "Person",
      "@id": `${productionSiteUrl}/#advisor`,
      name: "Agustín Montes",
      url: productionSiteUrl,
      jobTitle: "Productor Asesor de Seguros",
      areaServed: { "@type": "Country", name: "Argentina" }
    },
    {
      "@type": "WebPage",
      "@id": `${productionSiteUrl}/#webpage`,
      url: productionSiteUrl,
      name: "Cotizá tu seguro | Agustín Montes",
      isPartOf: { "@id": `${productionSiteUrl}/#website` },
      about: { "@id": `${productionSiteUrl}/#advisor` },
      inLanguage: "es-AR"
    }
  ]
};

export const metadata: Metadata = {
  title: "Cotizá tu seguro en Argentina | Agustín Montes",
  description: "Solicitá asesoramiento para cotizar seguros de auto, moto, hogar, consorcio, bicicleta o caución de alquiler. La propuesta depende de la evaluación de cada riesgo.",
  metadataBase: new URL(productionSiteUrl),
  alternates: { canonical: "/" },
  verification: {
    google: "5BdbufppvxzR5z65ZB1XuPNX0X3I7CQwrAXvWwSsFdk"
  },
  openGraph: {
    title: "Cotizá tu seguro | Agustín Montes",
    description: "Consultá por seguros de auto, moto, hogar, consorcio, bicicleta y caución de alquiler. Solicitá una cotización personalizada.",
    type: "website",
    siteName: "CotizaTuSeguro",
    locale: "es_AR",
    url: productionSiteUrl,
    images: [{
      url: socialImagePath,
      type: "image/jpeg",
      width: 1200,
      height: 630,
      alt: socialImageAlt
    }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Cotizá tu seguro | Agustín Montes",
    description: "Solicitá una cotización personalizada para distintos tipos de seguros.",
    images: [{ url: socialImagePath, alt: socialImageAlt }]
  },
  robots: isProductionDeployment ? { index: true, follow: true } : { index: false, follow: false }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#102a43"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es-AR"><body><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />{children}</body></html>;
}
