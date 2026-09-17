import { supabase } from "@/integrations/supabase/client";

export type ResolvedDestination = {
  destination: string;
  role: "super_admin" | "admin" | "deo" | "monitoring_authority" | "citizen";
  error?: string;
};

const SUPER_ADMIN_EMAILS = [
  "bagula2nogp111@gmail.com",
  "nitish374482@gmail.com",
];

const ADMIN_EMAILS = [
  ...SUPER_ADMIN_EMAILS,
  "nitush6488@gmail.com",
  "nitush8343980898@gmail.com",
];

/**
 * Authoritatively determines where an authenticated Supabase user must be routed
 * based on live database roles and profiles in the NEW Supabase project.
 */
export async function resolveUserDestination(userId: string, email?: string | null): Promise<ResolvedDestination> {
  const normEmail = (email ?? "").trim().toLowerCase();

  // 1. Check if designated Super Admin
  if (SUPER_ADMIN_EMAILS.includes(normEmail)) {
    // Ensure role and profile exist in background
    supabase
      .from("user_roles")
      .upsert({ user_id: userId, role: "super_admin" } as any)
      .then(() => {});
    supabase
      .from("admin_profiles")
      .upsert({
        user_id: userId,
        email: normEmail,
        display_name: "Super Admin (Bagula-II GP)",
        status: "active",
        allowed_login_method: "all",
        service_scope: ["all"],
      } as any)
      .then(() => {});

    return { destination: "/admin/dashboard", role: "super_admin" };
  }

  // 2. Query office roles, admin profiles, and citizen profiles in parallel
  const [
    { data: rolesData, error: rolesErr },
    { data: adminProfile, error: adminErr },
    { data: citizenProfile, error: citizenErr },
  ] = await Promise.all([
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["super_admin", "admin", "deo", "monitoring_authority"]),
    supabase
      .from("admin_profiles")
      .select("status, archived_at")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("citizen_profiles")
      .select("user_id, citizen_id")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (rolesErr) {
    console.error("Role lookup error:", rolesErr);
  }
  if (adminErr) {
    console.error("Admin profile lookup error:", adminErr);
  }
  if (citizenErr) {
    console.error("Citizen profile lookup error:", citizenErr);
  }

  // Check if office account
  const roles = (rolesData ?? []).map((r) => r.role);

  // If whitelisted office email without role yet, attempt bootstrap
  if (roles.length === 0 && ADMIN_EMAILS.includes(normEmail)) {
    const { error: rpcError } = await supabase.rpc("bootstrap_admin_role");
    if (!rpcError) {
      if (normEmail === "nitush6488@gmail.com") {
        return { destination: "/admin/dashboard", role: "admin" };
      }
      return { destination: "/admin/deo", role: "deo" };
    }
  }

  // Active office check
  if (roles.length > 0) {
    if (adminProfile?.status === "suspended" || adminProfile?.archived_at) {
      return {
        destination: "/admin",
        role: "deo",
        error: "This office account has been suspended or revoked. Please contact the Super Admin.",
      };
    }

    if (roles.includes("super_admin")) {
      return { destination: "/admin/dashboard", role: "super_admin" };
    }
    if (roles.includes("admin") || roles.includes("monitoring_authority")) {
      return { destination: "/admin/dashboard", role: roles.includes("admin") ? "admin" : "monitoring_authority" };
    }
    if (roles.includes("deo")) {
      return { destination: "/admin/deo", role: "deo" };
    }
  }

  // Citizen check
  if (citizenProfile) {
    return { destination: "/public/dashboard", role: "citizen" };
  }

  // If no citizen profile yet, check if user has citizen metadata
  const { data: authUser } = await supabase.auth.getUser();
  if (authUser?.user?.user_metadata?.citizen) {
    return { destination: "/public/dashboard", role: "citizen" };
  }

  // If they signed in with Google or email on the citizen login page, allow them into citizen onboarding
  return { destination: "/public/dashboard", role: "citizen" };
}
