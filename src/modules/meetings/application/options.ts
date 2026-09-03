import "server-only";

import { loadCreationOptions } from "@/modules/execution/application/creation-options";
import { createSupabaseServerClient } from "@/platform/supabase/server";

export async function loadMeetingCreationOptions() {
  const base = await loadCreationOptions("meeting.create");
  const client = await createSupabaseServerClient();
  const [profiles, series, auth] = await Promise.all([
    client
      .from("profiles")
      .select("id,display_name")
      .eq("is_active", true)
      .order("display_name"),
    client
      .from("meeting_series")
      .select("id,title,company_id")
      .eq("is_active", true)
      .order("title"),
    client.auth.getUser(),
  ]);
  const authUserId = auth.data.user?.id;
  const { data: currentProfile } = authUserId
    ? await client
        .from("profiles")
        .select("id")
        .eq("auth_user_id", authUserId)
        .single()
    : { data: null };
  return {
    ...base,
    profiles: profiles.data ?? [],
    series: series.data ?? [],
    currentProfileId: currentProfile?.id ?? null,
  };
}

export async function loadMeetingParticipantOptions(securityObjectId: string) {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.rpc("get_meeting_accessible_profiles", {
    meeting_security_object_id: securityObjectId,
  });
  if (error !== null) throw new Error(error.message);
  return data ?? [];
}
