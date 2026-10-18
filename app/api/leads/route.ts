import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server.js";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const attributionSchema = z.record(z.string(), z.string().max(500)).optional().default({});
const schema = z.object({
  name: z.string().trim().min(2).max(100).refine((value) => value.split(/\s+/).length >= 2, "Ingresá nombre y apellido"),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(8).max(30),
  province: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100).optional().default(""),
  product: z.enum(["auto", "moto", "hogar", "comercio", "bicicletas", "vida", "accidentes_personales", "art", "consorcio", "viajes", "caucion_alquiler"]),
  details: z.record(z.string(), z.string().trim().max(200)).optional().default({}),
  attribution: attributionSchema
}).superRefine((data, ctx) => {
  const requiredByProduct: Record<string, string[]> = {
    auto: ["make", "model", "year"],
    moto: ["make", "model", "year"],
    hogar: ["homeSqm", "location", "occupancy"],
    consorcio: ["homeSqm", "location", "constructionMaterial", "activity"],
    bicicletas: ["make", "model", "year", "wheelSize", "bikeMaterial", "insuredAmount"],
    caucion_alquiler: ["monthlyRent", "contractDuration"]
  };
  for (const key of requiredByProduct[data.product] || []) {
    if (!data.details[key]?.trim()) ctx.addIssue({ code: "custom", path: ["details", key], message: `Falta completar: ${key}` });
  }
  if (["auto", "moto", "bicicletas"].includes(data.product)) {
    const year = Number(data.details.year);
    if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear() + 1) {
      ctx.addIssue({ code: "custom", path: ["details", "year"], message: "El año no es válido" });
    }
  }
  for (const key of ["homeSqm", "insuredAmount", "monthlyRent"]) {
    if (data.details[key] !== undefined && (!Number.isFinite(Number(data.details[key])) || Number(data.details[key]) <= 0)) {
      ctx.addIssue({ code: "custom", path: ["details", key], message: "Ingresá un importe o valor positivo" });
    }
  }
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
  const nameParts = data.name.trim().split(/\s+/);
  const firstname = nameParts.shift() || data.name;
  const lastname = nameParts.join(" ");
  const properties: Record<string, string> = {
    email: data.email,
    firstname,
    phone,
    state: data.province,
    city: data.city || data.province,
    lifecyclestage: "lead",
    insurance_product: data.product,
    insurance_request_id: requestId,
    insurance_request_details: JSON.stringify(data.details).slice(0, 900),
    lead_source: data.attribution.utm_source?.trim() || "direct"
  };
  if (lastname) properties.lastname = lastname;

  // HubSpot string properties should be omitted when attribution is absent,
  // rather than sent as empty strings that can trigger CRM validation errors.
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"] as const) {
    const value = data.attribution[key]?.trim();
    if (value) properties[key] = value;
  }

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