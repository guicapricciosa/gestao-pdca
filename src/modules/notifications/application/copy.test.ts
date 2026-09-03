import { describe, expect, it } from "vitest";

import {
  notificationAction,
  notificationContext,
  notificationLabel,
  pushPayloadFor,
  type NotificationView,
} from "./copy";

const base: NotificationView = {
  id: "n1",
  type: "task.assigned",
  category: "tasks",
  title: "Rever proposta de servidores",
  metadata: { due_date: "2026-09-10", actor: "CEO" },
  target_kind: "TASK",
  href: "/tasks/abc",
  sensitive: false,
  created_at: "2026-09-03T10:00:00Z",
  read_at: null,
};

describe("notification copy", () => {
  it("labels known types in PT-PT and falls back gracefully", () => {
    expect(notificationLabel("task.assigned")).toBe("Nova tarefa atribuída");
    expect(notificationLabel("meeting.invited")).toBe(
      "Foste adicionado a uma reunião",
    );
    expect(notificationLabel("weird.type")).toBe("Actualização");
  });
  it("builds a short context line from minimal metadata", () => {
    expect(notificationContext(base)).toBe("Prazo: 10/09/2026 · por CEO");
    expect(notificationAction(base)).toBe("Abrir tarefa");
    expect(
      notificationAction({
        ...base,
        target_kind: "MEETING",
        href: "/meetings/x/run",
      }),
    ).toBe("Abrir reunião");
  });
  it("keeps pushes generic for reserved subjects", () => {
    expect(pushPayloadFor(base)).toEqual({
      title: "Nova tarefa atribuída",
      body: "Rever proposta de servidores · Prazo: 10/09/2026 · por CEO",
      href: "/tasks/abc",
    });
    const reserved = pushPayloadFor({
      ...base,
      sensitive: true,
      title: "Processo disciplinar João",
    });
    expect(reserved.title).toBe("Assunto reservado");
    expect(reserved.body).not.toContain("João");
    expect(reserved.href).toBe("/tasks/abc");
  });
});
