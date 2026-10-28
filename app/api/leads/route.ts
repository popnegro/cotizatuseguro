import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server.js";
import { z } from "zod";
import { checkRateLimit } from "./rate-limit.ts";
import { persistLead, retryDelayMs, type StoredLead } from "./lead-store.ts";
import { deliverStoredLead } from "./delivery.ts";

// Infrastructure mode is safe only after Vercel Firewall rules for POST /api/leads
// have been independently verified. Missing the explicit verification flag fails
// closed to the application-level Upstash limiter.
function infrastructureRateLimitEnabled() {
  return process.env.LEADS_RATE_LIMIT_MODE === "infrastructure"
    && process.env.LEADS_INFRA_RATE_LIMIT_VERIFIED === "true";
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const attributionSchema = z.record(z.string(), z.string().max(500)).optional().default({});
const schema = z.object({
  website: z.string().max(200).optional().default(""),
  name: z.string().trim().min(2).max(100).refine((value) => value.split(/\s+/).length >= 2, "Ingresá nombre y apellido"),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(8).max(30),
  province: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2, "Ingresá tu localidad o departamento").max(100),
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


function jsonError(message: string, status: number, headers: Record<string, string> = {}) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store", ...headers }
  });
}

export async function POST(request: NextRequest) {
  // Vercel provides x-real-ip at the platform boundary. Hash it before using it as a Redis key.
  const ip = request.headers.get("x-real-ip")?.trim()
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "";
  if (!ip) return jsonError("No pudimos validar el origen de la solicitud.", 400);

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > 16_000) return jsonError("La solicitud es demasiado grande.", 413);

  let raw: unknown;
  try { raw = await request.json(); } catch { return jsonError("El formato de la solicitud no es válido.", 400); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return jsonError("Revisá los datos obligatorios del formulario.", 400);

  const data = parsed.data;
  // Reject honeypot submissions before consuming rate-limit quota or contacting the CRM.
  if (data.website.trim()) return jsonError("No pudimos procesar la solicitud. Revisá los datos e intentá nuevamente.", 400);

  const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 24);
  if (!infrastructureRateLimitEnabled()) {
    let limit: { success: boolean; reset: number };
    try {
      limit = await checkRateLimit(ipHash);
    } catch (error) {
      console.error("Distributed rate limiter unavailable", { reason: error instanceof Error ? error.name : "unknown" });
      // Fail closed unless infrastructure rate limiting was explicitly enabled.
      return jsonError("La recepción de solicitudes no está disponible temporalmente. Intentá más tarde.", 503);
    }
    if (!limit.success) {
      const retryAfter = Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000));
      return jsonError("Demasiadas solicitudes. Esperá antes de intentarlo nuevamente.", 429, { "Retry-After": String(retryAfter) });
    }
  }

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

  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"] as const) {
    const value = data.attribution[key]?.trim();
    if (value) properties[key] = value;
  }

  const userAgent = request.headers.get("user-agent")?.trim() || undefined;
  // Optional browser cookies forwarded by the client for Meta matching (never required).
  const fbp = typeof data.attribution._fbp === "string" ? data.attribution._fbp.trim() || undefined : undefined;
  const fbc = typeof data.attribution._fbc === "string" ? data.attribution._fbc.trim() || undefined : undefined;

  const now = Date.now();
  const lead: StoredLead = {
    requestId,
    properties,
    status: "pending",
    attempts: 0,
    nextAttemptAt: now,
    createdAt: now,
    updatedAt: now,
    eventContext: {
      clientIp: ip || undefined,
      userAgent,
      fbp,
      fbc
    }
  };

  // Durability is a prerequisite: never call HubSpot unless the lead was persisted first.
  try {
    await persistLead(lead);
  } catch (error) {
    console.error("Lead persistence failed", {
      requestId,
      reason: error instanceof Error ? error.name : "unknown"
    });
    return jsonError("No pudimos guardar la solicitud de forma segura. Intentá nuevamente más tarde.", 503);
  }

  try {
    const delivered = await deliverStoredLead(requestId);
    if (delivered?.status === "sent") {
      return NextResponse.json({ ok: true, requestId, contactId: delivered.contactId }, {
        status: 201,
        headers: { "Cache-Control": "no-store" }
      });
    }

    // A permanent upstream rejection is retained for manual review, not falsely queued for retry.
    if (delivered?.status === "failed") {
      return NextResponse.json({ ok: true, requestId, status: "needs_review" }, {
        status: 202,
        headers: { "Cache-Control": "no-store" }
      });
    }

    // The request is accepted because it is durable; a scheduled retry can process it later.
    return NextResponse.json({ ok: true, requestId, status: "pending" }, {
      status: 202,
      headers: { "Cache-Control": "no-store", "Retry-After": String(Math.max(1, Math.ceil(retryDelayMs(delivered?.attempts ?? 1) / 1000))) }
    });
  } catch (error) {
    console.error("Lead delivery state update failed", {
      requestId,
      reason: error instanceof Error ? error.name : "unknown"
    });
    return NextResponse.json({ ok: true, requestId, status: "pending" }, {
      status: 202,
      headers: { "Cache-Control": "no-store" }
    });
  }
}
