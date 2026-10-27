import type { StoredLead } from "./lead-store.ts";

const GRAPH_VERSION = "v21.0";

export type MetaCapiResult =
  | { status: "sent"; eventsReceived?: number }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

type MetaUserData = {
  client_ip_address?: string;
  client_user_agent?: string;
  fbc?: string;
  fbp?: string;
};

/**
 * Server-side Meta Conversions API (Lead).
 * - Never blocks HubSpot delivery: callers must treat failures as non-fatal.
 * - Does not send email, phone, or name (privacy-first; matches project policy).
 * - Uses requestId as event_id for Pixel ↔ CAPI deduplication.
 */
export async function sendMetaLeadEvent(lead: StoredLead): Promise<MetaCapiResult> {
  const pixelId = process.env.META_PIXEL_ID?.trim() || process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN?.trim();
  if (!pixelId || !accessToken) {
    return { status: "skipped", reason: "meta_capi_not_configured" };
  }

  const eventId = lead.requestId || lead.properties.insurance_request_id;
  if (!eventId) {
    return { status: "skipped", reason: "meta_capi_missing_event_id" };
  }

  const eventTime = Math.floor((lead.updatedAt || lead.createdAt || Date.now()) / 1000);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://cotizatuseguro.com.ar").replace(/\/$/, "");

  const userData: MetaUserData = {};
  const ctx = lead.eventContext;
  if (ctx?.clientIp) userData.client_ip_address = ctx.clientIp;
  if (ctx?.userAgent) userData.client_user_agent = ctx.userAgent;
  if (ctx?.fbp) userData.fbp = ctx.fbp;
  if (ctx?.fbc) {
    userData.fbc = ctx.fbc;
  } else if (lead.properties.fbclid) {
    // Meta expects fbc as fb.1.<timestamp>.<fbclid> when only the click id is known.
    userData.fbc = `fb.1.${eventTime}.${lead.properties.fbclid}`;
  }

  const customData: Record<string, string> = {};
  if (lead.properties.insurance_product) {
    customData.content_category = lead.properties.insurance_product;
    customData.content_name = lead.properties.insurance_product;
  }

  const payload = {
    data: [
      {
        event_name: "Lead",
        event_time: eventTime,
        event_id: eventId,
        action_source: "website",
        event_source_url: siteUrl,
        user_data: userData,
        custom_data: Object.keys(customData).length ? customData : undefined
      }
    ]
  };

  try {
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(accessToken)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000)
    });

    if (!response.ok) {
      // Do not surface Meta error bodies (may contain sensitive diagnostics).
      return { status: "failed", reason: `meta_capi_http_${response.status}` };
    }

    const result = await response.json() as { events_received?: number };
    return { status: "sent", eventsReceived: result.events_received };
  } catch (error) {
    return {
      status: "failed",
      reason: error instanceof Error && error.name === "TimeoutError"
        ? "meta_capi_timeout"
        : "meta_capi_network_error"
    };
  }
}

/** Test-only seam. */
let metaCapiOverride: ((lead: StoredLead) => Promise<MetaCapiResult>) | undefined;

export function __setMetaCapiForTests(override: typeof metaCapiOverride): void {
  metaCapiOverride = override;
}

export async function sendMetaLeadEventSafe(lead: StoredLead): Promise<MetaCapiResult> {
  if (metaCapiOverride) return metaCapiOverride(lead);
  return sendMetaLeadEvent(lead);
}
