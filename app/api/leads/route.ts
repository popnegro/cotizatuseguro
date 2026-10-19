import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server.js";
import { z } from "zod";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const attributionSchema = z.record(z.string(), z.string().max(500)).optional().default({});
const schema = z.object({
  website: z.string().max(200).optional().default(""),
  name: z.string().trim().min(2).max(100).refine((value) => value.split(/\s+/).length >= 2, "Ingresá nombre y apellido"),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(8).max(30),
  province: z.string().trim().min(2).max(100),
  city: z.string().trim().max(100).optional().default(""),
  product: z.enum(["auto", "moto", "hogar", "consorcio", "bicicletas", "caucion_alquiler"]),
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
  if (data.details.contractDuration !== undefined) {
    const duration = Number(data.details.contractDuration);
    if (!Number.isInteger(duration) || duration < 1 || duration > 120) {
      ctx.addIssue({ code: "custom", path: ["details", "contractDuration"], message: "La duración debe ser de 1 a 120 meses" });
    }
  }
  if (data.product === "hogar" && !["propia", "alquiler"].includes(data.details.occupancy || "")) {
    ctx.addIssue({ code: "custom", path: ["details", "occupancy"], message: "Seleccioná vivienda propia o alquiler" });
  }
});

const MAX_REQUESTS_PER_WINDOW = 8;

function jsonError(message: string, status: number, headers: Record<string, string> = {}) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store", ...headers }
  });
}

let rateLimiter: Ratelimit | undefined;
function getRateLimiter(): Ratelimit {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Distributed rate limiter is not configured");
  if (!rateLimiter) {
    rateLimiter = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(MAX_REQUESTS_PER_WINDOW, "60 s"),
      prefix: "cotizatuseguro:leads",
      analytics: false,
      timeout: 1_500,
      enableProtection: true
    });
  }
  return rateLimiter;
}

export async function POST(request: NextRequest) {
  // Vercel provides x-real-ip at the platform boundary. Hash it before using it as a Redis key.
  const ip = request.headers.get("x-real-ip")?.trim()
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "";
  if (!ip) return jsonError("No pudimos validar el origen de la solicitud.", 400);

  const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 24);
  let limit: Awaited<ReturnType<Ratelimit["limit"]>>;
  try {
    limit = await getRateLimiter().limit(ipHash);
  } catch (error) {
    console.error("Distributed rate limiter unavailable", { reason: error instanceof Error ? error.name : "unknown" });
    // Fail closed: do not forward lead submissions to HubSpot when abuse controls are unavailable.
    return jsonError("La recepción de solicitudes no está disponible temporalmente. Intentá más tarde.", 503);
  }
  if (!limit.success) {
    const retryAfter = Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000));
    return jsonError("Demasiadas solicitudes. Esperá antes de intentarlo nuevamente.", 429, { "Retry-After": String(retryAfter) });
  }

  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) return jsonError("La recepción de solicitudes todavía no está configurada. Intentá más tarde.", 503);

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > 16_000) return jsonError("La solicitud es demasiado grande.", 413);

  let raw: unknown;
  try { raw = await request.json(); } catch { return jsonError("El formato de la solicitud no es válido.", 400); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return jsonError("Revisá los datos obligatorios del formulario.", 400);

  const data = parsed.data;
  // Honeypot: silently reject automated submissions before any CRM request.
  if (data.website.trim()) return jsonError("No pudimos procesar la solicitud. Revisá los datos e intentá nuevamente.", 400);
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