import { Link, useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { BackButton } from "@/components/BackButton";
import { Eye, EyeOff } from "lucide-react";
import PublicShell from "./PublicShell";
import { toast } from "sonner";

const demoProfile = {
  name: "Sri Ramen Biswas",
  guardian: "Late Nikhil Biswas",
  dob: "1988-04-12",
  gender: "Male",
  village: "Stationpara",
  po: "Bagula",
  gp: "Bagula 2 No. GP",
  block: "Hanskhali",
  district: "Nadia",
  pin: "741502",
  mobile: "98XXXXXX12",
  email: "ramen.biswas@example.com",
  username: "ramen.biswas",
};

const tabs = [
  { to: "/public/profile", label: "My Profile" },
  { to: "/public/profile/edit", label: "Edit Profile" },
  { to: "/public/profile/password", label: "Change Password" },
  { to: "/public/profile/language", label: "Language" },
];

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return (
    <PublicShell>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
        <BackButton fallbackUrl="/public/dashboard" label="Back to Dashboard" className="-ml-2" />
        <h1 className="text-2xl font-bold">Profile & Settings</h1>
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <Link key={t.to} to={t.to}
              className={`rounded-full px-3 py-1.5 text-xs border transition ${
                pathname === t.to ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"
              }`}>
              {t.label}
            </Link>
          ))}
        </div>
        {children}
      </div>
    </PublicShell>
  );
}

export function MyProfile() {
  return (
    <Layout>
      <Helmet><title>My Profile — Bagula II Gram Panchayat</title></Helmet>
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary grid place-items-center text-xl font-bold">RB</div>
          <div>
            <p className="font-semibold">{demoProfile.name}</p>
            <p className="text-xs text-muted-foreground">Citizen ID: BGL2-CIT-000128 (sample)</p>
          </div>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Personal</h2>
          <Row label="Guardian's Name" value={demoProfile.guardian} />
          <Row label="Date of Birth" value={demoProfile.dob} />
          <Row label="Gender" value={demoProfile.gender} />
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Address</h2>
          <Row label="Village" value={demoProfile.village} />
          <Row label="Post Office" value={demoProfile.po} />
          <Row label="Gram Panchayat" value={demoProfile.gp} />
          <Row label="Block" value={demoProfile.block} />
          <Row label="District" value={demoProfile.district} />
          <Row label="PIN Code" value={demoProfile.pin} />
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Contact</h2>
          <Row label="Mobile" value={demoProfile.mobile} />
          <Row label="Email" value={demoProfile.email} />
          <Row label="Username" value={demoProfile.username} />
        </div>
      </Card>
    </Layout>
  );
}

export function EditProfile() {
  return (
    <Layout>
      <Helmet><title>Edit Profile — Bagula II Gram Panchayat</title></Helmet>
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold">Edit Profile / প্রোফাইল সম্পাদনা</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Full Name"><Input defaultValue={demoProfile.name} /></Field>
          <Field label="Guardian's Name"><Input defaultValue={demoProfile.guardian} /></Field>
          <Field label="Date of Birth"><Input type="date" defaultValue={demoProfile.dob} /></Field>
          <Field label="Gender"><Input defaultValue={demoProfile.gender} /></Field>
          <Field label="Village"><Input defaultValue={demoProfile.village} /></Field>
          <Field label="Post Office"><Input defaultValue={demoProfile.po} /></Field>
          <Field label="Gram Panchayat"><Input value={demoProfile.gp} readOnly className="bg-muted" /></Field>
          <Field label="Block"><Input defaultValue={demoProfile.block} /></Field>
          <Field label="District"><Input defaultValue={demoProfile.district} /></Field>
          <Field label="PIN Code"><Input defaultValue={demoProfile.pin} /></Field>
          <Field label="Mobile"><Input defaultValue={demoProfile.mobile} /></Field>
          <Field label="Email"><Input defaultValue={demoProfile.email} /></Field>
        </div>
        <Button onClick={() => toast.success("Profile saved (demo only)")}>Save Changes</Button>
      </Card>
    </Layout>
  );
}

export function ChangePassword() {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPw) {
      toast.error("Please enter your current password.");
      return;
    }
    if (newPw.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (newPw !== confirmPw) {
      toast.error("New password and confirm password do not match.");
      return;
    }
    toast.success("Password updated successfully.");
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
  };

  return (
    <Layout>
      <Helmet><title>Change Password — Bagula II Gram Panchayat</title></Helmet>
      <Card className="p-5 space-y-4 max-w-md">
        <h2 className="font-semibold">Change Password / পাসওয়ার্ড পরিবর্তন</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Current Password">
            <div className="relative">
              <Input
                type={showCurrent ? "text" : "password"}
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="Current password"
                className="pr-11"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                aria-label={showCurrent ? "Hide current password" : "Show current password"}
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:text-foreground"
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>
          <Field label="New Password">
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="At least 8 characters"
                className="pr-11"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                aria-label={showNew ? "Hide new password" : "Show new password"}
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:text-foreground"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>
          <Field label="Confirm New Password">
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Re-enter new password"
                className="pr-11"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>
          <Button type="submit">Update Password</Button>
        </form>
      </Card>
    </Layout>
  );
}

export function LanguagePreference() {
  const [lang, setLang] = useState("en");
  return (
    <Layout>
      <Helmet><title>Language Preference — Bagula II Gram Panchayat</title></Helmet>
      <Card className="p-5 space-y-4 max-w-md">
        <h2 className="font-semibold">Language Preference / ভাষা নির্বাচন</h2>
        <RadioGroup value={lang} onValueChange={setLang} className="space-y-2">
          <label className="flex items-center gap-3 rounded-xl border p-3 cursor-pointer">
            <RadioGroupItem value="en" id="lang-en" />
            <span className="text-sm">English</span>
          </label>
          <label className="flex items-center gap-3 rounded-xl border p-3 cursor-pointer">
            <RadioGroupItem value="bn" id="lang-bn" />
            <span className="text-sm">বাংলা (Bengali)</span>
          </label>
        </RadioGroup>
        <Button onClick={() => toast.success("Language preference saved (demo only)")}>Save Preference</Button>
      </Card>
    </Layout>
  );
}
