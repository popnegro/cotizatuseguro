import { Redis } from "@upstash/redis";

const LEAD_TTL_SECONDS = 30 * 24 * 60 * 60;
const LEAD_PREFIX = "cotizatuseguro:lead";
const PENDING_KEY = "cotizatuseguro:leads:pending";

export type LeadStatus = "pending" | "sent";

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
};

let redisClient: Redis | undefined;
type LeadStoreOverrides = {
  persistLead?: (lead: StoredLead) => Promise<void>;
  getLead?: (requestId: string) => Promise<StoredLead | null>;
  getDuePendingLeads?: (limit?: number) => Promise<StoredLead[]>;
  updateLead?: (lead: StoredLead) => Promise<void>;
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

export async function getLead(requestId: string): Promise<StoredLead | null> {
  if (storeOverrides?.getLead) return storeOverrides.getLead(requestId);
  return await getRedis().get<StoredLead>(leadKey(requestId));
}

export async function getDuePendingLeads(limit = 25): Promise<StoredLead[]> {
  if (storeOverrides?.getDuePendingLeads) return storeOverrides.getDuePendingLeads(limit);
  const redis = getRedis();
  const ids = await redis.zrange<string[]>(PENDING_KEY, 0, Date.now(), {
    byScore: true,
    offset: 0,
    count: limit
  });
  if (!ids.length) return [];
  const leads = await Promise.all(ids.map((id) => getLead(id)));
  return leads.filter((lead): lead is StoredLead => lead !== null && lead.status === "pending");
}

export async function updateLead(lead: StoredLead): Promise<void> {
  if (storeOverrides?.updateLead) return storeOverrides.updateLead(lead);
  const redis = getRedis();
  const pipeline = redis.pipeline();
  pipeline.set(leadKey(lead.requestId), lead, { ex: LEAD_TTL_SECONDS });
  if (lead.status === "sent" || lead.nextAttemptAt === Number.MAX_SAFE_INTEGER) {
    pipeline.zrem(PENDING_KEY, lead.requestId);
  } else {
    pipeline.zadd(PENDING_KEY, { score: lead.nextAttemptAt, member: lead.requestId });
  }
  await pipeline.exec();
}

export function retryDelayMs(attempts: number): number {
  return Math.min(60_000, 1_000 * 2 ** Math.max(0, attempts - 1));
}
