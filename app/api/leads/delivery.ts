import { getLead, updateLead, type StoredLead } from "./lead-store.ts";

const HUBSPOT_ENDPOINT = "https://api.hubapi.com/crm/v3/objects/contacts";

export type DeliveryResult =
  | { status: "sent"; contactId?: string }
  | { status: "pending"; errorCode: string; retryable: boolean };

export async function deliverLead(lead: StoredLead): Promise<DeliveryResult> {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) return { status: "pending", errorCode: "hubspot_not_configured", retryable: false };

  try {
    const response = await fetch(HUBSPOT_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ properties: lead.properties }),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000)
    });

    if (response.ok) {
      const result = await response.json() as { id?: string };
      return { status: "sent", contactId: result.id };
    }

    return {
      status: "pending",
      errorCode: `hubspot_http_${response.status}`,
      retryable: response.status === 429 || response.status >= 500
    };
  } catch (error) {
    return {
      status: "pending",
      errorCode: error instanceof Error && error.name === "TimeoutError" ? "hubspot_timeout" : "hubspot_network_error",
      retryable: true
    };
  }
}

export async function deliverStoredLead(requestId: string): Promise<StoredLead | null> {
  const lead = await getLead(requestId);
  if (!lead || lead.status === "sent") return lead;

  const result = await deliverLead(lead);
  const now = Date.now();
  if (result.status === "sent") {
    const updated: StoredLead = {
      ...lead,
      status: "sent",
      attempts: lead.attempts + 1,
      nextAttemptAt: 0,
      updatedAt: now,
      contactId: result.contactId
    };
    delete updated.lastErrorCode;
    await updateLead(updated);
    return updated;
  }

  const attempts = lead.attempts + 1;
  const updated: StoredLead = {
    ...lead,
    status: "pending",
    attempts,
    nextAttemptAt: result.retryable ? now + Math.min(60_000, 1_000 * 2 ** Math.max(0, attempts - 1)) : Number.MAX_SAFE_INTEGER,
    updatedAt: now,
    lastErrorCode: result.errorCode
  };
  await updateLead(updated);
  return updated;
}
