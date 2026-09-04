"use server";

import { finish } from "@/app/actions/finish";
import { appOrigin } from "@/platform/http/origin";
import { createSupabaseAdminClient } from "@/platform/supabase/admin";
import { createSupabaseServerClient } from "@/platform/supabase/server";

const page = "/definicoes/pessoas";

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

/** The caller must hold organization.manage; the command re-checks it too. */
async function assertCanManage() {
  const client = await createSupabaseServerClient();
  const { data } = await client.rpc("get_accessible_scope");
  const allowed = (data ?? []).some(
    (path) => path.permission_key === "organization.manage",
  );
  if (!allowed) throw new Error("permission denied");
  return client;
}

/**
 * Invite: creates the Auth user (Supabase sends the e-mail with a link to
 * /definir-palavra-passe), then the profile and first assignment through the
 * `invite_person` command under the caller's permission. If the command is
 * refused, the Auth user is removed again so nothing half-created remains.
 */
export async function invitePersonAction(formData: FormData) {
  const client = await assertCanManage();
  const email = text(formData, "email").toLowerCase();
  const displayName = text(formData, "displayName");
  const restaurantScope = text(formData, "restaurantScope") || "NONE";
  const unitScope =
    text(formData, "unitId") === "" ? "COMPANY_WIDE" : "ASSIGNED";
  if (!email.includes("@") || displayName.length < 2)
    finish(page, new Error("invalid input"));

  const admin = createSupabaseAdminClient();
  const origin = await appOrigin();
  const invited = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/definir-palavra-passe")}`,
    data: { display_name: displayName },
  });
  if (invited.error !== null || invited.data.user === null) {
    console.error("invite failed", {
      status: invited.error?.status,
      code: invited.error?.code,
    });
    finish(
      page,
      new Error(
        invited.error?.code === "email_exists"
          ? "email already invited"
          : `invite failed: ${invited.error?.message ?? "unknown"}`,
      ),
    );
  }

  const { error } = await client.rpc("invite_person", {
    p_auth_user_id: invited.data.user.id,
    p_display_name: displayName,
    p_email: email,
    p_company_id: text(formData, "companyId"),
    p_role_id: text(formData, "roleId"),
    p_organizational_unit_id: (text(formData, "unitId") || null) as never,
    p_title: (text(formData, "title") || null) as never,
    p_unit_scope_mode: unitScope as never,
    p_restaurant_scope_mode: restaurantScope as never,
    p_restaurant_ids:
      restaurantScope === "ASSIGNED" ? list(formData, "restaurantIds") : [],
  });
  if (error !== null) {
    await admin.auth.admin.deleteUser(invited.data.user.id);
    finish(page, error);
  }
  finish(page, null);
}

/** Sends the invite e-mail again to someone who has not set a password yet. */
export async function resendInviteAction(formData: FormData) {
  await assertCanManage();
  const email = text(formData, "email").toLowerCase();
  const admin = createSupabaseAdminClient();
  const origin = await appOrigin();
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/definir-palavra-passe")}`,
  });
  if (error !== null) {
    // Already accepted: the person can use password recovery instead.
    const { error: resetError } = await admin.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/definir-palavra-passe")}`,
      },
    );
    finish(page, resetError);
  }
  finish(page, null);
}
