import { cloneElement, isValidElement, useId, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Copy, Eye, EyeOff, Info, Loader2, MapPin, RefreshCw,
} from "lucide-react";
import { JURISDICTION, POST_OFFICES, VILLAGES, resolvePostOffice } from "@/lib/masterData";
import { registerCitizen } from "@/modules/citizen/citizenAuth";
import { toast } from "@/hooks/use-toast";
import PublicShell from "./PublicShell";

const steps = [
  { title: "Personal Info", hint: "Identity details" },
  { title: "Address", hint: "Village & Post Office" },
  { title: "Contact", hint: "Mobile & Email" },
  { title: "Credentials", hint: "Password & Declaration" },
  { title: "Done", hint: "Your Citizen ID" },
];

type FormState = Record<string, string>;

const initialForm: FormState = {
  prefix: "", first_name: "", middle_name: "", last_name: "", guardian_name: "", mother_name: "",
  date_of_birth: "", gender: "", marital_status: "", occupation: "",
  epic_no: "", pan_no: "", aadhaar_last4: "",
  village: "", post_office: "", pin_code: JURISDICTION.pin,
  mobile: "", alternate_mobile: "", email: "",
  password: "", confirm_password: "",
};

function Field({
  label, htmlFor, required, hint, children,
}: {
  label: string; htmlFor?: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  const generatedId = useId();
  const id = htmlFor ?? generatedId;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {!htmlFor && isValidElement(children)
        ? cloneElement(children as React.ReactElement<{ id?: string }>, { id })
        : children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function makeCaptcha() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const array = new Uint8Array(5);
  window.crypto.getRandomValues(array);

  let result = "";
  for (let i = 0; i < 5; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}

export { makeCaptcha };

function passwordScore(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

export default function PublicRegister() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [poAuto, setPoAuto] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [captcha, setCaptcha] = useState(makeCaptcha);
  const [captchaInput, setCaptchaInput] = useState("");
  const [declared, setDeclared] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [citizenId, setCitizenId] = useState("");
  const navigate = useNavigate();

  const set = (key: string) => (v: string) => setForm((f) => ({ ...f, [key]: v }));
  const onInput = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => set(key)(e.target.value);

  const score = useMemo(() => passwordScore(form.password), [form.password]);
  const strengthLabel = ["Very weak", "Weak", "Fair", "Good", "Strong"][score];

  const onVillageChange = (v: string) => {
    const po = resolvePostOffice(v);
    setForm((f) => ({ ...f, village: v, post_office: po || f.post_office }));
    if (po) setPoAuto(true);
  };

  const stepError = (): string | null => {
    if (step === 0) {
      if (!form.first_name.trim() || !form.last_name.trim()) return "Please enter your first and last name.";
      if (!form.guardian_name.trim()) return "Please enter your father's / husband's / guardian's name.";
      if (!form.date_of_birth) return "Please enter your date of birth.";
      if (!form.gender) return "Please select your gender.";
      if (!form.epic_no.trim()) return "Voter ID (EPIC No.) is required.";
      if (form.aadhaar_last4 && !/^[0-9]{4}$/.test(form.aadhaar_last4))
        return "Please enter only the last 4 digits of your Aadhaar.";
    }
    if (step === 1) {
      if (!form.village) return "Please select your village.";
      if (!form.post_office) return "Please select your post office.";
      if (!/^[0-9]{6}$/.test(form.pin_code)) return "Please enter a valid 6-digit PIN code.";
    }
    if (step === 2) {
      if (!/^[6-9][0-9]{9}$/.test(form.mobile)) return "Please enter a valid 10-digit mobile number.";
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        return "Please enter a valid email address.";
    }
    if (step === 3) {
      if (form.password.length < 8) return "Password must be at least 8 characters.";
      if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password))
        return "Password must contain both letters and numbers.";
      if (form.password !== form.confirm_password) return "The two passwords do not match.";
      if (captchaInput.trim().toUpperCase() !== captcha) return "The security code does not match.";
      if (!declared) return "Please confirm the declaration to continue.";
    }
    return null;
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const { citizen_id } = await registerCitizen({
        prefix: form.prefix, first_name: form.first_name, middle_name: form.middle_name,
        last_name: form.last_name, guardian_name: form.guardian_name, mother_name: form.mother_name,
        date_of_birth: form.date_of_birth, gender: form.gender, marital_status: form.marital_status,
        occupation: form.occupation, village: form.village, post_office: form.post_office,
        pin_code: form.pin_code, mobile: form.mobile, alternate_mobile: form.alternate_mobile,
        email: form.email, epic_no: form.epic_no, pan_no: form.pan_no,
        aadhaar_last4: form.aadhaar_last4, password: form.password,
      });
      setCitizenId(citizen_id);
      setStep(4);
    } catch (err) {
      toast({
        title: "Registration could not be completed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    const err = stepError();
    if (err) {
      toast({ title: "Please check this step", description: err, variant: "destructive" });
      return;
    }
    if (step === 3) { void submit(); return; }
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <PublicShell>
      <Helmet>
        <title>Citizen Registration — Bagula II Gram Panchayat</title>
        <meta name="description" content="Create a citizen account on the Bagula II Gram Panchayat Public Citizen Portal." />
        <link rel="canonical" href="https://deo-workflow-helper.lovable.app/public/register" />
        <meta property="og:title" content="Citizen Registration — Bagula II Gram Panchayat" />
        <meta property="og:description" content="Register in a few simple steps to apply for and track Gram Panchayat certificates online." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://deo-workflow-helper.lovable.app/public/register" />
      </Helmet>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Citizen Registration</h1>
          <p className="text-sm text-muted-foreground">
            নাগরিক নিবন্ধন — কয়েকটি সহজ ধাপে আপনার অ্যাকাউন্ট তৈরি করুন
          </p>
        </div>

        {/* Step tracker */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {steps.slice(0, 4).map((s, i) => {
            const active = i === step;
            const done = i < step;
            return (
              <div
                key={s.title}
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${
                  active ? "border-primary bg-primary/5" : done ? "bg-muted/50" : "bg-card"
                }`}
              >
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                    active || done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </div>
                <div className="min-w-0">
                  <p className={`truncate text-xs font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>
                    {s.title}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">{s.hint}</p>
                </div>
              </div>
            );
          })}
        </div>

        <Card className="p-5 space-y-4">
          {step === 0 && (
            <>
              <h2 className="font-semibold">Personal Information / ব্যক্তিগত তথ্য</h2>
              <p className="text-xs text-muted-foreground">
                সরকারি নথিতে যেভাবে লেখা আছে সেভাবেই তথ্য দিন।
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Prefix" htmlFor="reg-prefix">
                  <Select value={form.prefix} onValueChange={set("prefix")}>
                    <SelectTrigger id="reg-prefix"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sri">Sri</SelectItem>
                      <SelectItem value="Smt.">Smt.</SelectItem>
                      <SelectItem value="Md.">Md.</SelectItem>
                      <SelectItem value="Ms.">Ms.</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="First Name" required>
                  <Input placeholder="First name" value={form.first_name} onChange={onInput("first_name")} />
                </Field>
                <Field label="Middle Name (optional)">
                  <Input placeholder="Middle name" value={form.middle_name} onChange={onInput("middle_name")} />
                </Field>
                <Field label="Last Name" required>
                  <Input placeholder="Last name" value={form.last_name} onChange={onInput("last_name")} />
                </Field>
                <Field label="Father's / Husband's / Guardian's Name" required>
                  <Input placeholder="Guardian name" value={form.guardian_name} onChange={onInput("guardian_name")} />
                </Field>
                <Field label="Mother's Name">
                  <Input placeholder="Mother's name" value={form.mother_name} onChange={onInput("mother_name")} />
                </Field>
                <Field label="Date of Birth" required>
                  <Input type="date" value={form.date_of_birth} onChange={onInput("date_of_birth")} />
                </Field>
                <Field label="Gender" required htmlFor="reg-gender">
                  <Select value={form.gender} onValueChange={set("gender")}>
                    <SelectTrigger id="reg-gender"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Marital Status" htmlFor="reg-marital">
                  <Select value={form.marital_status} onValueChange={set("marital_status")}>
                    <SelectTrigger id="reg-marital"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married">Married</SelectItem>
                      <SelectItem value="widowed">Widowed</SelectItem>
                      <SelectItem value="divorced">Divorced</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Occupation (optional)">
                  <Input placeholder="e.g. Agriculture, Business, Service" value={form.occupation} onChange={onInput("occupation")} />
                </Field>
              </div>

              <div className="space-y-3 rounded-lg border bg-muted/40 p-3">
                <p className="text-xs font-medium">Identity Documents / পরিচয়পত্র</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field
                    label="Voter ID (EPIC No.) — preferred"
                    required
                    hint="এটিই আমাদের পছন্দের পরিচয়পত্র।"
                  >
                    <Input placeholder="e.g. WBG1234567" value={form.epic_no} onChange={onInput("epic_no")} />
                  </Field>
                  <Field label="PAN (optional)">
                    <Input placeholder="10-character PAN" maxLength={10} value={form.pan_no} onChange={onInput("pan_no")} />
                  </Field>
                  <Field
                    label="Masked Aadhaar — last 4 digits only (optional)"
                    hint="প্রথম ৮টি সংখ্যা লুকানো থাকে, শুধু শেষ ৪টি সংখ্যা দিন।"
                  >
                    <Input
                      placeholder="XXXX XXXX 1234"
                      inputMode="numeric"
                      maxLength={4}
                      value={form.aadhaar_last4}
                      onChange={(e) => set("aadhaar_last4")(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    />
                  </Field>
                </div>
                <div className="flex items-start gap-2 rounded-md border bg-card px-3 py-2">
                  <Info size={16} className="mt-0.5 text-primary shrink-0" />
                  <p className="text-[11px] text-muted-foreground">
                    A Masked Aadhaar hides the first 8 digits and shows only the last 4. Your Aadhaar
                    number is sensitive personal information — we never store the full number.
                  </p>
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="font-semibold">Address / ঠিকানা</h2>
              <div className="flex items-start gap-2 rounded-lg border bg-muted/50 px-3 py-2">
                <MapPin size={16} className="mt-0.5 text-primary shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{JURISDICTION.gramPanchayat}</span> · {JURISDICTION.block} Block · {JURISDICTION.district} · {JURISDICTION.state}
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Village" required htmlFor="reg-village">
                  <Select value={form.village} onValueChange={onVillageChange}>
                    <SelectTrigger id="reg-village"><SelectValue placeholder="Select your village" /></SelectTrigger>
                    <SelectContent>
                      {VILLAGES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field
                  label="Post Office"
                  required
                  htmlFor="reg-po"
                  hint={poAuto ? "Filled automatically from your village — you can change it." : undefined}
                >
                  <Select value={form.post_office} onValueChange={(v) => { set("post_office")(v); setPoAuto(false); }}>
                    <SelectTrigger id="reg-po"><SelectValue placeholder="Select post office" /></SelectTrigger>
                    <SelectContent>
                      {POST_OFFICES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Gram Panchayat">
                  <Input value={JURISDICTION.gramPanchayat} readOnly className="bg-muted" />
                </Field>
                <Field label="Block"><Input value={JURISDICTION.block} readOnly className="bg-muted" /></Field>
                <Field label="Police Station">
                  <Input value={JURISDICTION.policeStation} readOnly className="bg-muted" />
                </Field>
                <Field label="District"><Input value={JURISDICTION.district} readOnly className="bg-muted" /></Field>
                <Field label="State"><Input value={JURISDICTION.state} readOnly className="bg-muted" /></Field>
                <Field label="PIN Code" required>
                  <Input
                    value={form.pin_code}
                    inputMode="numeric"
                    maxLength={6}
                    onChange={(e) => set("pin_code")(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  />
                </Field>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="font-semibold">Contact Information / যোগাযোগ</h2>
              <p className="text-xs text-muted-foreground">
                আপনার মোবাইল নম্বর দিয়েই আপনি লগইন করতে পারবেন। ইমেল থাকলে দিন — না থাকলেও চলবে।
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Mobile Number" required hint="This becomes one of your login IDs.">
                  <Input
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="10-digit mobile"
                    value={form.mobile}
                    onChange={(e) => set("mobile")(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  />
                </Field>
                <Field label="Alternate Mobile (optional)">
                  <Input
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="Alternate mobile"
                    value={form.alternate_mobile}
                    onChange={(e) => set("alternate_mobile")(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  />
                </Field>
                <Field label="Email Address (optional)">
                  <Input type="email" placeholder="name@example.com" value={form.email} onChange={onInput("email")} />
                </Field>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="font-semibold">Login Credentials & Declaration / লগইন তথ্য ও ঘোষণা</h2>
              <p className="text-xs text-muted-foreground">
                You will be able to sign in with your Mobile Number, Citizen ID or Email.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Password" required htmlFor="reg-password">
                  <div className="relative">
                    <Input
                      id="reg-password"
                      type={showPass ? "text" : "password"}
                      placeholder="At least 8 characters"
                      className="pr-11"
                      autoComplete="new-password"
                      value={form.password}
                      onChange={onInput("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      aria-label={showPass ? "Hide password" : "Show password"}
                      className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:text-foreground"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </Field>
                <Field label="Confirm Password" required htmlFor="reg-confirm-password">
                  <div className="relative">
                    <Input
                      id="reg-confirm-password"
                      type={showConfirmPass ? "text" : "password"}
                      placeholder="Re-enter password"
                      className="pr-11"
                      autoComplete="new-password"
                      value={form.confirm_password}
                      onChange={onInput("confirm_password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass((v) => !v)}
                      aria-label={showConfirmPass ? "Hide confirm password" : "Show confirm password"}
                      className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </Field>
              </div>

              {form.password && (
                <div className="space-y-1">
                  <div className="h-1.5 w-full rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(score / 4) * 100}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">Password strength: {strengthLabel}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="reg-captcha" className="text-xs">
                  Security check / নিরাপত্তা যাচাই <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <span className="select-none rounded-md border bg-muted px-3 py-2 font-mono text-base tracking-[0.35em]">
                    {captcha}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Refresh security code"
                    className="min-h-11 min-w-11"
                    onClick={() => { setCaptcha(makeCaptcha()); setCaptchaInput(""); }}
                  >
                    <RefreshCw size={16} />
                  </Button>
                  <Input
                    id="reg-captcha"
                    className="max-w-[9rem]"
                    placeholder="Enter code"
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value)}
                  />
                </div>
              </div>

              <label htmlFor="reg-declaration" className="flex items-start gap-2.5 rounded-lg border bg-muted/40 p-3">
                <Checkbox
                  id="reg-declaration"
                  checked={declared}
                  onCheckedChange={(v) => setDeclared(v === true)}
                  className="mt-0.5"
                />
                <span className="text-xs text-muted-foreground">
                  I confirm that I live under {JURISDICTION.gramPanchayat} and that the information I
                  have given is true and complete.
                  <br />
                  আমি নিশ্চিত করছি যে আমার দেওয়া সব তথ্য সঠিক।
                </span>
              </label>
            </>
          )}

          {step === 4 && (
            <div className="text-center space-y-4 py-6">
              <CheckCircle2 className="mx-auto text-primary" size={44} />
              <h2 className="text-xl font-bold">Registration Successful</h2>
              <p className="text-sm text-muted-foreground">
                Your citizen account has been created.
                <br />
                আপনার নাগরিক অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে।
              </p>
              <div className="mx-auto max-w-sm rounded-xl border bg-muted/50 p-4 space-y-2">
                <p className="text-xs text-muted-foreground">Your permanent Citizen ID / আপনার নাগরিক আইডি</p>
                <p className="font-mono text-lg font-bold tracking-wide">{citizenId}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard?.writeText(citizenId);
                    toast({ title: "Citizen ID copied" });
                  }}
                >
                  <Copy size={14} className="mr-1" /> Copy
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  Keep it safe — you can sign in with your Citizen ID, mobile number or email.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Next step: upload your passport-size photograph within 30 days, otherwise new
                applications will be paused until your profile is complete.
              </p>
              <Button onClick={() => navigate("/public/login")} size="lg">Go to Login</Button>
            </div>
          )}

          {step < 4 && (
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={back} disabled={step === 0 || submitting}>
                <ArrowLeft size={16} className="mr-1" /> Back
              </Button>
              <Button onClick={next} disabled={submitting}>
                {submitting && <Loader2 size={16} className="mr-1 animate-spin" />}
                {step === 3 ? "Create Account" : "Next"}
                {!submitting && <ArrowRight size={16} className="ml-1" />}
              </Button>
            </div>
          )}
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Already have an account? <Link to="/public/login" className="text-primary underline">Login</Link>
        </p>
      </div>
    </PublicShell>
  );
}
