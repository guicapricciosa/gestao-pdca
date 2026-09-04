import "server-only";

import type { PermissionKey } from "@/modules/authorization/domain/types";
import {
  createSupabaseServerClient,
  currentAuthUser,
} from "@/platform/supabase/server";

export interface CreationOptions {
  readonly companies: readonly { id: string; name: string }[];
  readonly units: readonly {
    id: string;
    companyId: string;
    name: string;
    unitType: "DEPARTMENT" | "SHARED_SERVICE";
  }[];
  readonly restaurants: readonly {
    id: string;
    companyId: string;
    name: string;
  }[];
}

export interface ListOptions extends CreationOptions {
  readonly people: readonly { id: string; name: string }[];
}

export async function loadCreationOptions(
  permissionKey: PermissionKey,
): Promise<CreationOptions> {
  const client = await createSupabaseServerClient();
  const { data: paths, error } = await client.rpc("get_accessible_scope");
  if (error !== null) throw new Error(error.message);
  const relevant = (paths ?? []).filter(
    (path) => path.permission_key === permissionKey,
  );
  const companyIds = [...new Set(relevant.map((path) => path.company_id))];
  if (companyIds.length === 0)
    return { companies: [], units: [], restaurants: [] };

  const [{ data: companies }, { data: allUnits }, { data: allRestaurants }] =
    await Promise.all([
      client
        .from("companies")
        .select("id,name")
        .in("id", companyIds)
        .eq("is_active", true)
        .order("name"),
      client
        .from("organizational_units")
        .select("id,company_id,name,unit_type")
        .in("company_id", companyIds)
        .eq("is_active", true)
        .order("name"),
      client
        .from("restaurants")
        .select("id,company_id,name")
        .in("company_id", companyIds)
        .eq("is_active", true)
        .order("name"),
    ]);

  const unitAllowed = new Set<string>();
  const restaurantAllowed = new Set<string>();
  for (const path of relevant) {
    if (path.unit_scope === "COMPANY_WIDE") {
      for (const unit of allUnits ?? [])
        if (unit.company_id === path.company_id) unitAllowed.add(unit.id);
    } else if (path.organizational_unit_id !== null)
      unitAllowed.add(path.organizational_unit_id);
    if (path.restaurant_scope === "COMPANY_WIDE") {
      for (const restaurant of allRestaurants ?? [])
        if (restaurant.company_id === path.company_id)
          restaurantAllowed.add(restaurant.id);
    } else if (path.restaurant_id !== null)
      restaurantAllowed.add(path.restaurant_id);
  }

  return {
    companies: companies ?? [],
    units: (allUnits ?? [])
      .filter((unit) => unitAllowed.has(unit.id))
      .map((unit) => ({
        id: unit.id,
        companyId: unit.company_id,
        name: unit.name,
        unitType: unit.unit_type as "DEPARTMENT" | "SHARED_SERVICE",
      })),
    restaurants: (allRestaurants ?? [])
      .filter((restaurant) => restaurantAllowed.has(restaurant.id))
      .map((restaurant) => ({
        id: restaurant.id,
        companyId: restaurant.company_id,
        name: restaurant.name,
      })),
  };
}

export async function loadListOptions(
  permissionKey: PermissionKey,
): Promise<ListOptions> {
  const base = await loadCreationOptions(permissionKey);
  if (base.companies.length === 0) return { ...base, people: [] };
  const client = await createSupabaseServerClient();
  const { data } = await client
    .from("profiles")
    .select("id,display_name")
    .eq("is_active", true)
    .order("display_name");
  return {
    ...base,
    people: (data ?? []).map((profile) => ({
      id: profile.id,
      name: profile.display_name,
    })),
  };
}

export interface ViewerContext {
  readonly companyWide: boolean;
  readonly restaurantIds: readonly string[];
  readonly unitIds: readonly string[];
  readonly profileId: string | null;
}

/**
 * What the current person covers for a given permission: used to pre-fill
 * "Onde se aplica?" outside meetings. Ambiguous cases stay open.
 */
export async function loadViewerContext(
  permissionKey: PermissionKey,
): Promise<ViewerContext> {
  const client = await createSupabaseServerClient();
  const user = await currentAuthUser(client);
  const [{ data: paths }, { data: profile }] = await Promise.all([
    client.rpc("get_accessible_scope"),
    client
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user?.id ?? "")
      .maybeSingle(),
  ]);
  const relevant = (paths ?? []).filter(
    (path) => path.permission_key === permissionKey,
  );
  return {
    companyWide: relevant.some(
      (path) => path.restaurant_scope === "COMPANY_WIDE",
    ),
    restaurantIds: [
      ...new Set(
        relevant
          .map((path) => path.restaurant_id)
          .filter((id): id is string => id !== null),
      ),
    ],
    unitIds: [
      ...new Set(
        relevant
          .map((path) => path.organizational_unit_id)
          .filter((id): id is string => id !== null),
      ),
    ],
    profileId: profile?.id ?? null,
  };
}
