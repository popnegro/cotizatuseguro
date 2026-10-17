import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "cotizatuseguro",
    integrations: {
      hubspotConfigured: Boolean(process.env.HUBSPOT_ACCESS_TOKEN),
      whatsappConfigured: Boolean(process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER),
      gtmConfigured: Boolean(process.env.NEXT_PUBLIC_GTM_ID),
      metaPixelConfigured: Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID)
    }
  }, { headers: { "Cache-Control": "no-store" } });
}
