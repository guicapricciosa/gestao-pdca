"use client";

import { useState } from "react";

import {
  parsePlaudPayload,
  planImport,
  type PlannedItem,
} from "@/modules/plaud/domain/schema";
import { SubmitButton } from "@/ui/components/submit-button";
import { phaseLabel, priorityLabel } from "@/ui/labels";

const input = "mt-1.5 w-full rounded-lg border bg-white px-3 py-2 text-sm";

/** Paste → preview (parsed in the browser) → confirm (server action). */
export function PlaudImportForm({
  action,
  companyId,
  restaurants,
  units,
}: {
  readonly action: (formData: FormData) => Promise<void>;
  readonly companyId: string;
  readonly restaurants: readonly { id: string; name: string }[];
  readonly units: readonly { id: string; name: string }[];
}) {
  const [text, setText] = useState("");
  const [items, setItems] = useState<readonly PlannedItem[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const preview = () => {
    try {
      setItems(planImport(parsePlaudPayload(text)));
      setProblem(null);
    } catch (error) {
      setItems(null);
      setProblem(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-white p-5">
        <label className="block text-sm font-medium">
          JSON da gravação
          <textarea
            className={`${input} min-h-48 font-mono text-xs`}
            data-testid="plaud-json"
            onChange={(event) => setText(event.target.value)}
            placeholder='{"source": {"recording_id": "…"}, "actions": [{"title": "…"}]}'
            spellCheck={false}
            value={text}
          />
        </label>
        {problem && (
          <p
            className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800"
            data-testid="plaud-error"
            role="alert"
          >
            {problem}
          </p>
        )}
        <div className="mt-3">
          <button
            className="rounded-full border bg-white px-4 py-2 text-sm"
            data-testid="plaud-preview"
            onClick={preview}
            type="button"
          >
            Pré-visualizar
          </button>
        </div>
      </section>

      {items && (
        <form action={action} className="space-y-5" data-testid="plaud-confirm">
          <input type="hidden" name="companyId" value={companyId} />
          <input type="hidden" name="payload" value={text} />
          <section
            className="rounded-2xl border bg-white"
            data-testid="plaud-items"
          >
            <h2 className="border-b px-5 py-3 font-semibold">
              {items.length} {items.length === 1 ? "acção" : "acções"} a
              importar
            </h2>
            <ul>
              {items.map((item) => (
                <li
                  className="border-b px-5 py-3 text-sm last:border-0"
                  key={item.key}
                >
                  <p className="font-medium">{item.title}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {phaseLabel(item.phase)}
                    {item.done ? " · concluído" : ""} ·{" "}
                    {priorityLabel(item.priority)}
                    {item.dueDate ? ` · prazo ${item.dueDate}` : " · sem prazo"}
                    {item.tasks.length > 0
                      ? ` · ${item.tasks.length} subtarefa${item.tasks.length === 1 ? "" : "s"}`
                      : ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>
          <section className="grid gap-4 rounded-2xl border bg-white p-5 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Restaurante de referência
              <select
                className={input}
                name="restaurantId"
                required
                defaultValue=""
              >
                <option value="" disabled>
                  Escolhe…
                </option>
                {restaurants.map((restaurant) => (
                  <option key={restaurant.id} value={restaurant.id}>
                    {restaurant.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Área
              <select className={input} name="unitId" defaultValue="">
                <option value="">Sem área</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-muted-foreground text-xs sm:col-span-2">
              Tudo fica privado, com Owner e Responsável tu. Podes mudar depois,
              PDCA a PDCA, em «Opções avançadas».
            </p>
            <div className="sm:col-span-2">
              <SubmitButton pendingLabel="A importar…">Importar</SubmitButton>
            </div>
          </section>
        </form>
      )}
    </div>
  );
}
