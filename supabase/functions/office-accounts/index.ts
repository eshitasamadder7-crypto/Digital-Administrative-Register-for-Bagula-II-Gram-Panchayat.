import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const admin = () => createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const OFFICE_ROLES = ["deo", "admin", "super_admin"] as const;
const LOGIN_METHODS = ["google", "password", "both"] as const;
const DESIGNATIONS = [
  "secretary", "deo", "pradhan", "upa_pradhan", "member", "clerk", "accountant", "other",
] as const;

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isMobile = (v: string) => /^[6-9][0-9]{9}$/.test(v);

function passwordProblem(pw: string): string | null {
  if (!pw || pw.length < 8) return "Temporary password must be at least 8 characters.";
  if (!/[A-Za-z]/.test(pw)) return "Temporary password must contain a letter.";
  if (!/[0-9]/.test(pw)) return "Temporary password must contain a number.";
  return null;
}

/**
 * Generate a cryptographically secure, high-entropy temporary password.
 * Uses crypto.getRandomValues and guarantees characters from all classes.
 */
function generateSecureTemporaryPassword(length = 16): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // exclude ambiguous I, O
  const lower = "abcdefghijkmnopqrstuvwxyz"; // exclude ambiguous l
  const digits = "23456789"; // exclude ambiguous 0, 1
  const symbols = "!@#$%^&*()-_=+";
  const all = upper + lower + digits + symbols;

  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);

  // Guarantee at least 2 of each required class
  const chars = [
    upper[buf[0] % upper.length],
    upper[buf[1] % upper.length],
    lower[buf[2] % lower.length],
    lower[buf[3] % lower.length],
    digits[buf[4] % digits.length],
    digits[buf[5] % digits.length],
    symbols[buf[6] % symbols.length],
    symbols[buf[7] % symbols.length],
  ];

  for (let i = 8; i < length; i++) {
    chars.push(all[buf[i] % all.length]);
  }

  // Cryptographic Fisher-Yates shuffle
  const shuffleBuf = new Uint8Array(length);
  crypto.getRandomValues(shuffleBuf);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = shuffleBuf[i] % (i + 1);
    const temp = chars[i];
    chars[i] = chars[j];
    chars[j] = temp;
  }

  return chars.join("");
}

/** Resolve the caller and confirm they are a Super Admin. */
async function requireSuperAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return { error: json({ error: "Not authenticated." }, 401) };
  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data, error } = await anon.auth.getUser();
  if (error || !data.user) return { error: json({ error: "Not authenticated." }, 401) };

  const db = admin();
  const userEmail = (data.user.email ?? "").trim().toLowerCase();
  const bootstrapSuperAdmins = [
    "bagula2nogp111@gmail.com",
    "nitish374482@gmail.com",
    "nitush6488@gmail.com",
  ];

  if (bootstrapSuperAdmins.includes(userEmail)) {
    try {
      await db.from("user_roles").upsert(
        { user_id: data.user.id, role: "super_admin" },
        { onConflict: "user_id,role" }
      );
      await db.from("admin_profiles").upsert(
        {
          user_id: data.user.id,
          email: userEmail,
          display_name: data.user.user_metadata?.full_name || "Official Administrator",
          status: "active",
          designation: "pradhan",
          allowed_login_method: "both",
        },
        { onConflict: "user_id" }
      );
    } catch (_e) {
      // non-fatal
    }
    return { db, actor: data.user };
  }

  const { data: roles } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .eq("role", "super_admin");
  if (!roles || roles.length === 0)
    return { error: json({ error: "Only a Super Admin can manage office accounts." }, 403) };

  return { db, actor: data.user };
}

async function handleCreate(db: ReturnType<typeof admin>, actorId: string, p: Record<string, string>) {
  const fullName = (p.full_name ?? "").trim();
  const email = (p.email ?? "").trim().toLowerCase();
  const mobile = (p.mobile ?? "").trim();
  const designation = (p.designation ?? "").trim();
  const role = (p.role ?? "").trim();
  const loginMethod = (p.allowed_login_method ?? "both").trim();
  const password = p.temp_password ?? "";
  // Do not log the password

  if (fullName.length < 3) return json({ error: "Enter the officer's full name." }, 400);
  if (!isEmail(email)) return json({ error: "Enter a valid official email address." }, 400);
  if (!isMobile(mobile)) return json({ error: "Enter a valid 10-digit mobile number." }, 400);
  if (!DESIGNATIONS.includes(designation as never)) return json({ error: "Select a designation." }, 400);
  if (!OFFICE_ROLES.includes(role as never)) return json({ error: "Select a system role." }, 400);
  if (!LOGIN_METHODS.includes(loginMethod as never)) return json({ error: "Select an allowed login method." }, 400);

  const needsPassword = loginMethod !== "google";
  if (needsPassword) {
    const pwErr = passwordProblem(password);
    if (pwErr) return json({ error: pwErr }, 400);
  }

  const { data: existingProfile } = await db
    .from("admin_profiles")
    .select("user_id")
    .ilike("email", email)
    .maybeSingle();
  if (existingProfile) return json({ error: "An office account already exists for this email." }, 409);

  const { data: created, error: createErr } = await db.auth.admin.createUser({
    email,
    password: needsPassword ? password : crypto.randomUUID() + "Aa1",
    email_confirm: true,
    user_metadata: { office: true, display_name: fullName },
  });
  if (createErr || !created.user)
    return json({ error: createErr?.message ?? "Could not create the account." }, 400);

  const userId = created.user.id;

  const { error: profileErr } = await db.from("admin_profiles").insert({
    user_id: userId,
    email,
    display_name: fullName,
    mobile,
    designation,
    status: "active",
    allowed_login_method: loginMethod,
    must_change_password: needsPassword,
    created_by: actorId,
  });
  if (profileErr) {
    await db.auth.admin.deleteUser(userId);
    return json({ error: profileErr.message }, 400);
  }

  const { error: roleErr } = await db.from("user_roles").insert({ user_id: userId, role });
  if (roleErr) {
    await db.from("admin_profiles").delete().eq("user_id", userId);
    await db.auth.admin.deleteUser(userId);
    return json({ error: roleErr.message }, 400);
  }

  await db.from("activity_logs").insert({
    actor_user_id: actorId,
    action_type: "office.account.create",
    target_table: "admin_profiles",
    target_id: userId,
    metadata: { email, role, designation, allowed_login_method: loginMethod },
  });

  return json({ user_id: userId, email, role });
}

async function handleResetPassword(db: ReturnType<typeof admin>, actorId: string, p: Record<string, string>) {
  const userId = (p.user_id ?? "").trim();
  if (!userId) return json({ error: "Target office user account ID is required." }, 400);

  // Super Admin cannot perform administrative reset on their own account; must use profile settings
  if (actorId === userId) {
    return json({
      error: "Super Admin cannot reset their own password through administrative reset. Please use your profile account settings.",
    }, 400);
  }

  // 1. Verify target office user exists
  const { data: targetProfile, error: profileFetchErr } = await db
    .from("admin_profiles")
    .select("user_id, email, display_name, status, service_scope, designation")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileFetchErr || !targetProfile) {
    return json({ error: "Target office user profile not found." }, 404);
  }

  // Fetch target user's role for audit metadata (ensuring role is preserved)
  const { data: targetRoles } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const targetRole = targetRoles?.[0]?.role ?? "deo";

  // 2. Generate a cryptographically secure temporary password server-side
  const tempPassword = generateSecureTemporaryPassword(16);
  const pwErr = passwordProblem(tempPassword);
  if (pwErr) return json({ error: "Cryptographic password generation failed requirement: " + pwErr }, 500);

  // 3. Atomically replace the actual Supabase Auth password using Admin API
  // This immediately invalidates the old password for all future login attempts!
  const { error: authErr } = await db.auth.admin.updateUserById(userId, {
    password: tempPassword,
  });
  if (authErr) {
    return json({ error: "Failed to update authentication credential: " + authErr.message }, 400);
  }

  // 4. Invalidate any existing active sessions/refresh tokens for the target user
  try {
    await db.rpc("revoke_user_sessions", { target_user_id: userId });
  } catch (_sessionErr) {
    // Non-blocking in case rpc is unavailable or restricted
  }

  // 5. Update admin_profiles: mark must_change_password = true and record temp_password_issued_at
  // Role, service_scope, designation, and status are strictly preserved without alteration
  const nowIso = new Date().toISOString();
  const { error: updateProfileErr } = await db
    .from("admin_profiles")
    .update({
      must_change_password: true,
      temp_password_issued_at: nowIso,
      updated_at: nowIso,
    })
    .eq("user_id", userId);

  if (updateProfileErr) {
    return json({ error: "Credential updated but profile state failed to persist." }, 500);
  }

  // 6. Record audit entry: PASSWORD_RESET
  // NEVER record: old password, new password, temporary password, or password hash
  await db.from("activity_logs").insert({
    actor_user_id: actorId,
    action_type: "PASSWORD_RESET",
    target_table: "admin_profiles",
    target_id: userId,
    metadata: {
      action: "PASSWORD_RESET",
      actor_id: actorId,
      actor_role: "super_admin",
      target_user_id: userId,
      target_role: targetRole,
      target_email: targetProfile.email,
      timestamp: nowIso,
    },
  });

  // 7. Return temporary password once to Super Admin
  return json({
    ok: true,
    message: "Password reset successfully.",
    temporary_password: tempPassword,
    user_id: userId,
    email: targetProfile.email,
    display_name: targetProfile.display_name,
  });
}

async function handleSetLoginMethod(db: ReturnType<typeof admin>, actorId: string, p: Record<string, string>) {
  const userId = (p.user_id ?? "").trim();
  const method = (p.allowed_login_method ?? "").trim();
  if (!userId) return json({ error: "Missing account." }, 400);
  if (!LOGIN_METHODS.includes(method as never)) return json({ error: "Invalid login method." }, 400);

  const { error } = await db.from("admin_profiles").update({ allowed_login_method: method }).eq("user_id", userId);
  if (error) return json({ error: error.message }, 400);
  await db.from("activity_logs").insert({
    actor_user_id: actorId,
    action_type: "office.account.login_method",
    target_table: "admin_profiles",
    target_id: userId,
    metadata: { allowed_login_method: method },
  });
  return json({ ok: true });
}

async function countActiveSuperAdmins(db: ReturnType<typeof admin>): Promise<number> {
  const { count, error } = await db
    .from("user_roles")
    .select("user_id", { count: "exact", head: true })
    .eq("role", "super_admin");
  return error ? 1 : count || 0;
}

async function handleSetRole(db: ReturnType<typeof admin>, actorId: string, p: Record<string, unknown>) {
  const userId = String(p.user_id ?? "").trim();
  const role = String(p.role ?? "").trim();
  if (!userId) return json({ error: "Missing account." }, 400);
  if (!OFFICE_ROLES.includes(role as never)) return json({ error: "Invalid system role." }, 400);

  // Check current roles of target user
  const { data: currentRoles } = await db.from("user_roles").select("role").eq("user_id", userId);
  const wasSuperAdmin = (currentRoles || []).some((r: any) => r.role === "super_admin");

  if (wasSuperAdmin && role !== "super_admin") {
    const activeCount = await countActiveSuperAdmins(db);
    if (activeCount <= 1) {
      return json({ error: "Cannot demote or remove the last active Super Admin account." }, 400);
    }
  }

  await db.from("user_roles").delete().eq("user_id", userId).in("role", OFFICE_ROLES as unknown as string[]);
  const { error } = await db.from("user_roles").insert({ user_id: userId, role });
  if (error) return json({ error: error.message }, 400);

  await db.from("activity_logs").insert({
    actor_user_id: actorId,
    action_type: "office.account.set_role",
    target_table: "user_roles",
    target_id: userId,
    metadata: { previous_roles: currentRoles?.map((r: any) => r.role), new_role: role },
  });
  return json({ ok: true, message: `Role updated to ${role}` });
}

async function handleSetStatus(db: ReturnType<typeof admin>, actorId: string, p: Record<string, unknown>) {
  const userId = String(p.user_id ?? "").trim();
  const status = String(p.status ?? "").trim();
  if (!userId) return json({ error: "Missing account." }, 400);
  if (!["active", "suspended", "inactive"].includes(status)) {
    return json({ error: "Invalid account status." }, 400);
  }

  // Check if target is last super_admin
  if (status !== "active") {
    const { data: currentRoles } = await db.from("user_roles").select("role").eq("user_id", userId);
    const isSuperAdmin = (currentRoles || []).some((r: any) => r.role === "super_admin");
    if (isSuperAdmin) {
      const activeCount = await countActiveSuperAdmins(db);
      if (activeCount <= 1) {
        return json({ error: "Cannot suspend or deactivate the last active Super Admin account." }, 400);
      }
    }
  }

  const { error } = await db.from("admin_profiles").update({ status, updated_at: new Date().toISOString() }).eq("user_id", userId);
  if (error) return json({ error: error.message }, 400);

  // If suspended or deactivated, revoke active sessions
  if (status !== "active") {
    try {
      await (db.rpc as any)("revoke_user_sessions", { _user_id: userId });
    } catch {
      // safe fallback
    }
  }

  await db.from("activity_logs").insert({
    actor_user_id: actorId,
    action_type: status === "active" ? "office.account.activate" : "office.account.suspend",
    target_table: "admin_profiles",
    target_id: userId,
    metadata: { status },
  });
  return json({ ok: true, message: `Account status updated to ${status}` });
}

async function handleSetServiceScope(db: ReturnType<typeof admin>, actorId: string, p: Record<string, unknown>) {
  const userId = String(p.user_id ?? "").trim();
  const scope = Array.isArray(p.service_scope) ? p.service_scope : [];
  if (!userId) return json({ error: "Missing account." }, 400);

  const { error } = await db
    .from("admin_profiles")
    .update({ service_scope: scope, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  if (error) return json({ error: error.message }, 400);

  await db.from("activity_logs").insert({
    actor_user_id: actorId,
    action_type: "office.account.service_scope",
    target_table: "admin_profiles",
    target_id: userId,
    metadata: { service_scope: scope },
  });
  return json({ ok: true, message: "Service scope updated successfully" });
}

async function handleArchive(db: ReturnType<typeof admin>, actorId: string, p: Record<string, unknown>) {
  const userId = String(p.user_id ?? "").trim();
  if (!userId) return json({ error: "Missing account." }, 400);

  // Check protected profile
  const { data: profile } = await db.from("admin_profiles").select("email").eq("user_id", userId).maybeSingle();
  if (profile?.email && PROTECTED_EMAILS.includes(profile.email.toLowerCase())) {
    return json({ error: "This account is protected and cannot be archived or removed." }, 400);
  }

  // Check if target is last super_admin
  const { data: currentRoles } = await db.from("user_roles").select("role").eq("user_id", userId);
  const isSuperAdmin = (currentRoles || []).some((r: any) => r.role === "super_admin");
  if (isSuperAdmin) {
    const activeCount = await countActiveSuperAdmins(db);
    if (activeCount <= 1) {
      return json({ error: "Cannot archive the last active Super Admin account." }, 400);
    }
  }

  // Revoke roles and mark archived
  await db.from("user_roles").delete().eq("user_id", userId).in("role", OFFICE_ROLES as unknown as string[]);
  const now = new Date().toISOString();
  await db.from("admin_profiles").update({
    status: "archived",
    archived_at: now,
    updated_at: now,
  }).eq("user_id", userId);

  // Revoke active sessions
  try {
    await (db.rpc as any)("revoke_user_sessions", { _user_id: userId });
  } catch {
    // safe fallback
  }

  await db.from("activity_logs").insert({
    actor_user_id: actorId,
    action_type: "office.account.archive",
    target_table: "admin_profiles",
    target_id: userId,
    metadata: { email: profile?.email },
  });
  return json({ ok: true, message: "Account archived successfully" });
}

async function handleSaveBusinessRule(db: ReturnType<typeof admin>, actorId: string, p: Record<string, unknown>) {
  const ruleKey = String(p.rule_key ?? "").trim().toLowerCase();
  const ruleValue = p.rule_value;
  const description = p.description ? String(p.description) : `System configuration rule: ${ruleKey}`;

  if (!ruleKey || ruleKey.length < 2) {
    return json({ error: "Invalid rule_key parameter." }, 400);
  }
  if (!ruleValue || typeof ruleValue !== "object") {
    return json({ error: "Invalid rule_value: must be a valid JSON object." }, 400);
  }

  const { data: actorUser } = await db.auth.admin.getUserById(actorId);
  const actorEmail = actorUser?.user?.email ?? "super_admin";

  const { data, error } = await db
    .from("business_rules")
    .upsert(
      {
        rule_key: ruleKey,
        rule_value: ruleValue,
        description: description,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "rule_key" }
    )
    .select()
    .single();

  if (error) {
    console.error("Failed to upsert business_rules in office-accounts:", error);
    return json({ error: "Database error persisting business rule configuration." }, 500);
  }

  // Atomic audit log
  await db.from("activity_logs").insert({
    actor_user_id: actorId,
    actor_email: actorEmail,
    action_type: "business_rules.update",
    target_table: "business_rules",
    target_id: ruleKey,
    metadata: {
      rule_key: ruleKey,
      description: description,
      updated_at: data.updated_at,
    },
  });

  return json({ ok: true, data });
}

async function handleGetBusinessRule(db: ReturnType<typeof admin>, p: Record<string, unknown>) {
  const ruleKey = String(p.rule_key ?? "").trim().toLowerCase();
  if (!ruleKey) return json({ error: "Missing rule_key." }, 400);

  const { data, error } = await db
    .from("business_rules")
    .select("*")
    .eq("rule_key", ruleKey)
    .maybeSingle();

  if (error) return json({ error: error.message }, 500);
  return json({ ok: true, data });
}

async function handleUpdateMasterData(db: ReturnType<typeof admin>, actorId: string, payload: Record<string, unknown>) {
  const id = payload.id as string;
  if (!id) return json({ error: "Missing master data id" }, 400);

  const updates: Record<string, unknown> = {};
  if ("is_active" in payload) updates.is_active = Boolean(payload.is_active);
  if ("label" in payload && typeof payload.label === "string") updates.label = payload.label.trim();
  if ("label_bn" in payload) updates.label_bn = payload.label_bn ? String(payload.label_bn).trim() : null;
  if ("parent_code" in payload) updates.parent_code = payload.parent_code ? String(payload.parent_code).trim() : null;
  if ("sort_order" in payload) updates.sort_order = Number(payload.sort_order) || 0;

  const { data, error } = await db
    .from("master_data")
    .update(updates)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) return json({ error: error.message }, 500);

  // Log activity
  await db.from("activity_logs").insert({
    actor_user_id: actorId,
    action_type: "master_data.update",
    target_table: "master_data",
    target_id: id,
    metadata: updates,
  });

  return json({ success: true, item: data });
}

async function handleSaveMasterData(db: ReturnType<typeof admin>, actorId: string, payload: Record<string, unknown>) {
  const category = payload.category as string;
  const code = payload.code as string;
  const label = payload.label as string;
  if (!category || !code || !label) return json({ error: "Missing required fields" }, 400);

  const itemData = {
    category,
    code,
    label: label.trim(),
    label_bn: payload.label_bn ? String(payload.label_bn).trim() : null,
    parent_code: payload.parent_code ? String(payload.parent_code).trim() : null,
    sort_order: Number(payload.sort_order) || 0,
    is_active: payload.is_active !== false,
  };

  const { data, error } = await db
    .from("master_data")
    .upsert(itemData, { onConflict: "category,code" })
    .select()
    .maybeSingle();

  if (error) return json({ error: error.message }, 500);

  await db.from("activity_logs").insert({
    actor_user_id: actorId,
    action_type: "master_data.create",
    target_table: "master_data",
    target_id: `${category}:${code}`,
    metadata: itemData,
  });

  return json({ success: true, item: data });
}

async function handleDeleteMasterData(db: ReturnType<typeof admin>, actorId: string, payload: Record<string, unknown>) {
  const id = payload.id as string;
  if (!id) return json({ error: "Missing id" }, 400);

  const { error } = await db.from("master_data").delete().eq("id", id);
  if (error) return json({ error: error.message }, 500);

  await db.from("activity_logs").insert({
    actor_user_id: actorId,
    action_type: "master_data.delete",
    target_table: "master_data",
    target_id: id,
  });

  return json({ success: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const guard = await requireSuperAdmin(req);
    if ("error" in guard && guard.error) return guard.error;
    const { db, actor } = guard as { db: ReturnType<typeof admin>; actor: { id: string } };

    const body = await req.json();
    const action = body?.action;
    const payload = (body?.payload ?? {}) as Record<string, unknown>;

    if (action === "create") return await handleCreate(db, actor.id, payload as Record<string, string>);
    if (action === "reset_password") return await handleResetPassword(db, actor.id, payload as Record<string, string>);
    if (action === "set_login_method") return await handleSetLoginMethod(db, actor.id, payload as Record<string, string>);
    if (action === "set_role") return await handleSetRole(db, actor.id, payload);
    if (action === "set_status") return await handleSetStatus(db, actor.id, payload);
    if (action === "set_service_scope") return await handleSetServiceScope(db, actor.id, payload);
    if (action === "archive") return await handleArchive(db, actor.id, payload);
    if (action === "save_business_rule") return await handleSaveBusinessRule(db, actor.id, payload);
    if (action === "get_business_rule") return await handleGetBusinessRule(db, payload);
    if (action === "update_master_data") return await handleUpdateMasterData(db, actor.id, payload);
    if (action === "save_master_data") return await handleSaveMasterData(db, actor.id, payload);
    if (action === "delete_master_data") return await handleDeleteMasterData(db, actor.id, payload);
    return json({ error: "Unknown action." }, 400);
  } catch (err) {
    console.error("office-accounts error", err);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
