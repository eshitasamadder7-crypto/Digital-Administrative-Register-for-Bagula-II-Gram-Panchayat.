import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface CitizenProfile {
  user_id: string;
  citizen_id: string;
  prefix: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  guardian_name: string | null;
  mother_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  marital_status: string | null;
  occupation: string | null;
  village: string | null;
  post_office: string | null;
  gram_panchayat: string;
  block: string;
  police_station: string;
  district: string;
  state: string;
  pin_code: string | null;
  mobile: string | null;
  alternate_mobile: string | null;
  email: string | null;
  email_verified: boolean;
  epic_no: string | null;
  pan_no: string | null;
  aadhaar_last4: string | null;
  photo_path: string | null;
  epic_doc_path: string | null;
  pan_doc_path: string | null;
  aadhaar_doc_path: string | null;
  preferred_language: string;
  profile_completed_at: string | null;
  created_at: string;
}

export interface CitizenHealth {
  health: "good" | "watch" | "restricted" | "suspended";
  trust_score: number;
  admin_note: string | null;
}

/** Days a citizen has to upload the passport photo before applications are blocked. */
export const PROFILE_GRACE_DAYS = 30;

export function useCitizenSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<CitizenProfile | null>(null);
  const [health, setHealth] = useState<CitizenHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (uid: string) => {
    const [{ data: p }, { data: h }] = await Promise.all([
      supabase.from("citizen_profiles").select("*").eq("user_id", uid).maybeSingle(),
      supabase.from("citizen_account_health").select("health, trust_score, admin_note").eq("user_id", uid).maybeSingle(),
    ]);
    setProfile((p as CitizenProfile) ?? null);
    setHealth((h as CitizenHealth) ?? null);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) {
        setProfile(null);
        setHealth(null);
      }
    });

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) await load(data.session.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, [load]);

  useEffect(() => {
    if (session?.user.id) load(session.user.id);
  }, [session?.user.id, load]);

  const refresh = useCallback(async () => {
    if (session?.user.id) await load(session.user.id);
  }, [session?.user.id, load]);

  const derived = useMemo(() => {
    const photoMissing = !profile?.photo_path;
    const complete = Boolean(profile?.photo_path && profile?.epic_no && profile?.village && profile?.mobile);
    const createdAt = profile ? new Date(profile.created_at) : null;
    const daysSince = createdAt ? Math.floor((Date.now() - createdAt.getTime()) / 86_400_000) : 0;
    const daysLeft = Math.max(0, PROFILE_GRACE_DAYS - daysSince);
    return {
      photoMissing,
      profileComplete: complete,
      graceDaysLeft: daysLeft,
      /** Applications are blocked after the grace period until the profile is completed. */
      applicationsBlocked: !complete && daysLeft === 0,
    };
  }, [profile]);

  return { session, profile, health, loading, refresh, ...derived };
}
