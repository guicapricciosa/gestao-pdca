"use server";

import { redirect } from "next/navigation";

import { appOrigin } from "@/platform/http/origin";
import { createSupabaseAdminClient } from "@/platform/supabase/admin";
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

/**
 * Password recovery. The answer is the same whether or not the e-mail exists,
 * so the form cannot be used to discover who has an account.
 */
export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email")).trim().toLowerCase();
  if (email !== "") {
    // Sent with the server key: the link then carries the session itself
    // (no PKCE verifier to keep in this browser), which also lets people open
    // it on another device.
    const client = createSupabaseAdminClient();
    const origin = await appOrigin();
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/definir-palavra-passe")}`,
    });
    if (error !== null)
      console.error("password reset request failed", {
        status: error.status,
        code: error.code,
      });
  }
  redirect("/recuperar-palavra-passe?enviado=1");
}

/** Sets the password of the signed-in person (after an invite or recovery link). */
export async function setPasswordAction(formData: FormData) {
  const password = String(formData.get("password"));
  const confirmation = String(formData.get("confirmation"));
  if (password.length < 10) redirect("/definir-palavra-passe?error=curta");
  if (password !== confirmation)
    redirect("/definir-palavra-passe?error=diferentes");
  const client = await createSupabaseServerClient();
  const { error } = await client.auth.updateUser({ password });
  if (error !== null) {
    console.error("set password failed", {
      status: error.status,
      code: error.code,
    });
    redirect(
      `/definir-palavra-passe?error=${error.code === "same_password" ? "igual" : "falhou"}`,
    );
  }
  redirect("/my-work?saved=1");
}
