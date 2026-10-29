import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const metaPixelConfigured = Boolean(
    process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID
  );
  const metaCapiConfigured = Boolean(
    process.env.META_PIXEL_ID && process.env.META_CAPI_ACCESS_TOKEN
  );

  return NextResponse.json({
    ok: true,
    service: "cotizatuseguro",
    integrations: {
      hubspotConfigured: Boolean(process.env.HUBSPOT_ACCESS_TOKEN),
      whatsappConfigured: Boolean(process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER),
      gtmConfigured: Boolean(process.env.NEXT_PUBLIC_GTM_ID),
      metaPixelConfigured,
      metaCapiConfigured
    }
  }, { headers: { "Cache-Control": "no-store" } });
}
