import type { AwaitedReturn } from "@/shared/types/utility";
import type { loadMeetingCreationOptions } from "@/modules/meetings/application/options";

type Options = AwaitedReturn<typeof loadMeetingCreationOptions>;

const field = "mt-2 w-full rounded-lg border bg-white px-3 py-2 text-sm";
const initialStart = new Date(Date.now() + 86_400_000);
initialStart.setMinutes(0, 0, 0);
const initialEnd = new Date(initialStart.getTime() + 3_600_000);

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
  return (
    <form
      action={action}
      className="grid gap-5 rounded-2xl border bg-white p-6"
    >
      <label className="text-sm font-medium">
        Título
        <input
          className={field}
          name="title"
          minLength={2}
          maxLength={240}
          required
        />
      </label>
      <label className="text-sm font-medium">
        Descrição
        <textarea className={field} name="description" maxLength={20000} />
      </label>
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
        <label className="text-sm font-medium">
          Visibilidade
          <select className={field} name="visibility" defaultValue="NORMAL">
            <option>NORMAL</option>
            <option>RESTRICTED</option>
            <option>PRIVATE</option>
          </select>
        </label>
      </div>
      {kind === "Series" ? (
        <>
          <label className="text-sm font-medium">
            Tipo
            <select className={field} name="meetingType">
              <option value="OPERATIONS">Operations</option>
              <option value="MANAGEMENT">Management</option>
              <option value="SUPPORT">Support</option>
              <option value="ONE_TO_ONE">One-to-one</option>
              <option value="AD_HOC">Ad-hoc</option>
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
          <label className="text-sm font-medium">
            Recorrência simples
            <input
              className={field}
              name="recurrenceRule"
              placeholder="Ex.: semanal, terça-feira às 10:00"
              maxLength={500}
            />
          </label>
        </>
      ) : (
        <>
          <label className="text-sm font-medium">
            Série
            <select
              className={field}
              name="meetingSeriesId"
              defaultValue={selectedSeriesId ?? ""}
            >
              <option value="">Reunião ad-hoc</option>
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
          <div className="grid gap-4 sm:grid-cols-2">
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
        </>
      )}
      <fieldset>
        <legend className="text-sm font-medium">
          Departamentos / serviços
        </legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {options.units.map((unit) => (
            <label className="flex gap-2 text-sm" key={unit.id}>
              <input type="checkbox" name="unitIds" value={unit.id} />
              {unit.name}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-medium">Restaurantes</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {options.restaurants.map((restaurant) => (
            <label className="flex gap-2 text-sm" key={restaurant.id}>
              <input
                type="checkbox"
                name="restaurantIds"
                value={restaurant.id}
              />
              {restaurant.name}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="text-muted-foreground text-xs">
        O scope é validado integralmente no servidor. Participar ou ser Chair
        não cria acesso.
      </p>
      <button className="w-fit rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white">
        Criar {kind === "Series" ? "série" : "sessão"}
      </button>
    </form>
  );
}
