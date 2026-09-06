import {
  deactivatePersonAction,
  updatePersonAction,
  updatePersonIdentityAction,
} from "@/app/actions/organization";
import { RecordPanel } from "@/ui/components/record-panel";
import { SubmitButton } from "@/ui/components/submit-button";
import { organizationalRoleLabel } from "@/ui/labels";

const input = "mt-1.5 w-full rounded-lg border bg-white px-3 py-2 text-sm";

export interface PersonRow {
  readonly profile_id: string | null;
  readonly auth_user_id: string | null;
  readonly display_name: string | null;
  readonly email: string | null;
  readonly assignment_id: string | null;
  readonly title: string | null;
  readonly role_id: string | null;
  readonly unit_id: string | null;
  readonly unit_scope_mode: "ASSIGNED" | "COMPANY_WIDE" | null;
  readonly restaurant_scope_mode:
    "NONE" | "ASSIGNED" | "INHERITED" | "COMPANY_WIDE" | null;
  readonly restaurant_ids: string[] | null;
  readonly reports_to_assignment_id: string | null;
}

/** Side panel to change one person's role, department, scope and manager. */
export function PersonEditPanel({
  person,
  people,
  roles,
  units,
  restaurants,
  closeHref,
  isSelf,
}: {
  readonly person: PersonRow;
  readonly people: readonly PersonRow[];
  readonly roles: readonly { id: string; code: string }[];
  readonly units: readonly {
    id: string;
    name: string;
    unit_type: string;
  }[];
  readonly restaurants: readonly { id: string; name: string }[];
  readonly closeHref: string;
  readonly isSelf: boolean;
}) {
  const chosen = new Set(person.restaurant_ids ?? []);
  return (
    <RecordPanel
      closeHref={closeHref}
      eyebrow={person.email}
      title={person.display_name ?? ""}
    >
      <form
        action={updatePersonIdentityAction}
        className="grid gap-3 rounded-2xl border bg-white p-4"
        data-testid="person-identity-form"
      >
        <p className="text-sm font-semibold">Dados da pessoa</p>
        <input type="hidden" name="profileId" value={person.profile_id ?? ""} />
        <input
          type="hidden"
          name="authUserId"
          value={person.auth_user_id ?? ""}
        />
        <input
          type="hidden"
          name="assignmentId"
          value={person.assignment_id ?? ""}
        />
        <label className="block text-sm font-medium">
          Nome
          <input
            className={input}
            defaultValue={person.display_name ?? ""}
            minLength={2}
            name="displayName"
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Email
          <input
            className={input}
            defaultValue={person.email ?? ""}
            name="email"
            required
            type="email"
          />
          <span className="text-muted-foreground mt-1 block text-xs">
            Mudar o email muda o login. A pessoa passa a entrar com o novo.
          </span>
        </label>
        <div>
          <SubmitButton variant="secondary" pendingLabel="A guardar…">
            Guardar dados
          </SubmitButton>
        </div>
      </form>
      <form
        action={updatePersonAction}
        className="grid gap-4"
        data-testid="person-edit-form"
      >
        <p className="text-sm font-semibold">Papel e âmbito</p>
        <input
          type="hidden"
          name="assignmentId"
          value={person.assignment_id ?? ""}
        />
        <label className="block text-sm font-medium">
          Papel
          <select
            className={input}
            defaultValue={person.role_id ?? ""}
            name="roleId"
            required
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {organizationalRoleLabel(role.code)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Cargo (opcional)
          <input
            className={input}
            defaultValue={person.title ?? ""}
            name="title"
          />
        </label>
        <label className="block text-sm font-medium">
          Departamento ou serviço
          <select
            className={input}
            defaultValue={person.unit_id ?? ""}
            name="unitId"
          >
            <option value="">Sem departamento</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
                {unit.unit_type === "SHARED_SERVICE"
                  ? " (serviço partilhado)"
                  : ""}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="text-sm font-medium">
          <legend>Departamentos que vê</legend>
          <div className="mt-1.5 grid gap-1.5 font-normal">
            <label className="flex items-center gap-2">
              <input
                defaultChecked={person.unit_scope_mode !== "ASSIGNED"}
                name="unitScope"
                type="radio"
                value="COMPANY_WIDE"
              />
              Todos os departamentos (operações)
            </label>
            <label className="flex items-center gap-2">
              <input
                defaultChecked={person.unit_scope_mode === "ASSIGNED"}
                name="unitScope"
                type="radio"
                value="ASSIGNED"
              />
              Só o seu departamento (funções de suporte)
            </label>
          </div>
        </fieldset>
        <fieldset className="text-sm font-medium">
          <legend>Restaurantes</legend>
          <div className="mt-1.5 grid gap-1.5 font-normal">
            {(
              [
                ["COMPANY_WIDE", "Todos os restaurantes"],
                ["ASSIGNED", "Só alguns (escolhe abaixo)"],
                ["INHERITED", "Os das pessoas que lhe reportam"],
                ["NONE", "Nenhum"],
              ] as const
            ).map(([value, label]) => (
              <label className="flex items-center gap-2" key={value}>
                <input
                  defaultChecked={person.restaurant_scope_mode === value}
                  name="restaurantScope"
                  type="radio"
                  value={value}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <p className="text-sm font-medium">Quais</p>
          <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
            {restaurants.map((restaurant) => (
              <label
                className="flex items-center gap-2 text-sm"
                key={restaurant.id}
              >
                <input
                  defaultChecked={chosen.has(restaurant.id)}
                  name="restaurantIds"
                  type="checkbox"
                  value={restaurant.id}
                />
                {restaurant.name}
              </label>
            ))}
          </div>
        </div>
        <label className="block text-sm font-medium">
          Reporta a
          <select
            className={input}
            defaultValue={person.reports_to_assignment_id ?? ""}
            name="reportsTo"
          >
            <option value="">Ninguém</option>
            {people
              .filter((other) => other.assignment_id !== person.assignment_id)
              .map((other) => (
                <option
                  key={other.assignment_id ?? ""}
                  value={other.assignment_id ?? ""}
                >
                  {other.display_name}
                  {other.title ? ` · ${other.title}` : ""}
                </option>
              ))}
          </select>
          <span className="text-muted-foreground mt-1 block text-xs">
            Com «Os das pessoas que lhe reportam», quem está acima cobre os
            restaurantes de quem está abaixo.
          </span>
        </label>
        <div>
          <SubmitButton pendingLabel="A guardar…">Guardar</SubmitButton>
        </div>
      </form>
      {!isSelf && (
        <form
          action={deactivatePersonAction}
          className="rounded-2xl border border-red-200 bg-red-50 p-4"
        >
          <input
            type="hidden"
            name="profileId"
            value={person.profile_id ?? ""}
          />
          <input
            type="hidden"
            name="authUserId"
            value={person.auth_user_id ?? ""}
          />
          <p className="text-sm font-medium text-red-900">Desactivar acesso</p>
          <p className="mt-1 text-xs text-red-900/80">
            Termina as atribuições e bloqueia a entrada. O histórico do que a
            pessoa fez mantém-se. Não se apaga nada.
          </p>
          <div className="mt-3">
            <SubmitButton
              className="!border-red-300 !text-red-900"
              variant="secondary"
              pendingLabel="A desactivar…"
            >
              Desactivar {person.display_name}
            </SubmitButton>
          </div>
        </form>
      )}
    </RecordPanel>
  );
}
