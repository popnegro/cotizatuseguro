import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const attributionSchema = z.record(z.string(), z.string().max(500)).optional().default({});
const schema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(8).max(30),
  city: z.string().trim().min(2).max(100),
  product: z.enum(["auto", "moto", "hogar", "comercio"]),
  details: z.record(z.string(), z.string().max(200)).optional().default({}),
  attribution: attributionSchema
});

const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 8;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

function rateLimit(key: string) {
  const now = Date.now();
  const current = rateBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (current.count >= MAX_REQUESTS_PER_WINDOW) return false;
  current.count += 1;
  return true;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 24);
  if (!rateLimit(ipHash)) return jsonError("Demasiadas solicitudes. Esperá un minuto e intentá nuevamente.", 429);

  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) return jsonError("La recepción de solicitudes todavía no está configurada. Intentá más tarde.", 503);

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > 16_000) return jsonError("La solicitud es demasiado grande.", 413);

  let raw: unknown;
  try { raw = await request.json(); } catch { return jsonError("El formato de la solicitud no es válido.", 400); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return jsonError("Revisá los datos obligatorios del formulario.", 400);

  const data = parsed.data;
  const requestId = `SOL-${randomUUID().slice(0, 8).toUpperCase()}`;
  const phone = data.phone.replace(/[\s().-]/g, "");
  const properties: Record<string, string> = {
    firstname: data.name,
    phone,
    city: data.city,
    lifecyclestage: "lead",
    insurance_product: data.product,
    insurance_request_id: requestId,
    insurance_request_details: JSON.stringify(data.details).slice(0, 900),
    lead_source: data.attribution.utm_source || "direct",
    utm_source: data.attribution.utm_source || "",
    utm_medium: data.attribution.utm_medium || "",
    utm_campaign: data.attribution.utm_campaign || "",
    utm_content: data.attribution.utm_content || "",
    utm_term: data.attribution.utm_term || "",
    gclid: data.attribution.gclid || "",
    fbclid: data.attribution.fbclid || ""
  };

  const endpoint = "https://api.hubapi.com/crm/v3/objects/contacts";
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ properties }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000)
    });
    if (response.status === 409) {
      return jsonError("Ya existe un registro coincidente. Revisá HubSpot antes de volver a enviarlo.", 409);
    }
    if (!response.ok) {
      const correlation = response.headers.get("x-hubspot-correlation-id") || "unavailable";
      console.error("HubSpot lead create failed", { status: response.status, correlation, requestId });
      if (response.status === 429 || response.status >= 500) return jsonError("El CRM no está disponible temporalmente. Intentá nuevamente en unos minutos.", 503);
      return jsonError("No pudimos registrar la solicitud. La integración del CRM requiere revisión.", 502);
    }
    const result = await response.json() as { id?: string };
    return NextResponse.json({ ok: true, requestId, contactId: result.id }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("HubSpot lead request failed", { requestId, reason: error instanceof Error ? error.name : "unknown" });
    return jsonError("No pudimos conectar con el CRM. Intentá nuevamente.", 503);
  }
}