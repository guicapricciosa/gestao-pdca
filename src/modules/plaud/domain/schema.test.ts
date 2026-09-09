import { describe, expect, it } from "vitest";

import { importKey, parsePlaudPayload, planImport } from "./schema";

const sample = JSON.stringify({
  source: {
    provider: "plaud",
    recording_id: "REC-1",
    recording_title: "Reunião diária",
    recorded_at: "2026-08-27",
  },
  actions: [
    {
      title: "Investigar falha nas reservas de grupo",
      description: "Reservas com mais de 15 pessoas avançam sem menu.",
      phase: "Plan",
      priority: "high",
      due_date: "2026-09-01",
      status_note: "Por validar com operações",
      tasks: ["Reproduzir o erro", { title: "Corrigir" }],
    },
    { title: "Fechar tema dos servidores", phase: "Done" },
  ],
});

describe("Plaud import", () => {
  it("parses the payload of the previous app", () => {
    const payload = parsePlaudPayload(sample);
    expect(payload.actions).toHaveLength(2);
  });

  it("explains what is wrong", () => {
    expect(() => parsePlaudPayload("{")).toThrow("JSON");
    expect(() => parsePlaudPayload('{"actions":[]}')).toThrow("actions");
    expect(() =>
      parsePlaudPayload('{"actions":[{"title":"xx","due_date":"01/09/2026"}]}'),
    ).toThrow("AAAA-MM-DD");
  });

  it("plans PDCAs with subtasks, phases, priorities and a stable key", () => {
    const [first, second] = planImport(parsePlaudPayload(sample));
    expect(first!.key).toBe(
      "plaud:REC-1:investigar-falha-nas-reservas-de-grupo",
    );
    expect(first!.phase).toBe("PLAN");
    expect(first!.priority).toBe("HIGH");
    expect(first!.objective).toBe("Por validar com operações");
    expect(first!.tasks).toEqual(["Reproduzir o erro", "Corrigir"]);
    expect(first!.problem).toContain("Origem: gravação Plaud · Reunião diária");
    expect(first!.problem).toContain(first!.key);
    expect(second!.phase).toBe("ACT");
    expect(second!.done).toBe(true);
  });

  it("keys ignore accents and case", () => {
    const source = {
      recording_id: "R",
      recording_title: null,
      recorded_at: null,
    };
    expect(importKey(source, { title: "Ação Ímpar!" })).toBe(
      "plaud:R:acao-impar",
    );
  });

  it("requires a recording for every action", () => {
    expect(() =>
      planImport(parsePlaudPayload('{"actions":[{"title":"sem origem"}]}')),
    ).toThrow("gravação");
  });
});
