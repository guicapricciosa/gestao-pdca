import { appendFileSync } from "node:fs";

import webPush from "web-push";

import { pushPayloadFor, type NotificationView } from "./copy";

export interface PushTarget {
  readonly endpoint: string;
  readonly p256dh: string;
  readonly auth: string;
}

export interface PushMessage {
  readonly title: string;
  readonly body: string;
  readonly href: string;
  readonly tag: string;
}

export type PushOutcome =
  | { readonly ok: true; readonly status?: number | undefined }
  | {
      readonly ok: false;
      readonly gone: boolean;
      readonly retryable: boolean;
      readonly status?: number | undefined;
      readonly error: string;
    };

export interface PushProvider {
  readonly name: string;
  send(target: PushTarget, message: PushMessage): Promise<PushOutcome>;
}

/** Real Web Push through VAPID; keys come from the environment. */
export function webPushProvider(env = process.env): PushProvider {
  const publicKey = env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY ?? "";
  const privateKey = env.WEB_PUSH_PRIVATE_KEY ?? "";
  const subject = env.WEB_PUSH_SUBJECT ?? "mailto:it@example.com";
  return {
    name: "webpush",
    async send(target, message): Promise<PushOutcome> {
      if (!publicKey || !privateKey)
        return {
          ok: false,
          gone: false,
          retryable: false,
          error: "VAPID keys are not configured",
        };
      try {
        const response = await webPush.sendNotification(
          {
            endpoint: target.endpoint,
            keys: { p256dh: target.p256dh, auth: target.auth },
          },
          JSON.stringify(message),
          { vapidDetails: { subject, publicKey, privateKey }, TTL: 60 * 60 },
        );
        return { ok: true, status: response.statusCode };
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        return {
          ok: false,
          gone: status === 404 || status === 410,
          retryable: status === undefined || status === 429 || status >= 500,
          status,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}

/**
 * Deterministic provider for tests: the endpoint decides the outcome and
 * every message is appended to PUSH_LOG_FILE so tests can inspect payloads.
 */
export function fakePushProvider(
  logFile = process.env.PUSH_LOG_FILE,
): PushProvider {
  return {
    name: "fake",
    async send(target, message): Promise<PushOutcome> {
      if (logFile)
        appendFileSync(
          logFile,
          `${JSON.stringify({ endpoint: target.endpoint, ...message, at: new Date().toISOString() })}\n`,
        );
      if (target.endpoint.includes("/gone/"))
        return {
          ok: false,
          gone: true,
          retryable: false,
          status: 410,
          error: "gone",
        };
      if (target.endpoint.includes("/flaky/"))
        return {
          ok: false,
          gone: false,
          retryable: true,
          status: 503,
          error: "service unavailable",
        };
      if (target.endpoint.includes("/reject/"))
        return {
          ok: false,
          gone: false,
          retryable: false,
          status: 400,
          error: "bad request",
        };
      return { ok: true, status: 201 };
    },
  };
}

export function selectPushProvider(env = process.env): PushProvider | null {
  switch (env.PUSH_PROVIDER) {
    case "fake":
      return fakePushProvider(env.PUSH_LOG_FILE);
    case "webpush":
      return webPushProvider(env);
    default:
      return null;
  }
}

export interface ClaimedDelivery {
  readonly delivery_id: string;
  readonly subscription_id: string;
  readonly endpoint: string;
  readonly p256dh: string;
  readonly auth: string;
  readonly notification_id: string;
  readonly type: string;
  readonly title: string;
  readonly metadata: unknown;
  readonly href: string;
  readonly sensitive: boolean;
  readonly attempt_count: number;
  readonly read_at: string | null;
}

export interface DeliveryDecision {
  readonly status: "sent" | "failed" | "skipped";
  readonly retryInSeconds: number | null;
  readonly subscriptionGone: boolean;
  readonly error: string | null;
  readonly providerStatus: number | null;
}

const maxAttempts = 3;

/** Pure retry policy: what to record after one attempt. */
export function decideDelivery(
  outcome: PushOutcome,
  attemptCount: number,
): DeliveryDecision {
  if (outcome.ok)
    return {
      status: "sent",
      retryInSeconds: null,
      subscriptionGone: false,
      error: null,
      providerStatus: outcome.status ?? null,
    };
  const retry = outcome.retryable && attemptCount < maxAttempts;
  return {
    status: "failed",
    retryInSeconds: retry ? 60 * 2 ** (attemptCount - 1) : null,
    subscriptionGone: outcome.gone,
    error: outcome.error,
    providerStatus: outcome.status ?? null,
  };
}

export function messageFor(delivery: ClaimedDelivery): PushMessage {
  const view: NotificationView = {
    id: delivery.notification_id,
    type: delivery.type,
    category: "",
    title: delivery.title,
    metadata:
      delivery.metadata && typeof delivery.metadata === "object"
        ? (delivery.metadata as Record<string, unknown>)
        : {},
    target_kind: "",
    href: delivery.href,
    sensitive: delivery.sensitive,
    created_at: "",
    read_at: delivery.read_at,
  };
  const payload = pushPayloadFor(view);
  return { ...payload, tag: `notification:${delivery.notification_id}` };
}

interface DeliveryClient {
  rpc(
    fn: "claim_push_deliveries",
    args: { p_limit: number },
  ): PromiseLike<{
    data: ClaimedDelivery[] | null;
    error: { message: string } | null;
  }>;
  rpc(
    fn: "complete_push_delivery",
    args: {
      p_delivery_id: string;
      p_status: string;
      p_error?: string | null;
      p_provider_status?: number | null;
      p_retry_in_seconds?: number | null;
      p_subscription_gone?: boolean;
    },
  ): PromiseLike<{ error: { message: string } | null }>;
}

/** Sends every pending delivery once; the database keeps the state. */
export async function deliverPendingPush(
  client: DeliveryClient,
  provider: PushProvider | null,
  limit = 100,
): Promise<{ sent: number; failed: number; skipped: number }> {
  const totals = { sent: 0, failed: 0, skipped: 0 };
  const { data, error } = await client.rpc("claim_push_deliveries", {
    p_limit: limit,
  });
  if (error) throw new Error(error.message);
  for (const delivery of data ?? []) {
    if (provider === null) {
      await client.rpc("complete_push_delivery", {
        p_delivery_id: delivery.delivery_id,
        p_status: "skipped",
        p_error: "push provider disabled",
      });
      totals.skipped += 1;
      continue;
    }
    if (delivery.read_at !== null) {
      // Already read in the app: a push would only be noise.
      await client.rpc("complete_push_delivery", {
        p_delivery_id: delivery.delivery_id,
        p_status: "skipped",
        p_error: "already read",
      });
      totals.skipped += 1;
      continue;
    }
    const outcome = await provider.send(
      {
        endpoint: delivery.endpoint,
        p256dh: delivery.p256dh,
        auth: delivery.auth,
      },
      messageFor(delivery),
    );
    const decision = decideDelivery(outcome, delivery.attempt_count);
    await client.rpc("complete_push_delivery", {
      p_delivery_id: delivery.delivery_id,
      p_status: decision.status,
      p_error: decision.error,
      p_provider_status: decision.providerStatus,
      p_retry_in_seconds: decision.retryInSeconds,
      p_subscription_gone: decision.subscriptionGone,
    });
    if (decision.status === "sent") totals.sent += 1;
    else totals.failed += 1;
  }
  return totals;
}
