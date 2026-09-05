"use server";

import { finish } from "@/app/actions/finish";
import { createSupabaseAdminClient } from "@/platform/supabase/admin";
import { createSupabaseServerClient } from "@/platform/supabase/server";

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function list(formData: FormData, name: string) {
  return formData
    .getAll(name)
    .filter(
      (value): value is string => typeof value === "string" && value !== "",
    );
}

/** Restaurant codes are derived from the name unless given: "Sophia Natural" → SOPHIA_NATURAL. */
function codeFrom(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

export async function saveRestaurantAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const id = text(formData, "restaurantId") || null;
  const name = text(formData, "name");
  const { error } = await client.rpc("save_restaurant", {
    p_restaurant_id: id as never,
    p_company_id: text(formData, "companyId"),
    p_code: text(formData, "code") || codeFrom(name),
    p_name: name,
    p_is_active: formData.get("isActive") !== "false",
  });
  finish("/definicoes/organizacao?tab=restaurantes", error);
}

export async function saveUnitAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const id = text(formData, "unitId") || null;
  const name = text(formData, "name");
  const { error } = await client.rpc("save_organizational_unit", {
    p_unit_id: id as never,
    p_company_id: text(formData, "companyId"),
    p_unit_type: (text(formData, "unitType") || "DEPARTMENT") as never,
    p_code: text(formData, "code") || codeFrom(name),
    p_name: name,
    p_is_active: formData.get("isActive") !== "false",
  });
  finish("/definicoes/organizacao?tab=departamentos", error);
}

export async function updatePersonAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const assignmentId = text(formData, "assignmentId");
  const restaurantScope = text(formData, "restaurantScope") || "NONE";
  const unitId = text(formData, "unitId");
  const { error } = await client.rpc("update_person_assignment", {
    p_assignment_id: assignmentId,
    p_role_id: text(formData, "roleId"),
    p_organizational_unit_id: (unitId || null) as never,
    p_title: (text(formData, "title") || null) as never,
    p_unit_scope_mode: (text(formData, "unitScope") === "ASSIGNED"
      ? "ASSIGNED"
      : "COMPANY_WIDE") as never,
    p_restaurant_scope_mode: restaurantScope as never,
    p_restaurant_ids:
      restaurantScope === "ASSIGNED" ? list(formData, "restaurantIds") : [],
    p_reports_to_assignment_id: (text(formData, "reportsTo") || null) as never,
  });
  finish(
    error
      ? `/definicoes/pessoas?editar=${assignmentId}`
      : "/definicoes/pessoas",
    error,
  );
}

/** Ends the assignments, marks the profile inactive and blocks sign-in. */
export async function deactivatePersonAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const profileId = text(formData, "profileId");
  const authUserId = text(formData, "authUserId");
  const { error } = await client.rpc("deactivate_person", {
    p_profile_id: profileId,
  });
  if (error === null && authUserId !== "") {
    const admin = createSupabaseAdminClient();
    const banned = await admin.auth.admin.updateUserById(authUserId, {
      ban_duration: "876000h",
    });
    if (banned.error)
      console.error("ban after deactivation failed", {
        status: banned.error.status,
      });
  }
  finish("/definicoes/pessoas", error);
}
