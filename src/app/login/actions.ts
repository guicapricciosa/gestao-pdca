"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/platform/supabase/server";

export async function loginAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const { error } = await client.auth.signInWithPassword({
    email: String(formData.get("email")).trim().toLowerCase(),
    password: String(formData.get("password")),
  });
  if (error !== null) redirect("/login?error=invalid_credentials");
  redirect("/my-work");
}

export async function logoutAction() {
  const client = await createSupabaseServerClient();
  await client.auth.signOut();
  redirect("/login");
}
