import { claimLead, getLead, releaseLeadClaim, updateLead, type StoredLead } from "./lead-store.ts";

const HUBSPOT_ENDPOINT = "https://api.hubapi.com/crm/v3/objects/contacts";
const HUBSPOT_SEARCH_ENDPOINT = "https://api.hubapi.com/crm/v3/objects/contacts/search";

export type DeliveryResult =
  | { status: "sent"; contactId?: string }
  | { status: "pending"; errorCode: string; retryable: true }
  | { status: "failed"; errorCode: string };

async function findExistingContact(lead: StoredLead, token: string): Promise<
  | { status: "found"; contactId?: string }
  | { status: "not_found" }
  | { status: "unavailable"; errorCode: string }
> {
  const requestId = lead.properties.insurance_request_id;
  if (!requestId) return { status: "unavailable", errorCode: "hubspot_reconciliation_missing_request_id" };

  try {
    const response = await fetch(HUBSPOT_SEARCH_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        filterGroups: [{
          filters: [{
            propertyName: "insurance_request_id",
            operator: "EQ",
            value: requestId
          }]
        }],
        properties: ["insurance_request_id"],
        limit: 1
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000)
    });

    if (!response.ok) {
      return { status: "unavailable", errorCode: `hubspot_reconciliation_http_${response.status}` };
    }

    const result = await response.json() as { results?: Array<{ id?: string }> };
    const existing = result.results?.[0];
    return existing ? { status: "found", contactId: existing.id } : { status: "not_found" };
  } catch (error) {
    return {
      status: "unavailable",
      errorCode: error instanceof Error && error.name === "TimeoutError"
        ? "hubspot_reconciliation_timeout"
        : "hubspot_reconciliation_network_error"
    };
  }
}

export async function deliverLead(lead: StoredLead): Promise<DeliveryResult> {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) return { status: "failed", errorCode: "hubspot_not_configured" };

  // A prior attempt may have created the contact even if its response was lost.
  // Reconcile by the stable request ID before issuing another non-idempotent POST.
  if (lead.attempts > 0) {
    const existing = await findExistingContact(lead, token);
    if (existing.status === "found") return { status: "sent", contactId: existing.contactId };
    if (existing.status === "unavailable") {
      // Fail closed: never create a possible duplicate when reconciliation is unavailable.
      return { status: "pending", errorCode: existing.errorCode, retryable: true };
    }
  }

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

    const errorCode = `hubspot_http_${response.status}`;
    if (response.status === 429 || response.status >= 500) {
      return { status: "pending", errorCode, retryable: true };
    }
    return { status: "failed", errorCode };
  } catch (error) {
    return {
      status: "pending",
      errorCode: error instanceof Error && error.name === "TimeoutError" ? "hubspot_timeout" : "hubspot_network_error",
      retryable: true
    };
  }
}

export async function deliverStoredLead(requestId: string): Promise<StoredLead | null> {
  const claimToken = await claimLead(requestId);
  // The initial request and scheduled worker can race after persistence. Only the
  // worker holding the short Redis lease may contact HubSpot for this lead.
  if (!claimToken) return getLead(requestId);

  try {
    const lead = await getLead(requestId);
    if (!lead || lead.status !== "pending" || lead.nextAttemptAt > Date.now()) return lead;

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
      status: result.status === "failed" ? "failed" : "pending",
      attempts,
      nextAttemptAt: result.status === "failed" ? 0 : now + Math.min(60_000, 1_000 * 2 ** Math.max(0, attempts - 1)),
      updatedAt: now,
      lastErrorCode: result.errorCode
    };
    await updateLead(updated);
    return updated;
  } finally {
    await releaseLeadClaim(requestId, claimToken);
  }
}
