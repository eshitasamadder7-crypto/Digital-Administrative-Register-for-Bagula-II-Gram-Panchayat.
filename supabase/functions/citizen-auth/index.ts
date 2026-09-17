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

/** Citizens may register without a real email — derive a stable internal address. */
const syntheticEmail = (mobile: string) => `citizen.${mobile}@bagula2gp.local`;

const isMobile = (v: string) => /^[6-9][0-9]{9}$/.test(v);
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function passwordProblem(pw: string): string | null {
  if (!pw || pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Za-z]/.test(pw)) return "Password must contain a letter.";
  if (!/[0-9]/.test(pw)) return "Password must contain a number.";
  return null;
}

async function logActivity(
  db: ReturnType<typeof admin>,
  row: Record<string, unknown>,
  req: Request,
) {
  await db.from("citizen_activity_logs").insert({
    ...row,
    ip: req.headers.get("x-forwarded-for"),
    user_agent: req.headers.get("user-agent"),
  });
}

async function handleRegister(req: Request, payload: Record<string, string>) {
  const db = admin();
  const mobile = (payload.mobile ?? "").trim();
  const email = (payload.email ?? "").trim().toLowerCase();
  const password = payload.password ?? "";

  if (!payload.first_name?.trim() || !payload.last_name?.trim())
    return json({ error: "First name and last name are required." }, 400);
  if (!isMobile(mobile)) return json({ error: "Enter a valid 10-digit mobile number." }, 400);
  if (email && !isEmail(email)) return json({ error: "Enter a valid email address." }, 400);
  const pwErr = passwordProblem(password);
  if (pwErr) return json({ error: pwErr }, 400);

  const { data: existing } = await db
    .from("citizen_login_identifiers")
    .select("identifier")
    .in("identifier", email ? [mobile, email] : [mobile]);
  if (existing && existing.length > 0)
    return json({ error: "An account already exists with this mobile number or email." }, 409);

  const authEmail = email || syntheticEmail(mobile);

  const { data: created, error: createErr } = await db.auth.admin.createUser({
    email: authEmail,
    password,
    email_confirm: true,
    user_metadata: { citizen: true, mobile, display_name: `${payload.first_name} ${payload.last_name}` },
  });
  if (createErr || !created.user)
    return json({ error: createErr?.message ?? "Could not create the account." }, 400);

  const userId = created.user.id;

  const { data: profile, error: profileErr } = await db
    .from("citizen_profiles")
    .insert({
      user_id: userId,
      prefix: payload.prefix || null,
      first_name: payload.first_name.trim(),
      middle_name: payload.middle_name || null,
      last_name: payload.last_name.trim(),
      guardian_name: payload.guardian_name || null,
      mother_name: payload.mother_name || null,
      date_of_birth: payload.date_of_birth || null,
      gender: payload.gender || null,
      marital_status: payload.marital_status || null,
      occupation: payload.occupation || null,
      village: payload.village || null,
      post_office: payload.post_office || null,
      pin_code: payload.pin_code || null,
      mobile,
      alternate_mobile: payload.alternate_mobile || null,
      email: email || null,
      epic_no: payload.epic_no || null,
      pan_no: payload.pan_no || null,
      aadhaar_last4: /^[0-9]{4}$/.test(payload.aadhaar_last4 ?? "") ? payload.aadhaar_last4 : null,
      preferred_language: payload.preferred_language || "en",
    })
    .select("citizen_id")
    .single();

  if (profileErr || !profile) {
    await db.auth.admin.deleteUser(userId);
    return json({ error: profileErr?.message ?? "Could not save the profile." }, 400);
  }

  const identifiers = [mobile, profile.citizen_id.toLowerCase()];
  if (email) identifiers.push(email);
  await db.from("citizen_login_identifiers").insert(
    identifiers.map((identifier) => ({ identifier, user_id: userId, auth_email: authEmail })),
  );

  await db.from("citizen_account_health").insert({ user_id: userId });

  await db.from("citizen_notifications").insert([
    {
      user_id: userId,
      kind: "profile_incomplete",
      title: "Complete your profile / প্রোফাইল সম্পূর্ণ করুন",
      body: "Please upload your passport-size photograph and Voter ID (EPIC) details within 30 days.",
      action_label: "Complete profile",
      action_href: "/public/profile/complete",
      requires_action: true,
    },
    {
      user_id: userId,
      kind: "general",
      title: "Welcome to Bagula II Gram Panchayat",
      body: `Your Citizen ID is ${profile.citizen_id}. Please keep it safe — you can use it to sign in.`,
    },
  ]);

  await logActivity(
    db,
    { user_id: userId, citizen_id: profile.citizen_id, action_type: "citizen_account_created" },
    req,
  );

  return json({ citizen_id: profile.citizen_id, auth_email: authEmail });
}

async function handleLogin(req: Request, payload: Record<string, string>) {
  const db = admin();
  const identifier = (payload.identifier ?? "").trim().toLowerCase();
  const password = payload.password ?? "";
  if (!identifier || !password) return json({ error: "Enter your ID and password." }, 400);

  const { data: match } = await db
    .from("citizen_login_identifiers")
    .select("user_id, auth_email")
    .eq("identifier", identifier)
    .maybeSingle();

  if (!match) return json({ error: "We could not find an account with those details." }, 401);

  const { data: health } = await db
    .from("citizen_account_health")
    .select("health")
    .eq("user_id", match.user_id)
    .maybeSingle();
  if (health?.health === "suspended") {
    await logActivity(
      db,
      { user_id: match.user_id, action_type: "citizen_login_blocked", metadata: { reason: "suspended" } },
      req,
    );
    return json({ error: "This account is currently suspended. Please contact the Panchayat office." }, 403);
  }

  const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: signIn, error: signInErr } = await anon.auth.signInWithPassword({
    email: match.auth_email,
    password,
  });

  if (signInErr || !signIn.session) {
    await logActivity(db, { user_id: match.user_id, action_type: "citizen_login_failed" }, req);
    return json({ error: "Incorrect password. Please try again." }, 401);
  }

  await logActivity(db, { user_id: match.user_id, action_type: "citizen_login_success" }, req);

  return json({
    access_token: signIn.session.access_token,
    refresh_token: signIn.session.refresh_token,
  });
}

async function resolveAuthUser(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data, error } = await anon.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

async function handleCreateDraft(req: Request, payload: Record<string, unknown>) {
  const user = await resolveAuthUser(req);
  if (!user) return json({ error: "Not authenticated." }, 401);

  const db = admin();
  const userId = user.id;
  const kind = String(payload.kind || "warish");
  const draftData = payload.data ?? {};
  const applicantName = String(payload.applicant_name ?? "");
  const deceasedName = String(payload.deceased_name ?? "");
  const village = payload.village ? String(payload.village) : null;
  const mobile = payload.contact_mobile ? String(payload.contact_mobile) : null;
  const email = payload.contact_email ? String(payload.contact_email) : null;
  const parentId = payload.parent_application_id ? String(payload.parent_application_id) : null;
  const isCitizen = Boolean(payload.citizen ?? false);

  const verificationId = `${kind.slice(0, 3).toUpperCase()}-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

  const rowPayload: Record<string, unknown> = {
    verification_id: verificationId,
    memo_no: null,
    cert_date: null,
    status: "Draft",
    applicant_name: applicantName,
    village: village,
    data: draftData,
    created_by: userId,
    contact_mobile: mobile,
    contact_email: email,
  };

  if (isCitizen) {
    rowPayload.citizen_user_id = userId;
    rowPayload.source = "public";
    rowPayload.public_edit_until = new Date(Date.now() + 3 * 86400000).toISOString();
    rowPayload.parent_application_id = parentId;
  }

  const table = kind === "warish" ? "warish_certificates" : kind === "dependent" ? "dependent_certificates" : "linkage_certificates";
  if (kind === "warish") {
    rowPayload.deceased_name = deceasedName;
  } else if (kind === "dependent") {
    rowPayload.department = payload.department ?? null;
  } else {
    rowPayload.relationship_type = payload.relationship_type ?? "w/o";
    rowPayload.guardian_name = payload.guardian_name ?? "";
    rowPayload.assembly_constituency = payload.assembly_constituency ?? "Hanskhali";
    rowPayload.voter_status = payload.voter_status ?? "Active";
    rowPayload.document_mode = "DOCUMENT_ENGINE";
  }

  const { data: row, error } = await db.from(table).insert(rowPayload).select("id").single();
  if (error || !row) {
    console.error("handleCreateDraft error:", error);
    return json({ error: error?.message ?? "Failed to create draft" }, 500);
  }
  return json({ ok: true, id: row.id });
}

async function handleSaveDraft(req: Request, payload: Record<string, unknown>) {
  const user = await resolveAuthUser(req);
  if (!user) return json({ error: "Not authenticated." }, 401);

  const db = admin();
  const id = String(payload.id ?? "");
  const kind = String(payload.kind || "warish");
  const draftData = payload.data ?? {};
  const applicantName = String(payload.applicant_name ?? "");
  const deceasedName = String(payload.deceased_name ?? "");
  const village = payload.village ? String(payload.village) : null;
  const mobile = payload.contact_mobile ? String(payload.contact_mobile) : null;
  const email = payload.contact_email ? String(payload.contact_email) : null;

  if (!id) return json({ error: "Missing draft ID." }, 400);

  const table = kind === "warish" ? "warish_certificates" : kind === "dependent" ? "dependent_certificates" : "linkage_certificates";

  const updatePayload: Record<string, unknown> = {
    applicant_name: applicantName,
    village: village,
    contact_mobile: mobile,
    contact_email: email,
    data: draftData,
  };

  if (kind === "warish") {
    updatePayload.deceased_name = deceasedName;
  } else if (kind === "dependent") {
    updatePayload.department = payload.department ?? null;
  }

  const { error } = await db.from(table).update(updatePayload).eq("id", id);
  if (error) {
    console.error("handleSaveDraft error:", error);
    return json({ error: error.message }, 500);
  }
  return json({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const action = body?.action;
    const payload = (body?.payload ?? {}) as Record<string, unknown>;
    if (action === "register") return await handleRegister(req, payload as Record<string, string>);
    if (action === "login") return await handleLogin(req, payload as Record<string, string>);
    if (action === "create_draft") return await handleCreateDraft(req, payload);
    if (action === "save_draft") return await handleSaveDraft(req, payload);
    return json({ error: "Unknown action." }, 400);
  } catch (err) {
    console.error("citizen-auth error", err);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
