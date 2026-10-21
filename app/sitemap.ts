import type { MetadataRoute } from "next";

const productionSiteUrl = "https://www.cotizatuseguro.com.ar";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: productionSiteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${productionSiteUrl}/privacidad`, changeFrequency: "yearly", priority: 0.3 }
  ];
}
