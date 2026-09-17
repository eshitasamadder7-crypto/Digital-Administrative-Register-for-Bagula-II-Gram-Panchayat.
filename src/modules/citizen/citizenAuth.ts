import { supabase } from "@/integrations/supabase/client";

/**
 * Citizen authentication layer.
 *
 * Registration and login both go through the `citizen-auth` edge function so that:
 *  - Citizen IDs are generated server-side and are permanent.
 *  - Sign-in works with Email / Mobile / Citizen ID without ever exposing
 *    another citizen's email address to the browser.
 *  - Every attempt is written to the citizen audit log.
 *
 * The office (DEO / Admin) auth flow is untouched — this is an additional,
 * pluggable module on the same Supabase project.
 */

export interface CitizenRegistrationInput {
  prefix?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  guardian_name?: string;
  mother_name?: string;
  date_of_birth?: string;
  gender?: string;
  marital_status?: string;
  occupation?: string;
  village?: string;
  post_office?: string;
  pin_code?: string;
  mobile: string;
  alternate_mobile?: string;
  email?: string;
  epic_no?: string;
  pan_no?: string;
  aadhaar_last4?: string;
  password: string;
  preferred_language?: string;
}

/** Confirm that the authenticated user is a citizen before entering the portal. */
export async function validateCitizenSession() {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData.user;
  if (userError || !user) {
    throw new Error("Your session could not be verified. Please sign in again.");
  }

  const [{ data: profile, error: profileError }, { data: health, error: healthError }] = await Promise.all([
    supabase.from("citizen_profiles").select("user_id").eq("user_id", user.id).maybeSingle(),
    supabase.from("citizen_account_health").select("health").eq("user_id", user.id).maybeSingle(),
  ]);

  if (profileError) throw new Error(`Citizen profile verification failed: ${profileError.message}`);
  if (healthError) throw new Error(`Citizen account verification failed: ${healthError.message}`);
  if (!profile) throw new Error("This account is not registered in the citizen portal.");
  if (health?.health === "suspended") throw new Error("This citizen account is suspended. Please contact the Panchayat office.");

  return user;
}

async function callCitizenAuth<T>(action: string, payload: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke("citizen-auth", {
    body: { action, payload },
  });

  if (error) {
    // Edge function returned a non-2xx — surface its friendly message when present.
    let message = "Something went wrong. Please try again.";
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const body = await ctx.json();
        if (body?.error) message = body.error;
      } catch {
        /* ignore */
      }
    }
    throw new Error(message);
  }

  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

export async function registerCitizen(input: CitizenRegistrationInput) {
  return callCitizenAuth<{ citizen_id: string; auth_email: string }>("register", input);
}

export async function loginCitizen(identifier: string, password: string) {
  const tokens = await callCitizenAuth<{ access_token: string; refresh_token: string }>("login", {
    identifier,
    password,
  });

  const { error } = await supabase.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });
  if (error) throw new Error("Could not start your session. Please try again.");
  await validateCitizenSession();
  return tokens;
}

export async function logoutCitizen() {
  await supabase.auth.signOut();
}
