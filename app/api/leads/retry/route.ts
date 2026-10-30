import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server.js";
import { getDuePendingLeads } from "../lead-store.ts";
import { deliverStoredLead } from "../delivery.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Keep the sequential batch comfortably below the scheduler's 60-second HTTP timeout.
const RETRY_BATCH_SIZE = 4;

function authorized(request: NextRequest): boolean {
  const expected = process.env.LEAD_RETRY_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || !provided) return false;
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const leads = await getDuePendingLeads(RETRY_BATCH_SIZE);
    let sent = 0;
    let pending = 0;
    let failed = 0;
    for (const lead of leads) {
      const result = await deliverStoredLead(lead.requestId);
      if (result?.status === "sent") sent += 1;
      else if (result?.status === "failed") failed += 1;
      else pending += 1;
    }
    return NextResponse.json({ ok: true, processed: leads.length, sent, pending, failed }, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    console.error("Lead retry batch failed", { reason: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ error: "No se pudo procesar la cola de solicitudes" }, {
      status: 503,
      headers: { "Cache-Control": "no-store" }
    });
  }
}
