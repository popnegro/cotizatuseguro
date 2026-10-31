import { randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";

const LEAD_TTL_SECONDS = 30 * 24 * 60 * 60;
const LEAD_PREFIX = "cotizatuseguro:lead";
const PENDING_KEY = "cotizatuseguro:leads:pending";
const CLAIM_PREFIX = "cotizatuseguro:lead-claim";
const CLAIM_TTL_MS = 30_000;

export type LeadStatus = "pending" | "sent" | "failed";

export type LeadEventContext = {
  /** Client IP as seen by the edge (for Meta CAPI matching only). */
  clientIp?: string;
  userAgent?: string;
  /** Meta browser pixel cookie (_fbp) when available. */
  fbp?: string;
  /** Meta click id cookie (_fbc) when available. */
  fbc?: string;
};

export type StoredLead = {
  requestId: string;
  properties: Record<string, string>;
  status: LeadStatus;
  attempts: number;
  nextAttemptAt: number;
  createdAt: number;
  updatedAt: number;
  contactId?: string;
  lastErrorCode?: string;
  /** Non-PII matching hints for Meta Conversions API. Not sent to HubSpot. */
  eventContext?: LeadEventContext;
};

let redisClient: Redis | undefined;
type LeadStoreOverrides = {
  persistLead?: (lead: StoredLead) => Promise<void>;
  getLead?: (requestId: string) => Promise<StoredLead | null>;
  getDuePendingLeads?: (limit?: number) => Promise<StoredLead[]>;
  updateLead?: (lead: StoredLead) => Promise<void>;
  claimLead?: (requestId: string, token: string) => Promise<boolean>;
  releaseLeadClaim?: (requestId: string, token: string) => Promise<void>;
};
let storeOverrides: LeadStoreOverrides | undefined;

// Test-only dependency seam; production always uses Upstash Redis.
export function __setLeadStoreForTests(overrides: LeadStoreOverrides | undefined): void {
  storeOverrides = overrides;
}

function getRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Lead storage is not configured");
  redisClient ??= new Redis({ url, token });
  return redisClient;
}

function leadKey(requestId: string): string {
  return `${LEAD_PREFIX}:${requestId}`;
}

export async function persistLead(lead: StoredLead): Promise<void> {
  if (storeOverrides?.persistLead) return storeOverrides.persistLead(lead);
  const redis = getRedis();
  const pipeline = redis.pipeline();
  pipeline.set(leadKey(lead.requestId), lead, { ex: LEAD_TTL_SECONDS });
  pipeline.zadd(PENDING_KEY, { score: lead.nextAttemptAt, member: lead.requestId });
  await pipeline.exec();
}

export async function claimLead(requestId: string, token = randomUUID()): Promise<string | null> {
  if (storeOverrides?.claimLead) {
    return await storeOverrides.claimLead(requestId, token) ? token : null;
  }
  const claimed = await getRedis().set(`${CLAIM_PREFIX}:${requestId}`, token, { nx: true, px: CLAIM_TTL_MS });
  return claimed === "OK" ? token : null;
}

export async function releaseLeadClaim(requestId: string, token: string): Promise<void> {
  if (storeOverrides?.releaseLeadClaim) return storeOverrides.releaseLeadClaim(requestId, token);
  // Compare-and-delete so an expired lease cannot delete a newer worker's claim.
  await getRedis().eval(
    "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
    [`${CLAIM_PREFIX}:${requestId}`],
    [token]
  );
}

export async function getLead(requestId: string): Promise<StoredLead | null> {
  if (storeOverrides?.getLead) return storeOverrides.getLead(requestId);
  return await getRedis().get<StoredLead>(leadKey(requestId));
}

export async function getDuePendingLeads(limit = 25): Promise<StoredLead[]> {
  if (storeOverrides?.getDuePendingLeads) return storeOverrides.getDuePendingLeads(limit);
  const redis = getRedis();
  const now = Date.now();
  const scanSize = Math.max(100, limit * 4);
  const dueLeads: StoredLead[] = [];
  const staleIds: string[] = [];
  let offset = 0;

  // Expired leads can leave IDs behind in the sorted-set index. Scan past them
  // instead of letting stale entries permanently starve valid pending leads.
  while (dueLeads.length < limit) {
    const ids = await redis.zrange<string[]>(PENDING_KEY, 0, now, {
      byScore: true,
      offset,
      count: scanSize
    });
    if (!ids.length) break;

    const leads = await Promise.all(ids.map((id) => getLead(id)));
    for (let index = 0; index < ids.length; index += 1) {
      const lead = leads[index];
      if (lead?.status === "pending") {
        dueLeads.push(lead);
        if (dueLeads.length >= limit) break;
      } else {
        staleIds.push(ids[index]);
      }
    }

    offset += ids.length;
    if (ids.length < scanSize) break;
  }

  if (staleIds.length) {
    const pipeline = redis.pipeline();
    for (const id of staleIds) pipeline.zrem(PENDING_KEY, id);
    await pipeline.exec();
  }

  return dueLeads;
}

export async function updateLead(lead: StoredLead): Promise<void> {
  if (storeOverrides?.updateLead) return storeOverrides.updateLead(lead);
  const redis = getRedis();
  const pipeline = redis.pipeline();
  pipeline.set(leadKey(lead.requestId), lead, { ex: LEAD_TTL_SECONDS });
  if (lead.status !== "pending") {
    pipeline.zrem(PENDING_KEY, lead.requestId);
  } else {
    pipeline.zadd(PENDING_KEY, { score: lead.nextAttemptAt, member: lead.requestId });
  }
  await pipeline.exec();
}

export function retryDelayMs(attempts: number): number {
  return Math.min(60_000, 1_000 * 2 ** Math.max(0, attempts - 1));
}
