import { saveNotificationPreferencesAction } from "@/app/actions/notifications";
import { SubmitButton } from "@/ui/components/submit-button";

export interface PreferencesView {
  readonly tasks: boolean;
  readonly pdcas: boolean;
  readonly collaboration: boolean;
  readonly meeting_participation: boolean;
  readonly meeting_changes: boolean;
  readonly meeting_reminders: boolean;
  readonly deadline_days: number;
  readonly push_enabled: boolean;
}

function Toggle({
  name,
  label,
  checked,
}: {
  readonly name: string;
  readonly label: string;
  readonly checked: boolean;
}) {
  return (
    <label className="flex items-center gap-3 text-sm">
      <input type="checkbox" name={name} defaultChecked={checked} />
      {label}
    </label>
  );
}

/** Few, meaningful choices. Anything not listed here is not configurable. */
export function NotificationPreferences({
  preferences,
  push,
}: {
  readonly preferences: PreferencesView;
  readonly push?: React.ReactNode;
}) {
  return (
    <form
      action={saveNotificationPreferencesAction}
      className="space-y-5 rounded-2xl border bg-white p-5"
      data-testid="notification-preferences"
    >
      <h2 className="font-semibold">Notificações</h2>
      <fieldset className="space-y-2">
        <legend className="text-muted-foreground mb-2 text-xs font-semibold tracking-[0.08em] uppercase">
          Trabalho
        </legend>
        <Toggle
          name="tasks"
          label="Tarefas atribuídas e alterações relevantes"
          checked={preferences.tasks}
        />
        <Toggle
          name="pdcas"
          label="PDCAs atribuídos e alterações relevantes"
          checked={preferences.pdcas}
        />
        <Toggle
          name="collaboration"
          label="Comentários e menções"
          checked={preferences.collaboration}
        />
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-muted-foreground mb-2 text-xs font-semibold tracking-[0.08em] uppercase">
          Reuniões
        </legend>
        <Toggle
          name="meetingParticipation"
          label="Participação e convites"
          checked={preferences.meeting_participation}
        />
        <Toggle
          name="meetingChanges"
          label="Alterações relevantes"
          checked={preferences.meeting_changes}
        />
        <Toggle
          name="meetingReminders"
          label="Lembretes"
          checked={preferences.meeting_reminders}
        />
      </fieldset>
      <fieldset>
        <legend className="text-muted-foreground mb-2 text-xs font-semibold tracking-[0.08em] uppercase">
          Prazos
        </legend>
        <label className="block text-sm">
          Avisar
          <select
            className="mt-1.5 block rounded-lg border bg-white px-3 py-2 text-sm"
            name="deadlineDays"
            defaultValue={String(preferences.deadline_days)}
          >
            <option value="1">1 dia antes</option>
            <option value="2">2 dias antes</option>
            <option value="0">Não avisar</option>
          </select>
        </label>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-muted-foreground mb-2 text-xs font-semibold tracking-[0.08em] uppercase">
          Push
        </legend>
        <Toggle
          name="pushEnabled"
          label="Receber notificações push"
          checked={preferences.push_enabled}
        />
        {push}
      </fieldset>
      <div>
        <SubmitButton pendingLabel="A guardar…">
          Guardar preferências
        </SubmitButton>
      </div>
    </form>
  );
}
