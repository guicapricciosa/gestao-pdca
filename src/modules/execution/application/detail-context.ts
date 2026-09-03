import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/platform/supabase/database.types";

export async function loadExecutionDetailContext(
  client: SupabaseClient<Database>,
  securityObjectId: string,
) {
  const [objectRow, units, restaurants, memberships] = await Promise.all([
    client
      .from("security_objects")
      .select("version")
      .eq("id", securityObjectId)
      .single(),
    client
      .from("object_scope_organizational_units")
      .select(
        "organizational_unit_id,unit:organizational_units!object_scope_organizational_units_organizational_unit_id_fkey(name)",
      )
      .eq("security_object_id", securityObjectId),
    client
      .from("object_scope_restaurants")
      .select(
        "restaurant_id,restaurant:restaurants!object_scope_restaurants_restaurant_id_fkey(name)",
      )
      .eq("security_object_id", securityObjectId),
    client
      .from("object_memberships")
      .select(
        "id,membership_role,profile:profiles!object_memberships_profile_id_fkey(display_name)",
      )
      .eq("security_object_id", securityObjectId)
      .is("ended_at", null),
  ]);

  for (const error of [
    objectRow.error,
    units.error,
    restaurants.error,
    memberships.error,
  ]) {
    if (error !== null) throw new Error(error.message);
  }

  return {
    securityVersion: objectRow.data?.version ?? 1,
    unitScopeIds: (units.data ?? []).map((row) => row.organizational_unit_id),
    restaurantScopeIds: (restaurants.data ?? []).map(
      (row) => row.restaurant_id,
    ),
    unitScopes: (units.data ?? []).map((row) => row.unit.name),
    restaurantScopes: (restaurants.data ?? []).map(
      (row) => row.restaurant.name,
    ),
    collaborators: (memberships.data ?? [])
      .filter((row) => row.membership_role === "COLLABORATOR")
      .map((row) => ({ id: row.id, name: row.profile.display_name })),
    watchers: (memberships.data ?? [])
      .filter((row) => row.membership_role === "WATCHER")
      .map((row) => ({ id: row.id, name: row.profile.display_name })),
  };
}
