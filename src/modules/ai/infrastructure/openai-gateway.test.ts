import { describe, expect, it, vi } from "vitest";

import { GatewayError, type GatewayRequest } from "../application/gateway";
import { OpenAiGateway } from "./openai-gateway";

const request: GatewayRequest = {
  useCase: "MEETING_SUMMARY",
  templateVersion: "v1",
  instructions: "Summarize.",
  segments: [{ id: "note:n1", role: "NOTE", text: "Escala revista." }],
  candidates: { people: [], agendaItems: [], today: "2026-09-03" },
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("OpenAiGateway", () => {
  it("sends instructions separately from untrusted segments and parses the output", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        output: [
          {
            type: "message",
            content: [
              {
                type: "output_text",
                text: JSON.stringify({
                  summary: "Resumo",
                  highlights: [],
                  openQuestions: [],
                  citations: ["note:n1"],
                }),
              },
            ],
          },
        ],
        usage: { input_tokens: 50, output_tokens: 12 },
      }),
    );
    const gateway = new OpenAiGateway({
      apiKey: "test-key",
      model: "test-model",
      timeoutMs: 1000,
      fetch: fetchMock as unknown as typeof fetch,
    });
    const result = await gateway.complete(request);
    expect(result.output).toMatchObject({ summary: "Resumo" });
    expect(result.inputTokens).toBe(50);
    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    const body = JSON.parse(String(init.body)) as {
      instructions: string;
      store: boolean;
      input: { content: { text: string }[] }[];
      text: { format: { strict: boolean; schema: { type: string } } };
    };
    expect(body.instructions).toBe("Summarize.");
    expect(body.store).toBe(false);
    expect(body.input[0]?.content[0]?.text).toContain('<segment id="note:n1"');
    expect(body.input[0]?.content[0]?.text).not.toContain("Summarize.");
    expect(body.text.format.strict).toBe(true);
    expect(body.text.format.schema.type).toBe("object");
  });

  it("classifies provider failures, refusals and malformed output", async () => {
    const failing = new OpenAiGateway({
      apiKey: "k",
      model: "m",
      timeoutMs: 1000,
      fetch: (async () => jsonResponse({ error: {} }, 500)) as typeof fetch,
    });
    await expect(failing.complete(request)).rejects.toMatchObject({
      category: "PROVIDER",
    });

    const refusing = new OpenAiGateway({
      apiKey: "k",
      model: "m",
      timeoutMs: 1000,
      fetch: (async () =>
        jsonResponse({
          output: [
            { type: "message", content: [{ type: "refusal", refusal: "no" }] },
          ],
        })) as typeof fetch,
    });
    await expect(refusing.complete(request)).rejects.toMatchObject({
      category: "PROVIDER",
    });

    const malformed = new OpenAiGateway({
      apiKey: "k",
      model: "m",
      timeoutMs: 1000,
      fetch: (async () =>
        jsonResponse({
          output: [
            {
              type: "message",
              content: [{ type: "output_text", text: "not json" }],
            },
          ],
        })) as typeof fetch,
    });
    await expect(malformed.complete(request)).rejects.toMatchObject({
      category: "SCHEMA",
    });
  });

  it("reports a timeout as a distinct failure category", async () => {
    const gateway = new OpenAiGateway({
      apiKey: "k",
      model: "m",
      timeoutMs: 10,
      fetch: ((_: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new Error("aborted")),
          );
        })) as unknown as typeof fetch,
    });
    const error = await gateway.complete(request).catch((cause) => cause);
    expect(error).toBeInstanceOf(GatewayError);
    expect((error as GatewayError).category).toBe("TIMEOUT");
  });
});
