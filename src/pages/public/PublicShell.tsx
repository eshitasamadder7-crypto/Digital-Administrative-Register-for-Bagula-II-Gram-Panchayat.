import { useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { NotificationCenter } from "@/components/NotificationCenter";
import {
  Landmark,
  Menu,
  X,
  ShieldCheck,
  FileCheck2,
  LogIn,
  UserPlus,
  Home,
  HelpCircle,
  Bell,
  ExternalLink,
} from "lucide-react";

/** Shared "Coming Soon" notice for all non-functional Public Portal features. */
export function comingSoon(feature = "This feature") {
  toast.info(`${feature} — Coming Soon`, {
    description: "এই পরিষেবাটি শীঘ্রই চালু হবে।",
  });
}

export default function PublicShell({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { label: "Citizen Home", to: "/public", icon: Home },
    { label: "Track Application", to: "/public/login", icon: FileCheck2 },
    { label: "Verify Certificate", to: "/verify", icon: ShieldCheck },
    { label: "Notice Board", to: "/public#notices", icon: Bell },
    { label: "Help & FAQ", to: "/public#faq-section", icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-foreground font-body">
      {/* Official Indian Tricolor Top Bar */}
      <div className="gov-tricolor-top" />

      {/* Official Government Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/95 border-b border-border/70 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
          {/* Brand & Seal */}
          <Link to="/public" className="min-w-0 flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 transition-transform group-hover:scale-105">
              <Landmark className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] uppercase font-bold tracking-[0.14em] text-primary">
                  Public Citizen Portal
                </span>
                <span className="text-[10px] text-muted-foreground hidden sm:inline">•</span>
                <span className="text-[10px] text-muted-foreground font-bengali hidden sm:inline">
                  নাগরিক সেবা পোর্টাল
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-bold text-foreground truncate tracking-tight font-heading">
                Bagula II Gram Panchayat
              </h1>
              <p className="text-[11px] text-muted-foreground hidden md:block leading-tight">
                Hanskhali Block · Nadia, West Bengal · PIN 741502
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2">
            <NotificationCenter variant="compact" tone="dark" />

            <Link
              to="/verify"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>Verify QR</span>
            </Link>

            <Link
              to="/public/login"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Citizen Sign In</span>
            </Link>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border/80 bg-white px-4 py-3 space-y-2 shadow-md animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="grid grid-cols-1 gap-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted/70 transition-colors"
                  >
                    <Icon className="w-4 h-4 text-primary" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
              <Link
                to="/public/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 py-2 text-center text-xs font-semibold rounded-lg bg-muted text-foreground hover:bg-muted/80"
              >
                Create Account
              </Link>
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 text-center text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                ← Main GP Portal
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Page Content */}
      <main className="flex-1">{children}</main>

      {/* Official Government Citizen Footer */}
      <footer className="mt-16 bg-slate-900 text-slate-200 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-xs">
            {/* Col 1: Authority Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-sm text-white font-heading uppercase tracking-wide">
                  Bagula II Gram Panchayat
                </span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Hanskhali Panchayat Samity · Nadia District, Government of West Bengal. Providing transparent, computerized civic services to rural citizens across 18 Sansads.
              </p>
              <div className="pt-1 text-[11px] text-amber-300/90 font-medium">
                Prodhan: Smt. Susmita Biswas Barman · Upa-Prodhan: Sri Manaranjan Bhowmick
              </div>
            </div>

            {/* Col 2: Citizen Quick Services */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider text-amber-400">
                Panchayat Civil Services
              </h3>
              <ul className="space-y-1.5 text-slate-300">
                <li>
                  <Link to="/public/login" className="hover:text-white transition-colors">
                    📜 Warish (Succession) Certificate
                  </Link>
                </li>
                <li>
                  <Link to="/public/login" className="hover:text-white transition-colors">
                    👤 Dependent Certificate
                  </Link>
                </li>
                <li>
                  <Link to="/warish-application-form" className="hover:text-white transition-colors">
                    📄 Warish A4 Printable Application Form
                  </Link>
                </li>
                <li>
                  <Link to="/birth-digitization-form" className="hover:text-white transition-colors">
                    💾 Legacy Birth Certificate Digitization Form
                  </Link>
                </li>
                <li>
                  <Link to="/verify" className="hover:text-white transition-colors">
                    🛡️ Official Certificate Verification
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: State Portals & Compliance */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider text-amber-400">
                State Facilitation
              </h3>
              <ul className="space-y-1.5 text-slate-300">
                <li>
                  <a
                    href="https://wbpms.in/citizen/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white inline-flex items-center gap-1"
                  >
                    <span>WBPMS Trade & General Services</span>
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://prdtax.wb.gov.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white inline-flex items-center gap-1"
                  >
                    <span>PRD Rural Property Tax Portal</span>
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>
                </li>
                <li>
                  <Link to="/wbpms-info" className="hover:text-white transition-colors">
                    📑 WBPMS Document Requirements
                  </Link>
                </li>
                <li>
                  <Link to="/elected-representatives" className="hover:text-white transition-colors">
                    🏛️ Elected Ward Representatives
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4: Office Helpdesk & Hours */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider text-amber-400">
                Gram Panchayat Office
              </h3>
              <p className="text-slate-300 leading-relaxed">
                Vill: Stationpara, P.O.: Bagula, P.S.: Hanskhali, Nadia, West Bengal - 741502
              </p>
              <p className="text-slate-400">
                Office Hours: <strong>Mon–Fri, 10:00 AM – 5:00 PM</strong>
                <br />
                Public Intake Counter: <strong>10:30 AM – 3:30 PM</strong>
              </p>
              <p className="text-slate-300">
                Email:{" "}
                <a href="mailto:bagula2nogp111@gmail.com" className="text-amber-300 hover:underline">
                  bagula2nogp111@gmail.com
                </a>
              </p>
            </div>
          </div>

          {/* Statutory Declaration & System Notice */}
          <div className="border-t border-slate-800 mt-8 pt-5 space-y-2">
            <p className="text-[11px] text-slate-400 leading-relaxed text-center max-w-4xl mx-auto">
              <strong>Statutory Citizen Notice:</strong> This digital facilitation portal is maintained by Bagula II Gram Panchayat, Hanskhali Block, Nadia. All submissions, supporting records, and citizen profile credentials are encrypted and stored in secure government database systems for lawful verification and certificate processing. Certificates downloaded through this portal carry digital security watermarks and verifiable QR codes.
            </p>
            <p className="text-center text-[11px] text-slate-500">
              © {new Date().getFullYear()} Bagula II Gram Panchayat. Government of West Bengal. All rights reserved.
            </p>
          </div>
        </div>

        {/* Bottom Tricolor Accent Bar */}
        <div className="gov-tricolor-top" style={{ transform: "rotate(180deg)" }} />
      </footer>
    </div>
  );
}

