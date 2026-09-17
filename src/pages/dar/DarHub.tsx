import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Building2, ShieldCheck, ArrowLeft, Construction, Laptop, Crown, Wrench, LogIn } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { cn } from "@/lib/utils";


type View =
  | "home"
  | "public-login"
  | "office"
  | "office-deo"
  | "office-super-admin"
  | "office-staff"
  | "verification";

const primaryCards = [
  {
    id: "public-login" as const,
    title: "Public Login",
    subtitle: "Citizen services & applications",
    icon: User,
    accent: "from-[hsl(var(--saffron))] to-[hsl(var(--saffron)/0.7)]",
  },
  {
    id: "office" as const,
    title: "Office Login",
    subtitle: "Panchayat staff & administration",
    icon: Building2,
    accent: "from-[hsl(var(--navy))] to-[hsl(var(--navy)/0.75)]",
  },
  {
    id: "verification" as const,
    title: "Verification",
    subtitle: "Verify certificates & records",
    icon: ShieldCheck,
    accent: "from-[hsl(var(--gov-green))] to-[hsl(var(--gov-green)/0.75)]",
  },
];

const officeRoles = [
  { id: "office-deo" as const, title: "DEO", subtitle: "Data Entry Operator", icon: Laptop },
  { id: "office-super-admin" as const, title: "Super Admin", subtitle: "Full control", icon: Crown },
  { id: "office-staff" as const, title: "Staff", subtitle: "Departmental staff", icon: Wrench },
];

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/40">
      <header className="border-b border-border/60 bg-[hsl(var(--navy))] text-[hsl(var(--gov-white))]">
        <div className="mx-auto max-w-5xl px-4 py-6 text-center">
          <div className="mx-auto mb-2 h-1 w-24 rounded-full bg-gradient-to-r from-[hsl(var(--saffron))] via-white to-[hsl(var(--gov-green))]" />
          <h1 className="font-[var(--font-heading)] text-2xl font-bold tracking-wide sm:text-3xl">
            Bagula Panchayat Hub
          </h1>
          <p className="mt-1 text-xs uppercase tracking-[0.25em] text-white/70 sm:text-sm">
            Digital Administrative Register (DAR)
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">{children}</main>
      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        <Link to="/" className="underline underline-offset-4 hover:text-foreground">
          Return to main site
        </Link>
      </footer>
    </div>
  );
}

function BackBar({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> {label}
    </button>
  );
}

function ComingSoon({ icon: Icon, title, message }: { icon: typeof Construction; title: string; message: string }) {
  return (
    <div className="mx-auto max-w-lg animate-fade-in rounded-2xl border border-border/60 bg-card p-10 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Icon className="h-8 w-8 text-[hsl(var(--saffron))]" />
      </div>
      <h2 className="font-[var(--font-heading)] text-2xl font-bold text-foreground">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function BigCard({
  onClick,
  title,
  subtitle,
  icon: Icon,
  accent,
}: {
  onClick: () => void;
  title: string;
  subtitle: string;
  icon: typeof User;
  accent?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex w-full flex-col items-start gap-3 overflow-hidden rounded-2xl border border-border/70 bg-card p-6 text-left shadow-sm transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
      )}
    >
      <div
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md transition-transform duration-300 group-hover:scale-110",
          accent ?? "from-[hsl(var(--navy))] to-[hsl(var(--navy)/0.75)]",
        )}
      >
        <Icon className="h-7 w-7" />
      </div>
      <div>
        <h3 className="font-[var(--font-heading)] text-xl font-bold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-[hsl(var(--saffron))] via-white to-[hsl(var(--gov-green))] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </button>
  );
}

export default function DarHub() {
  const [view, setView] = useState<View>("home");
  const navigate = useNavigate();

  const goToOfficeLogin = (roleHint: string) => {
    // Existing login flow detects the actual role from the database.
    // roleHint is passed only so the sign-in page can show a friendly label.
    navigate(`/admin?role=${roleHint}`);
  };

  return (
    <Shell>
      <Helmet>
        <title>Digital Administrative Register — Bagula II Gram Panchayat</title>
        <meta name="description" content="Entry point to the Digital Administrative Register of Bagula II Gram Panchayat — choose the citizen, office or verification section to continue." />
        <link rel="canonical" href="https://bagula2gp.lovable.app/dar" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://bagula2gp.lovable.app/dar" />
        <meta property="og:title" content="Digital Administrative Register — Bagula II Gram Panchayat" />
        <meta property="og:description" content="Choose the citizen, office or verification section of the Bagula II Gram Panchayat Digital Administrative Register." />
        <meta name="twitter:title" content="Digital Administrative Register — Bagula II Gram Panchayat" />
        <meta name="twitter:description" content="Choose the citizen, office or verification section of the Bagula II Gram Panchayat Digital Administrative Register." />
      </Helmet>

      {view === "home" && (
        <div className="animate-fade-in">
          <div className="mb-8 text-center">
            <h2 className="font-[var(--font-heading)] text-2xl font-bold text-foreground sm:text-3xl">
              Choose a section
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Select where you want to go in the Digital Administrative Register.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {primaryCards.map((c) => (
              <BigCard
                key={c.id}
                onClick={() => setView(c.id)}
                title={c.title}
                subtitle={c.subtitle}
                icon={c.icon}
                accent={c.accent}
              />
            ))}
          </div>
        </div>
      )}

      {view === "public-login" && (
        <div>
          <BackBar onClick={() => setView("home")} label="Back to hub" />
          <ComingSoon
            icon={Construction}
            title="Public Login"
            message="Citizen self-service login is coming soon. In the meantime, use the Verification section or contact the Panchayat office."
          />
        </div>
      )}

      {view === "office" && (
        <div className="animate-fade-in">
          <BackBar onClick={() => setView("home")} label="Back to hub" />
          <div className="mb-8 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(var(--navy))] to-[hsl(var(--navy)/0.75)] text-white shadow-sm">
              <LogIn className="h-6 w-6" />
            </div>
            <h2 className="font-[var(--font-heading)] text-2xl font-bold text-foreground sm:text-3xl">
              Office Login
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Select your role to continue. Sign in with your authorized Google account or the email &amp; password issued by Admin Management.
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Accounts are provisioned and managed by the Super Admin from Admin Management.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {officeRoles.map((r) => (
              <BigCard
                key={r.id}
                onClick={() => setView(r.id)}
                title={r.title}
                subtitle={r.subtitle}
                icon={r.icon}
              />
            ))}
          </div>
        </div>
      )}

      {view === "office-deo" && (
        <RoleGate
          onBack={() => setView("office")}
          title="Data Entry Operator"
          subtitle="Sign in to access the DEO dashboard — Public Entry, Office Entry, Warish, Dependent, and Workflow."
          icon={Laptop}
          onContinue={() => goToOfficeLogin("deo")}
        />
      )}

      {view === "office-super-admin" && (
        <RoleGate
          onBack={() => setView("office")}
          title="Super Admin"
          subtitle="Sign in to access Approvals, Rejections, User Management, and Workflow."
          icon={Crown}
          onContinue={() => goToOfficeLogin("super_admin")}
        />
      )}

      {view === "office-staff" && (
        <RoleGate
          onBack={() => setView("office")}
          title="Staff"
          subtitle="Sign in to access the Staff dashboard."
          icon={Wrench}
          onContinue={() => goToOfficeLogin("staff")}
        />
      )}

      {view === "verification" && (
        <div>
          <BackBar onClick={() => setView("home")} label="Back to hub" />
          <div className="mx-auto max-w-lg animate-fade-in rounded-2xl border border-border/60 bg-card p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <ShieldCheck className="h-8 w-8 text-[hsl(var(--gov-green))]" />
            </div>
            <h2 className="font-[var(--font-heading)] text-2xl font-bold text-foreground">Verification</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Verify certificates and records issued by Bagula II Gram Panchayat.
            </p>
            <Link
              to="/verify"
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-[hsl(var(--navy))] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[hsl(var(--navy)/0.9)]"
            >
              Open Verification →
            </Link>
          </div>
        </div>
      )}
    </Shell>
  );
}

function RoleGate({
  onBack,
  title,
  subtitle,
  icon: Icon,
  onContinue,
}: {
  onBack: () => void;
  title: string;
  subtitle: string;
  icon: typeof User;
  onContinue: () => void;
}) {
  return (
    <div>
      <BackBar onClick={onBack} label="Back to office" />
      <div className="mx-auto max-w-lg animate-fade-in rounded-2xl border border-border/60 bg-card p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(var(--navy))] to-[hsl(var(--navy)/0.75)] text-white">
          <Icon className="h-8 w-8" />
        </div>
        <h2 className="font-[var(--font-heading)] text-2xl font-bold text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        <button
          onClick={onContinue}
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-[hsl(var(--navy))] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[hsl(var(--navy)/0.9)]"
        >
          Continue to sign in →
        </button>
        <p className="mt-3 text-xs text-muted-foreground">
          Your actual role is verified after sign-in and you'll be routed to the correct dashboard automatically.
        </p>
      </div>
    </div>
  );
}