import type { loadMeetingCreationOptions } from "@/modules/meetings/application/options";
import type { AwaitedReturn } from "@/shared/types/utility";
import { SubmitButton } from "@/ui/components/submit-button";
import { ScopeFields, VisibilityField } from "@/ui/patterns/scope-fields";

type Options = AwaitedReturn<typeof loadMeetingCreationOptions>;

const field = "mt-2 w-full rounded-lg border bg-white px-3 py-2 text-sm";
const initialStart = new Date(Date.now() + 86_400_000);
initialStart.setMinutes(0, 0, 0);
const initialEnd = new Date(initialStart.getTime() + 3_600_000);

const meetingTypes = [
  ["OPERATIONS", "Operações"],
  ["MANAGEMENT", "Direção"],
  ["SUPPORT", "Departamento de suporte"],
  ["ONE_TO_ONE", "One-to-one"],
  ["AD_HOC", "Ad-hoc"],
] as const;

function Section({
  title,
  hint,
  children,
}: {
  readonly title: string;
  readonly hint?: string | undefined;
  readonly children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4 border-t pt-6 first:border-t-0 first:pt-0">
      <div>
        <h2 className="text-sm font-semibold tracking-[0.08em] uppercase">
          {title}
        </h2>
        {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function MeetingForm({
  kind,
  options,
  action,
  selectedSeriesId,
}: {
  readonly kind: "Series" | "Session";
  readonly options: Options;
  readonly action: (formData: FormData) => Promise<void>;
  readonly selectedSeriesId?: string | undefined;
}) {
  const local = (date: Date) => {
    const adjusted = new Date(
      date.getTime() - date.getTimezoneOffset() * 60_000,
    );
    return adjusted.toISOString().slice(0, 16);
  };
  const scopeOptions = {
    companies: options.companies,
    units: options.units,
    restaurants: options.restaurants,
  };
  return (
    <form
      action={action}
      className="grid gap-6 rounded-2xl border bg-white p-6 shadow-sm"
    >
      <Section
        title={kind === "Series" ? "A série" : "A sessão"}
        hint={
          kind === "Series"
            ? "Uma série guarda o propósito, o Chair habitual e o âmbito por omissão das sessões."
            : "Cada sessão tem a sua agenda, participantes e publicação."
        }
      >
        <label className="text-sm font-medium">
          Título
          <input
            className={field}
            name="title"
            minLength={2}
            maxLength={240}
            required
            placeholder={
              kind === "Series"
                ? "Ex.: Weekly Operations"
                : "Ex.: Weekly Operations · 8 de Setembro"
            }
          />
        </label>
        <label className="text-sm font-medium">
          Descrição
          <textarea className={field} name="description" maxLength={20000} />
        </label>
        {kind === "Series" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Tipo de reunião
              <select className={field} name="meetingType">
                {meetingTypes.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Chair por omissão
              <select
                className={field}
                name="defaultChairProfileId"
                defaultValue={options.currentProfileId ?? ""}
              >
                <option value="">Sem Chair por omissão</option>
                {options.profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.display_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium sm:col-span-2">
              Recorrência
              <input
                className={field}
                name="recurrenceRule"
                placeholder="Ex.: semanal, segunda-feira às 10:00"
                maxLength={500}
              />
              <span className="text-muted-foreground mt-1 block text-xs font-normal">
                Texto livre para as pessoas; as sessões continuam a ser criadas
                uma a uma.
              </span>
            </label>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Série
              <select
                className={field}
                name="meetingSeriesId"
                defaultValue={selectedSeriesId ?? ""}
              >
                <option value="">Reunião ad-hoc (sem série)</option>
                {options.series.map((series) => (
                  <option key={series.id} value={series.id}>
                    {series.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Chair
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
            <label className="text-sm font-medium">
              Início
              <input
                className={field}
                type="datetime-local"
                name="scheduledStartAt"
                defaultValue={local(initialStart)}
                required
              />
            </label>
            <label className="text-sm font-medium">
              Fim
              <input
                className={field}
                type="datetime-local"
                name="scheduledEndAt"
                defaultValue={local(initialEnd)}
                required
              />
            </label>
          </div>
        )}
      </Section>
      <Section
        title="Quem pode ver"
        hint="Participar ou ser Chair não dá acesso: o âmbito é que decide. Só aparecem departamentos, serviços e restaurantes que cobres."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Empresa
            <select className={field} name="companyId" required>
              {options.companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
          <VisibilityField />
        </div>
        <ScopeFields options={scopeOptions} />
      </Section>
      <div>
        <SubmitButton pendingLabel="A criar…">
          Criar {kind === "Series" ? "série" : "sessão"}
        </SubmitButton>
      </div>
    </form>
  );
}
