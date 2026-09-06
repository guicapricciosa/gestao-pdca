"use client";

import { useState } from "react";

import type { loadMeetingCreationOptions } from "@/modules/meetings/application/options";
import type { AwaitedReturn } from "@/shared/types/utility";
import { RecurrencePicker } from "@/ui/components/recurrence-picker";
import { ScopePicker } from "@/ui/components/scope-picker";
import { SubmitButton } from "@/ui/components/submit-button";
import { visibility } from "@/ui/labels";

type Options = AwaitedReturn<typeof loadMeetingCreationOptions>;
type Template = Options["templates"][number];

const field = "mt-1.5 w-full rounded-lg border bg-white px-3 py-2 text-sm";

/** 00 · 10 · 20 · 30 · 40 · 50, all day. */
const timeOptions = Array.from({ length: 24 * 6 }, (_, index) => {
  const hours = String(Math.floor(index / 6)).padStart(2, "0");
  const minutes = String((index % 6) * 10).padStart(2, "0");
  return `${hours}:${minutes}`;
});

function roundToTen(date: Date) {
  const next = new Date(date);
  next.setSeconds(0, 0);
  next.setMinutes(Math.ceil(next.getMinutes() / 10) * 10);
  return next;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function dateInput(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function timeInput(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = ((h ?? 0) * 60 + (m ?? 0) + minutes) % (24 * 60);
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

function subjectFor(template: Template | null, date: string) {
  if (!template) return "";
  const when = new Date(`${date}T00:00:00`).toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "long",
  });
  return `${template.name} · ${when}`;
}

/**
 * Marcar reunião. A template pre-fills subject, duration, people, scope,
 * agenda, repetition and visibility; everything stays editable. Times move in
 * 10-minute steps and the end follows the start (+ duration) until changed.
 */
export function MeetingForm({
  options,
  action,
  selectedSeriesId,
  contextRestaurantIds,
  contextUnitIds,
  companyWide,
  initialStart,
}: {
  readonly options: Options;
  readonly action: (formData: FormData) => Promise<void>;
  readonly selectedSeriesId?: string | undefined;
  readonly contextRestaurantIds: readonly string[];
  readonly contextUnitIds: readonly string[];
  readonly companyWide: boolean;
  /** ISO datetime suggested by a series ("Marcar próxima reunião"). */
  readonly initialStart?: string | undefined;
}) {
  const selectedSeries = options.series.find(
    (series) => series.id === selectedSeriesId,
  );
  const [suggested] = useState(() => {
    if (initialStart) return new Date(initialStart);
    const tomorrow = new Date(Date.now() + 86_400_000);
    tomorrow.setHours(10, 0, 0, 0);
    return roundToTen(tomorrow);
  });

  const [templateId, setTemplateId] = useState("");
  const template =
    options.templates.find((item) => item.id === templateId) ?? null;
  const [date, setDate] = useState(dateInput(suggested));
  const [startTime, setStartTime] = useState(timeInput(suggested));
  const [endTime, setEndTime] = useState(addMinutes(timeInput(suggested), 60));
  const [endTouched, setEndTouched] = useState(false);
  const [title, setTitle] = useState(
    selectedSeries ? `${selectedSeries.title} · ` : "",
  );
  const [titleTouched, setTitleTouched] = useState(false);
  const [participants, setParticipants] = useState<readonly string[]>([]);
  const eligible = options.profiles.filter(
    (profile) => profile.id !== options.currentProfileId,
  );
  const [units, setUnits] = useState<readonly string[]>(contextUnitIds);
  const [visibilityValue, setVisibilityValue] = useState("NORMAL");

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const next = options.templates.find((item) => item.id === id) ?? null;
    if (!next) return;
    if (!endTouched) setEndTime(addMinutes(startTime, next.durationMinutes));
    if (!titleTouched) setTitle(subjectFor(next, date));
    setParticipants(
      next.participantIds.filter((pid) => pid !== options.currentProfileId),
    );
    if (next.unitIds.length > 0) setUnits(next.unitIds);
    setVisibilityValue(next.visibility);
  };

  const changeStart = (value: string) => {
    setStartTime(value);
    if (!endTouched)
      setEndTime(addMinutes(value, template?.durationMinutes ?? 60));
  };
  const changeDate = (value: string) => {
    setDate(value);
    if (!titleTouched && template) setTitle(subjectFor(template, value));
  };

  const startIso = new Date(`${date}T${startTime}:00`).toISOString();
  const endIso = new Date(`${date}T${endTime}:00`).toISOString();
  const endBeforeStart = endIso <= startIso;
  const scopeSelection = template
    ? template.allRestaurants
      ? ({ kind: "all" } as const)
      : template.restaurantIds.length > 0
        ? ({ kind: "ids", ids: template.restaurantIds } as const)
        : undefined
    : undefined;

  return (
    <form
      action={action}
      className="grid gap-5 rounded-2xl border bg-white p-6 shadow-sm"
      data-testid="meeting-form"
    >
      {options.companies[0] && (
        <input type="hidden" name="companyId" value={options.companies[0].id} />
      )}
      <input type="hidden" name="scheduledStartAt" value={startIso} />
      <input type="hidden" name="scheduledEndAt" value={endIso} />
      {template && (
        <input type="hidden" name="templateId" value={template.id} />
      )}
      {template && template.agenda.length > 0 && (
        <input
          type="hidden"
          name="agendaItems"
          value={template.agenda.join("\n")}
        />
      )}

      {options.templates.length > 0 && !selectedSeries && (
        <label className="block text-sm font-medium">
          Modelo da reunião
          <select
            className={field}
            name="template"
            value={templateId}
            onChange={(event) => applyTemplate(event.target.value)}
          >
            <option value="">Sem modelo</option>
            {options.templates.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <span className="text-muted-foreground mt-1 block text-xs font-normal">
            O modelo preenche assunto, duração, pessoas, âmbito, agenda e
            repetição. Podes alterar tudo aqui.
          </span>
        </label>
      )}

      <label className="block text-sm font-medium">
        Assunto <span className="text-accent">*</span>
        <input
          className={field}
          name="title"
          minLength={2}
          maxLength={240}
          required
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setTitleTouched(true);
          }}
          placeholder="Ex.: Reunião de operações"
        />
      </label>

      <fieldset>
        <legend className="text-sm font-medium">Quando</legend>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <input
            aria-label="Data"
            className="rounded-lg border bg-white px-3 py-2 text-sm"
            type="date"
            name="date"
            value={date}
            onChange={(event) => changeDate(event.target.value)}
            required
          />
          <select
            aria-label="Início"
            className="rounded-lg border bg-white px-3 py-2 text-sm"
            name="startTime"
            value={startTime}
            onChange={(event) => changeStart(event.target.value)}
          >
            {timeOptions.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
          <span aria-hidden>→</span>
          <select
            aria-label="Fim"
            className="rounded-lg border bg-white px-3 py-2 text-sm"
            name="endTime"
            value={endTime}
            onChange={(event) => {
              setEndTime(event.target.value);
              setEndTouched(true);
            }}
          >
            {timeOptions.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>
        {endBeforeStart && (
          <p className="mt-1 text-xs text-red-700">
            O fim tem de ser depois do início.
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">Quem participa</legend>
        <p className="text-muted-foreground mt-1 text-xs">
          Só aparecem pessoas com acesso ao âmbito escolhido. Participar não dá
          acesso a nada.
        </p>
        <label className="mt-2 flex gap-2 text-sm font-medium">
          <input
            aria-label="Todos"
            checked={
              eligible.length > 0 &&
              eligible.every((profile) => participants.includes(profile.id))
            }
            data-testid="participants-all"
            onChange={(event) =>
              setParticipants(
                event.target.checked ? eligible.map((p) => p.id) : [],
              )
            }
            type="checkbox"
          />
          Todos ({eligible.length})
        </label>
        <div className="mt-2 grid gap-1 sm:grid-cols-2">
          {eligible.map((profile) => (
            <label className="flex gap-2 text-sm" key={profile.id}>
              <input
                type="checkbox"
                name="participantIds"
                value={profile.id}
                checked={participants.includes(profile.id)}
                onChange={(event) =>
                  setParticipants((current) =>
                    event.target.checked
                      ? [...current, profile.id]
                      : current.filter((id) => id !== profile.id),
                  )
                }
              />
              {profile.display_name}
            </label>
          ))}
        </div>
      </fieldset>

      <ScopePicker
        key={`scope-${templateId}`}
        restaurants={options.restaurants}
        contextIds={contextRestaurantIds}
        contextLabel="que cobres"
        companyWide={companyWide}
        initialSelection={scopeSelection}
      />

      {selectedSeries ? (
        <input type="hidden" name="meetingSeriesId" value={selectedSeries.id} />
      ) : (
        <RecurrencePicker
          start={`${date}T${startTime}:00`}
          initial={template?.recurrence}
        />
      )}

      <details className="rounded-lg border bg-white/60 p-4">
        <summary className="cursor-pointer text-sm font-medium">
          Opções avançadas
        </summary>
        <div className="mt-4 grid gap-4">
          <label className="block text-sm font-medium">
            Visibilidade
            <select
              className={field}
              name="visibility"
              value={visibilityValue}
              onChange={(event) => setVisibilityValue(event.target.value)}
            >
              {Object.entries(visibility).map(([code, option]) => (
                <option key={code} value={code}>
                  {option.label} — {option.hint}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend className="text-sm font-medium">Área</legend>
            <div className="mt-2 grid gap-1 sm:grid-cols-2">
              {options.units.map((unit) => (
                <label className="flex gap-2 text-sm" key={unit.id}>
                  <input
                    type="checkbox"
                    name="unitIds"
                    value={unit.id}
                    checked={units.includes(unit.id)}
                    onChange={(event) =>
                      setUnits((current) =>
                        event.target.checked
                          ? [...current, unit.id]
                          : current.filter((id) => id !== unit.id),
                      )
                    }
                  />
                  {unit.name}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block text-sm font-medium">
            Chair (quem conduz)
            <select
              className={field}
              name="chairProfileId"
              defaultValue={options.currentProfileId ?? ""}
              required
            >
              {options.profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.display_name}
                </option>
              ))}
            </select>
          </label>
          {!selectedSeries && options.series.length > 0 && (
            <label className="block text-sm font-medium">
              Faz parte de uma reunião recorrente existente
              <select className={field} name="existingSeriesId" defaultValue="">
                <option value="">Não</option>
                {options.series.map((series) => (
                  <option key={series.id} value={series.id}>
                    {series.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-sm font-medium">
            Descrição
            <textarea
              className={`${field} min-h-20`}
              name="description"
              maxLength={20000}
            />
          </label>
          {options.companies.length > 1 && (
            <label className="block text-sm font-medium">
              Empresa
              <select className={field} name="companyId">
                {options.companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </details>
      <div>
        <SubmitButton pendingLabel="A marcar…" disabled={endBeforeStart}>
          Marcar reunião
        </SubmitButton>
      </div>
    </form>
  );
}
