import { describe, expect, it } from "vitest";

import {
  decideDelivery,
  deliverPendingPush,
  fakePushProvider,
  messageFor,
  type ClaimedDelivery,
} from "./push";

const claimed = (over: Partial<ClaimedDelivery> = {}): ClaimedDelivery => ({
  delivery_id: "d1",
  subscription_id: "s1",
  endpoint: "https://push.example/ok/1",
  p256dh: "k",
  auth: "a",
  notification_id: "n1",
  type: "task.assigned",
  title: "Rever proposta de servidores",
  metadata: { due_date: "2026-09-10" },
  href: "/tasks/t1",
  sensitive: false,
  attempt_count: 1,
  read_at: null,
  ...over,
});

describe("push delivery policy", () => {
  it("retries transient failures with backoff and gives up after three attempts", () => {
    const transient = {
      ok: false as const,
      gone: false,
      retryable: true,
      status: 503,
      error: "x",
    };
    expect(decideDelivery(transient, 1)).toMatchObject({
      status: "failed",
      retryInSeconds: 60,
    });
    expect(decideDelivery(transient, 2)).toMatchObject({ retryInSeconds: 120 });
    expect(decideDelivery(transient, 3)).toMatchObject({
      retryInSeconds: null,
    });
  });
  it("marks gone subscriptions for cleanup and never retries rejections", () => {
    expect(
      decideDelivery(
        { ok: false, gone: true, retryable: false, status: 410, error: "gone" },
        1,
      ),
    ).toMatchObject({
      subscriptionGone: true,
      retryInSeconds: null,
    });
    expect(
      decideDelivery(
        { ok: false, gone: false, retryable: false, status: 400, error: "bad" },
        1,
      ),
    ).toMatchObject({
      subscriptionGone: false,
      retryInSeconds: null,
    });
    expect(decideDelivery({ ok: true, status: 201 }, 1)).toMatchObject({
      status: "sent",
    });
  });
  it("builds a normal message with the title and a generic one for reserved subjects", () => {
    expect(messageFor(claimed())).toMatchObject({
      title: "Nova tarefa atribuída",
      body: "Rever proposta de servidores · Prazo: 10/09/2026",
      href: "/tasks/t1",
      tag: "notification:n1",
    });
    const reserved = messageFor(
      claimed({
        sensitive: true,
        title: "Avaliação da Ana",
        metadata: { actor: "CEO" },
      }),
    );
    expect(reserved.title).toBe("Assunto reservado");
    expect(reserved.body).not.toContain("Ana");
    expect(reserved.body).not.toContain("CEO");
  });
  it("delivers through the provider and records each outcome", async () => {
    const calls: [string, unknown][] = [];
    const client = {
      rpc: (fn: string, args: unknown) => {
        calls.push([fn, args]);
        if (fn === "claim_push_deliveries")
          return Promise.resolve({
            data: [
              claimed(),
              claimed({
                delivery_id: "d2",
                endpoint: "https://push.example/gone/2",
              }),
              claimed({ delivery_id: "d3", read_at: "2026-09-03T10:00:00Z" }),
            ],
            error: null,
          });
        return Promise.resolve({ data: null, error: null });
      },
    };
    const totals = await deliverPendingPush(
      client as never,
      fakePushProvider(undefined),
      10,
    );
    expect(totals).toEqual({ sent: 1, failed: 1, skipped: 1 });
    const completions = calls
      .filter(([fn]) => fn === "complete_push_delivery")
      .map(([, args]) => args);
    expect(completions).toContainEqual(
      expect.objectContaining({
        p_delivery_id: "d2",
        p_subscription_gone: true,
      }),
    );
    expect(completions).toContainEqual(
      expect.objectContaining({ p_delivery_id: "d3", p_status: "skipped" }),
    );
  });
  it("skips everything when no provider is configured", async () => {
    const client = {
      rpc: (fn: string) =>
        Promise.resolve(
          fn === "claim_push_deliveries"
            ? { data: [claimed()], error: null }
            : { data: null, error: null },
        ),
    };
    expect(await deliverPendingPush(client as never, null)).toEqual({
      sent: 0,
      failed: 0,
      skipped: 1,
    });
  });
});
