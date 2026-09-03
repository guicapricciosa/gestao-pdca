import type { loadMeetingCreationOptions } from "@/modules/meetings/application/options";
import type { AwaitedReturn } from "@/shared/types/utility";
import { ScopePicker } from "@/ui/components/scope-picker";
import { SubmitButton } from "@/ui/components/submit-button";
import { visibility } from "@/ui/labels";

type Options = AwaitedReturn<typeof loadMeetingCreationOptions>;

const field = "mt-1.5 w-full rounded-lg border bg-white px-3 py-2 text-sm";

function nextHour() {
  const start = new Date(Date.now() + 86_400_000);
  start.setMinutes(0, 0, 0);
  return start;
}

function local(date: Date) {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return adjusted.toISOString().slice(0, 16);
}

/**
 * Creating a meeting: title, when, who, where it applies, repeat. The series
 * that powers repetition is created underneath when "Repetir" is chosen.
 */
export function MeetingForm({
  options,
  action,
  selectedSeriesId,
  contextRestaurantIds,
  contextUnitIds,
  companyWide,
}: {
  readonly options: Options;
  readonly action: (formData: FormData) => Promise<void>;
  readonly selectedSeriesId?: string | undefined;
  readonly contextRestaurantIds: readonly string[];
  readonly contextUnitIds: readonly string[];
  readonly companyWide: boolean;
}) {
  const start = nextHour();
  const end = new Date(start.getTime() + 3_600_000);
  const selectedSeries = options.series.find(
    (series) => series.id === selectedSeriesId,
  );
  return (
    <form
      action={action}
      className="grid gap-5 rounded-2xl border bg-white p-6 shadow-sm"
    >
      {options.companies[0] && (
        <input type="hidden" name="companyId" value={options.companies[0].id} />
      )}
      <label className="block text-sm font-medium">
        Assunto da reunião <span className="text-accent">*</span>
        <input
          className={field}
          name="title"
          minLength={2}
          maxLength={240}
          required
          defaultValue={selectedSeries ? `${selectedSeries.title} · ` : ""}
          placeholder="Ex.: Reunião de operações"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Início
          <input
            className={field}
            type="datetime-local"
            name="scheduledStartAt"
            defaultValue={local(start)}
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Fim
          <input
            className={field}
            type="datetime-local"
            name="scheduledEndAt"
            defaultValue={local(end)}
            required
          />
        </label>
      </div>
      <fieldset>
        <legend className="text-sm font-medium">Quem participa</legend>
        <p className="text-muted-foreground mt-1 text-xs">
          Só aparecem pessoas com acesso ao âmbito escolhido. Participar não dá
          acesso a nada.
        </p>
        <div className="mt-2 grid gap-1 sm:grid-cols-2">
          {options.profiles
            .filter((profile) => profile.id !== options.currentProfileId)
            .map((profile) => (
              <label className="flex gap-2 text-sm" key={profile.id}>
                <input
                  type="checkbox"
                  name="participantIds"
                  value={profile.id}
                />
                {profile.display_name}
              </label>
            ))}
        </div>
      </fieldset>
      <ScopePicker
        restaurants={options.restaurants}
        contextIds={contextRestaurantIds}
        contextLabel="que cobres"
        companyWide={companyWide}
      />
      {selectedSeries ? (
        <input type="hidden" name="meetingSeriesId" value={selectedSeries.id} />
      ) : (
        <label className="block text-sm font-medium">
          Repetir
          <select className={field} name="repeat" defaultValue="NONE">
            <option value="NONE">Não</option>
            <option value="WEEKLY">Semanalmente</option>
            <option value="BIWEEKLY">Quinzenalmente</option>
            <option value="MONTHLY">Mensalmente</option>
          </select>
          <span className="text-muted-foreground mt-1 block text-xs font-normal">
            As próximas reuniões marcam-se uma a uma e herdam agenda pendente,
            pessoas e âmbito.
          </span>
        </label>
      )}
      <details className="rounded-lg border bg-white/60 p-4">
        <summary className="cursor-pointer text-sm font-medium">
          Opções avançadas
        </summary>
        <div className="mt-4 grid gap-4">
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
          <fieldset>
            <legend className="text-sm font-medium">Área</legend>
            <div className="mt-2 grid gap-1 sm:grid-cols-2">
              {options.units.map((unit) => (
                <label className="flex gap-2 text-sm" key={unit.id}>
                  <input
                    type="checkbox"
                    name="unitIds"
                    value={unit.id}
                    defaultChecked={contextUnitIds.includes(unit.id)}
                  />
                  {unit.name}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block text-sm font-medium">
            Visibilidade
            <select className={field} name="visibility" defaultValue="NORMAL">
              {Object.entries(visibility).map(([code, option]) => (
                <option key={code} value={code}>
                  {option.label} — {option.hint}
                </option>
              ))}
            </select>
          </label>
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
        <SubmitButton pendingLabel="A marcar…">Marcar reunião</SubmitButton>
      </div>
    </form>
  );
}
