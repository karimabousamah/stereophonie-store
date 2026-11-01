/*
 * ST_ASSISTANT_AI_DISTRIBUTED_RATE_LIMIT_V1
 *
 * Limits paid model interpretation, not ordinary shopping.
 *
 * Development without Redis uses a local safety counter.
 * Production without Redis credentials fails closed.
 *
 * Redis errors and timeouts must never authorize an AI call.
 */

import { createHmac } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const LOCAL_LIMIT = 8;
const WINDOW_MS = 60_000;

let localCalls: number[] = [];

type Limiters = {
  minute: Ratelimit;
  daily: Ratelimit;
  global: Ratelimit;
};

let sharedLimiters: Limiters | null = null;

function hasRedisCredentials(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  );
}

function reserveDevelopmentCall(): boolean {
  const now = Date.now();

  localCalls = localCalls.filter(
    (timestamp) => now - timestamp < WINDOW_MS
  );

  if (localCalls.length >= LOCAL_LIMIT) {
    return false;
  }

  localCalls.push(now);
  return true;
}

function getSharedLimiters(): Limiters {
  if (sharedLimiters) {
    return sharedLimiters;
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    enableTelemetry: false,
    signal: () => AbortSignal.timeout(1200),
  });

  const options = {
    redis,
    analytics: false,
    timeout: 1500,
    enableTelemetry: false,
  };

  sharedLimiters = {
    minute: new Ratelimit({
      ...options,
      prefix: "st:assistant:ai:minute:v1",
      limiter: Ratelimit.slidingWindow(8, "1 m"),
    }),

    daily: new Ratelimit({
      ...options,
      prefix: "st:assistant:ai:daily:v1",
      limiter: Ratelimit.fixedWindow(60, "1 d"),
    }),

    global: new Ratelimit({
      ...options,
      prefix: "st:assistant:ai:global:v1",
      limiter: Ratelimit.fixedWindow(500, "1 d"),
    }),
  };

  return sharedLimiters;
}

function visitorIdentifier(headers?: Headers): string {
  // Trust proxy-supplied IP information only on Vercel.
  // Vercel manages these forwarded headers.
  const forwarded =
    process.env.VERCEL === "1"
      ? (
          headers?.get("x-vercel-forwarded-for") ??
          headers?.get("x-forwarded-for") ??
          ""
        )
      : "";

  const ip = forwarded.split(",")[0].trim() || "unknown-client";

  // Never store the visitor's raw IP address as a Redis key.
  return createHmac(
    "sha256",
    process.env.UPSTASH_REDIS_REST_TOKEN!,
  )
    .update(ip)
    .digest("hex")
    .slice(0, 32);
}

export async function reserveAssistantAIUsage(
  headers?: Headers,
): Promise<boolean> {
  if (!hasRedisCredentials()) {
    // Production must not use process-local counters.
    return process.env.NODE_ENV === "development"
      ? reserveDevelopmentCall()
      : false;
  }

  try {
    const limits = getSharedLimiters();
    const visitor = visitorIdentifier(headers);

    const checks = [
      [limits.minute, `visitor:${visitor}`],
      [limits.daily, `visitor:${visitor}`],
      [limits.global, "all-visitors"],
    ] as const;

    // Sequential checks avoid consuming later allowances
    // when an earlier check already rejected the request.
    for (const [limiter, identifier] of checks) {
      const result = await limiter.limit(identifier);

      if (!result.success || result.reason === "timeout") {
        return false;
      }
    }

    return true;
  } catch {
    // Never fall open to a paid model call.
    return false;
  }
}
