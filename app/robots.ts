import type { MetadataRoute } from "next";

const productionSiteUrl = "https://cotizatuseguro.com.ar";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: "/api/" }],
    sitemap: `${productionSiteUrl}/sitemap.xml`,
    host: productionSiteUrl
  };
}
