import "server-only";

import { loadCreationOptions } from "@/modules/execution/application/creation-options";
import { createSupabaseServerClient } from "@/platform/supabase/server";

export async function loadMeetingCreationOptions() {
  const base = await loadCreationOptions("meeting.create");
  const client = await createSupabaseServerClient();
  const [profiles, series, templates, auth] = await Promise.all([
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
    client
      .from("meeting_templates")
      .select(
        "id,name,default_duration_minutes,visibility,participant_profile_ids,unit_ids,restaurant_ids,all_restaurants,agenda,recurrence,meeting_type",
      )
      .eq("is_active", true)
      .order("sort_order")
      .order("name"),
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
    templates: (templates.data ?? []).map((template) => ({
      id: template.id,
      name: template.name,
      durationMinutes: template.default_duration_minutes,
      visibility: template.visibility,
      participantIds: template.participant_profile_ids,
      unitIds: template.unit_ids,
      restaurantIds: template.restaurant_ids,
      allRestaurants: template.all_restaurants,
      agenda: Array.isArray(template.agenda)
        ? (template.agenda as unknown[]).filter(
            (item): item is string => typeof item === "string",
          )
        : [],
      recurrence: JSON.stringify(template.recurrence ?? { freq: "NONE" }),
      meetingType: template.meeting_type,
    })),
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
