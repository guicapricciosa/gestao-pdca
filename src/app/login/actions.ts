"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/platform/supabase/server";

import { classifyLoginError } from "./login-error";
import { safeNextPath } from "./next-path";

export async function loginAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const next = safeNextPath(formData.get("next"));
  const { error } = await client.auth.signInWithPassword({
    email: String(formData.get("email")).trim().toLowerCase(),
    password: String(formData.get("password")),
  });
  if (error !== null) {
    const kind = classifyLoginError({
      status: error.status,
      code: error.code,
    });
    if (kind === "service_unavailable")
      console.error("auth service failure during login", {
        status: error.status,
        code: error.code,
      });
    redirect(
      `/login?error=${kind}${next === "/my-work" ? "" : `&next=${encodeURIComponent(next)}`}`,
    );
  }
  redirect(next);
}

export async function logoutAction() {
  const client = await createSupabaseServerClient();
  await client.auth.signOut();
  redirect("/login");
}
