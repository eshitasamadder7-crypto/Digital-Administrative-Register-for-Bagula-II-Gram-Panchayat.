import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  FileCheck2,
  ScrollText,
  Users,
  Download,
  CheckCircle2,
  Search,
  ExternalLink,
  Clock,
  Landmark,
  FileText,
  Sparkles,
  HelpCircle,
  Building2,
  Calendar,
  AlertTriangle,
  ChevronRight,
  LogIn,
  UserPlus,
  QrCode,
  Layers,
} from "lucide-react";
import PublicShell from "./PublicShell";
import { CitizenNoticeBoard } from "@/components/citizen/CitizenNoticeBoard";
import CivilCertificateWorkflowModal from "@/components/citizen/CivilCertificateWorkflowModal";

const purposes = [
  { en: "Apply for available services", bn: "উপলব্ধ পরিষেবার জন্য আবেদন করুন", icon: "📝" },
  { en: "Track applications in real time", bn: "আবেদনের অগ্রগতি রিয়েল-টাইমে দেখুন", icon: "📍" },
  { en: "Receive status updates & SMS/Email notices", bn: "বিজ্ঞপ্তি ও স্ট্যাটাস আপডেট পান", icon: "🔔" },
  { en: "Download issued certificates (watermarked copy)", bn: "ইস্যু হওয়া শংসাপত্র ডাউনলোড করুন (জলছাপ সহ)", icon: "📥" },
  { en: "Verify QR & memo authenticity instantly", bn: "কিউআর কোড ও মেমো নম্বর যাচাই করুন", icon: "🔍" },
  { en: "Maintain unified citizen family profile", bn: "নিজের ও পারিবারিক প্রোফাইল হালনাগাদ রাখুন", icon: "👤" },
  { en: "Request duplicate certificates as per Panchayat rules", bn: "ডুপ্লিকেট শংসাপত্রের আবেদন (পঞ্চায়েত বিধি সাপেক্ষে)", icon: "📑" },
];

const standardWorkflow = [
  { step: "01", en: "Public Registration", bn: "নাগরিক রেজিস্ট্রেশন", desc: "Create account with basic KYC & mobile verification" },
  { step: "02", en: "OTP Verification", bn: "ওটিপি যাচাই", desc: "Secure 6-digit email / SMS one-time verification code" },
  { step: "03", en: "Citizen Profile", bn: "নাগরিক প্রোফাইল", desc: "Permanent Citizen ID generated for family records" },
  { step: "04", en: "Service Selection", bn: "পরিষেবা নির্বাচন", desc: "Choose Warish, Dependent, or civil certificate service" },
  { step: "05", en: "Online Application", bn: "আবেদন তৈরি", desc: "Fill applicant details and legal heir declaration" },
  { step: "06", en: "Document Upload", bn: "নথিপত্র দাখিল", desc: "Attach death slip, Aadhaar, and land tax vouchers" },
  { step: "07", en: "Sansad Enquiry", bn: "সংসদীয় সরেজমিন তদন্ত", desc: "Local Ward Member physical enquiry with witnesses" },
  { step: "08", en: "Office Scrutiny", bn: "দপ্তরে নিরীক্ষা", desc: "Executive Assistant and Panchayat Secretary vetting" },
  { step: "09", en: "Pradhan Approval", bn: "প্রধানের স্বাক্ষর ও অনুমোদন", desc: "Official digital signature and seal authorization" },
  { step: "10", en: "Watermarked QR Issuance", bn: "ডিজিটাল শংসাপত্র প্রদান", desc: "Instant download with tamper-evident QR code" },
];

export default function PublicIntro() {
  const [agreed, setAgreed] = useState(false);
  const [verifyInput, setVerifyInput] = useState("");
  const [workflowModalOpen, setWorkflowModalOpen] = useState(false);
  const [workflowTab, setWorkflowTab] = useState<"warish" | "dependent">("warish");
  const [activeDocTab, setActiveDocTab] = useState<"warish" | "dependent" | "birth">("warish");
  const navigate = useNavigate();

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = verifyInput.trim();
    if (query) {
      navigate(`/verify?search=${encodeURIComponent(query)}`);
    } else {
      navigate("/verify");
    }
  };

  const openWorkflow = (tab: "warish" | "dependent") => {
    setWorkflowTab(tab);
    setWorkflowModalOpen(true);
  };

  return (
    <PublicShell>
      <Helmet>
        <title>Public Citizen Portal — Bagula II Gram Panchayat</title>
        <meta
          name="description"
          content="Official Public Citizen Portal of Bagula II Gram Panchayat, Hanskhali Block, Nadia. Apply online for Warish and Dependent certificates, track application progress, and verify authentic QR certificates."
        />
        <link rel="canonical" href="https://bagula2gp.lovable.app/public" />
        <meta property="og:title" content="Public Citizen Portal — Bagula II Gram Panchayat" />
        <meta
          property="og:description"
          content="Apply online for Warish & Dependent certificates, track applications, and verify QR certificates for Bagula II Gram Panchayat."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://bagula2gp.lovable.app/public" />
      </Helmet>

      {/* 1. HERO SECTION & VALUE PROPOSITION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-amber-500/10 via-white to-emerald-500/5 border-b border-border/70 py-10 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white shadow-xs border border-primary/20 text-primary text-xs font-semibold">
              <Landmark className="w-4 h-4 text-primary" />
              <span>Bagula II Gram Panchayat · Hanskhali Block, Nadia</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground font-heading">
              Official Public Citizen Service Portal
            </h1>

            <p className="text-base sm:text-lg font-medium text-primary font-bengali">
              বগুলা ২ নং গ্রাম পঞ্চায়েত এক জানালা ডিজিটাল নাগরিক সেবা কেন্দ্র
            </p>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Transparent rural governance for residents of Sansads 1 to 18. Apply directly for civil inheritance and dependency certificates, track enquiry status, download watermarked certificates, and verify official QR seals.
            </p>

            {/* Quick Action Pills on Hero */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              <Button
                asChild
                size="lg"
                className="rounded-xl px-5 font-semibold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
              >
                <Link to="/public/login">
                  <ScrollText className="w-4 h-4 mr-2" />
                  <span>Apply for Certificate</span>
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-xl px-5 font-semibold bg-white/90 border-border/80 hover:bg-white text-foreground shadow-2xs"
              >
                <Link to="/public/login">
                  <FileCheck2 className="w-4 h-4 mr-2 text-primary" />
                  <span>Track Application</span>
                </Link>
              </Button>
              <Button
                asChild
                variant="secondary"
                size="lg"
                className="rounded-xl px-5 font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 shadow-2xs"
              >
                <Link to="/verify">
                  <ShieldCheck className="w-4 h-4 mr-2 text-emerald-700" />
                  <span>Verify QR Code</span>
                </Link>
              </Button>
            </div>
          </div>

          {/* 2. PRIMARY ACTION CARDS (APPLY, TRACK, VERIFY, ACCOUNT) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10 sm:mt-12">
            {/* Card 1: Apply */}
            <Card className="p-5 rounded-2xl border border-primary/20 bg-white/90 shadow-sm hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between group">
              <div className="space-y-2.5">
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center font-bold">
                  <ScrollText className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                  <Badge variant="outline" className="text-[10px] uppercase font-bold text-amber-800 bg-amber-50 border-amber-200">
                    Primary Service
                  </Badge>
                  <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                    Apply for Certificate
                  </h3>
                  <p className="text-xs text-primary font-bengali font-medium">
                    সার্টিফিকেটের অনলাইন আবেদন
                  </p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Submit online applications for Warish (Succession), Dependent, and Linkage certificates signed by the GP Pradhan.
                </p>
              </div>
              <div className="pt-4 mt-2 border-t border-border/40">
                <Link
                  to="/public/login"
                  className="text-xs font-bold text-primary flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                >
                  <span>Start Application</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </Card>

            {/* Card 2: Track */}
            <Card className="p-5 rounded-2xl border border-sky-200/80 bg-white/90 shadow-sm hover:shadow-md hover:border-sky-300 transition-all flex flex-col justify-between group">
              <div className="space-y-2.5">
                <div className="w-12 h-12 rounded-xl bg-sky-500/15 text-sky-700 flex items-center justify-center font-bold">
                  <FileCheck2 className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                  <Badge variant="outline" className="text-[10px] uppercase font-bold text-sky-800 bg-sky-50 border-sky-200">
                    Real-Time Status
                  </Badge>
                  <h3 className="text-base font-bold text-foreground group-hover:text-sky-700 transition-colors">
                    Track Application
                  </h3>
                  <p className="text-xs text-sky-700 font-bengali font-medium">
                    আবেদনের অগ্রগতি দেখুন
                  </p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Check field verification, ward member enquiry report, and executive approval using your Reference Number.
                </p>
              </div>
              <div className="pt-4 mt-2 border-t border-border/40">
                <Link
                  to="/public/login"
                  className="text-xs font-bold text-sky-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                >
                  <span>Check Current Status</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </Card>

            {/* Card 3: Verify */}
            <Card className="p-5 rounded-2xl border border-emerald-200/80 bg-white/90 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between group">
              <div className="space-y-2.5">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-700 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                  <Badge variant="outline" className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-50 border-emerald-200">
                    Public Verification
                  </Badge>
                  <h3 className="text-base font-bold text-foreground group-hover:text-emerald-700 transition-colors">
                    Verify Certificate
                  </h3>
                  <p className="text-xs text-emerald-700 font-bengali font-medium">
                    শংসাপত্র ও কিউআর যাচাই
                  </p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Banks, courts, registry offices, and citizens can verify issued certificate authenticity by memo number or scanning QR code.
                </p>
              </div>
              <div className="pt-4 mt-2 border-t border-border/40">
                <Link
                  to="/verify"
                  className="text-xs font-bold text-emerald-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                >
                  <span>Open Verification Tool</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </Card>

            {/* Card 4: Account / Profile */}
            <Card className="p-5 rounded-2xl border border-indigo-200/80 bg-white/90 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between group">
              <div className="space-y-2.5">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/15 text-indigo-700 flex items-center justify-center font-bold">
                  <Users className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                  <Badge variant="outline" className="text-[10px] uppercase font-bold text-indigo-800 bg-indigo-50 border-indigo-200">
                    Citizen Workspace
                  </Badge>
                  <h3 className="text-base font-bold text-foreground group-hover:text-indigo-700 transition-colors">
                    Citizen Account
                  </h3>
                  <p className="text-xs text-indigo-700 font-bengali font-medium">
                    নাগরিক প্রোফাইল ও লগইন
                  </p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Sign in using Email OTP or Citizen ID & Password. Download watermarked certificates and manage family dossiers.
                </p>
              </div>
              <div className="pt-4 mt-2 border-t border-border/40">
                <Link
                  to="/public/login"
                  className="text-xs font-bold text-indigo-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                >
                  <span>Sign In / Register</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* 3. JURISDICTIONAL TRUST STRIP */}
      <section className="bg-slate-900 text-white py-6 border-y border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-slate-800">
            <div className="space-y-1 pt-3 md:pt-0">
              <span className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-heading">
                18 Sansads
              </span>
              <p className="text-xs text-slate-300 font-medium">Under Hanskhali Block, Nadia</p>
              <p className="text-[10px] text-slate-400 font-bengali">১ থেকে ১৮ নং সংসদ এলাকা</p>
            </div>
            <div className="space-y-1 pt-3 md:pt-0">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-heading">
                100% Verified
              </span>
              <p className="text-xs text-slate-300 font-medium">Cryptographic QR Verification</p>
              <p className="text-[10px] text-slate-400 font-bengali">ডিজিটাল কিউআর ও জলছাপযুক্ত</p>
            </div>
            <div className="space-y-1 pt-3 md:pt-0">
              <span className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-heading">
                Multi-Stage
              </span>
              <p className="text-xs text-slate-300 font-medium">Ward Member & Office Scrutiny</p>
              <p className="text-[10px] text-slate-400 font-bengali">সরেজমিন তদন্ত সাপেক্ষে অনুমোদন</p>
            </div>
            <div className="space-y-1 pt-3 md:pt-0">
              <span className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
                Mon–Fri
              </span>
              <p className="text-xs text-slate-300 font-medium">10:30 AM – 3:30 PM Counter</p>
              <p className="text-[10px] text-slate-400 font-bengali">অনলাইন পোর্টাল ২৪×৭ চালু</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. INSTANT VERIFICATION SEARCH BAR */}
      <section className="py-8 bg-emerald-500/5 border-b border-emerald-500/15">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <Card className="p-5 sm:p-6 rounded-2xl border border-emerald-300/60 bg-white shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                  <h3 className="text-base font-bold text-foreground">
                    Instant Certificate Authenticity Verification
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Enter certificate memo number (e.g., B2GP/WAR/2026/001) to verify statutory authenticity
                </p>
              </div>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[11px] font-semibold self-start sm:self-auto">
                Official Validation Tool
              </Badge>
            </div>

            <form onSubmit={handleVerifySubmit} className="flex flex-col sm:flex-row items-center gap-2.5">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Enter Certificate Memo No. or Application Reference No..."
                  value={verifyInput}
                  onChange={(e) => setVerifyInput(e.target.value)}
                  className="pl-10 text-xs sm:text-sm rounded-xl h-11 border-border/80 focus-visible:ring-emerald-500"
                />
              </div>
              <Button
                type="submit"
                className="w-full sm:w-auto h-11 px-6 rounded-xl font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
              >
                <QrCode className="w-4 h-4 mr-2" />
                <span>Verify Now</span>
              </Button>
            </form>
          </Card>
        </div>
      </section>

      {/* 5. DIRECT PANCHAYAT CIVIL CERTIFICATES */}
      <section className="py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Direct Gram Panchayat Services</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1.5 font-heading">
                Civil Certificates & Facilitation Desk
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mt-1">
                Issued under the West Bengal Panchayat Act, 1973 by Prodhan Smt. Susmita Biswas Barman following statutory inquiry.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => openWorkflow("warish")}
                variant="outline"
                size="sm"
                className="text-xs rounded-xl font-semibold text-primary border-primary/30"
              >
                <span>Warish Guide</span>
              </Button>
              <Button
                onClick={() => openWorkflow("dependent")}
                variant="outline"
                size="sm"
                className="text-xs rounded-xl font-semibold text-primary border-primary/30"
              >
                <span>Dependent Guide</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Warish Certificate */}
            <Card className="p-6 rounded-2xl border border-border/80 bg-card hover:border-primary/40 transition-all shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center font-bold">
                  <ScrollText className="w-6 h-6" />
                </div>
                <div>
                  <Badge variant="outline" className="text-[10px] font-bold text-amber-800 bg-amber-50 border-amber-200">
                    Civil Succession
                  </Badge>
                  <h3 className="text-lg font-bold text-foreground mt-1">
                    Warish (Legal Heir) Certificate
                  </h3>
                  <p className="text-xs font-medium text-primary font-bengali">
                    ওয়ারিশান / উত্তরাধিকার শংসাপত্র
                  </p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Authenticates all lawful successors of a deceased permanent resident of Bagula II GP under the Hindu Succession Act, 1956 (with 2005 daughter equality amendment) and Indian Succession Act, 1925.
                </p>

                <div className="space-y-1 text-xs text-foreground/80 bg-muted/40 p-3 rounded-xl">
                  <p className="font-semibold text-primary text-[11px] uppercase tracking-wider">Used for:</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-muted-foreground">
                    <li>BL&LRO Land Mutation (জমির নামজারি)</li>
                    <li>Bank deposit / Insurance claim settlement</li>
                    <li>Family Pension & Legal succession</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/40">
                <Button asChild size="sm" className="w-full rounded-xl font-semibold bg-primary text-primary-foreground">
                  <Link to="/public/login">
                    <span>Apply Online</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Link>
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => openWorkflow("warish")}
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs rounded-xl text-primary border-primary/30"
                  >
                    View Workflow
                  </Button>
                  <Button asChild variant="secondary" size="sm" className="flex-1 text-xs rounded-xl">
                    <Link to="/warish-application-form">
                      <Download className="w-3.5 h-3.5 mr-1" />
                      <span>A4 Form</span>
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>

            {/* Card 2: Dependent Certificate */}
            <Card className="p-6 rounded-2xl border border-border/80 bg-card hover:border-primary/40 transition-all shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <Badge variant="outline" className="text-[10px] font-bold text-primary bg-primary/10 border-primary/20">
                    Dependency Attestation
                  </Badge>
                  <h3 className="text-lg font-bold text-foreground mt-1">
                    Dependent Certificate
                  </h3>
                  <p className="text-xs font-medium text-primary font-bengali">
                    নির্ভরশীলতা / পোষ্য শংসাপত্র
                  </p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Official attestation certifying that family members (elderly parents, minor children, unmarried siblings) reside with and are wholly dependent on the primary breadwinner.
                </p>

                <div className="space-y-1 text-xs text-foreground/80 bg-muted/40 p-3 rounded-xl">
                  <p className="font-semibold text-primary text-[11px] uppercase tracking-wider">Used for:</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-muted-foreground">
                    <li>CGHS / WBHS Medical Card inclusion</li>
                    <li>Railway Pass / Privilege Ticket Order (PTO)</li>
                    <li>Compassionate Appointment (Died-in-Harness)</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/40">
                <Button asChild size="sm" className="w-full rounded-xl font-semibold bg-primary text-primary-foreground">
                  <Link to="/public/login">
                    <span>Apply Online</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Link>
                </Button>
                <Button
                  type="button"
                  onClick={() => openWorkflow("dependent")}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs rounded-xl text-primary border-primary/30"
                >
                  View Workflow & Rules
                </Button>
              </div>
            </Card>

            {/* Card 3: Legacy Birth Digitization Notice & Form */}
            <Card className="p-6 rounded-2xl border border-border/80 bg-card hover:border-primary/40 transition-all shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-700 flex items-center justify-center font-bold">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <Badge variant="outline" className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border-emerald-200">
                    Monthly Quota Kiosk
                  </Badge>
                  <h3 className="text-lg font-bold text-foreground mt-1">
                    Birth & Death Digitization
                  </h3>
                  <p className="text-xs font-medium text-emerald-700 font-bengali">
                    জন্ম ও মৃত্যু ডিজিটালাইজেশন আবেদন
                  </p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Legacy offline birth certificates are received strictly on the <strong>1st Tuesday & 1st Wednesday</strong> of each month at the GP office counter, subject to a daily quota of 100 applications (300/month max).
                </p>

                <div className="space-y-1 text-xs text-foreground/80 bg-muted/40 p-3 rounded-xl">
                  <p className="font-semibold text-emerald-800 text-[11px] uppercase tracking-wider">Intake Guidelines:</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-muted-foreground">
                    <li>Fixed days: 1st Tuesday & Wednesday</li>
                    <li>Daily intake limit: 100 applications/day</li>
                    <li>Bring hospital discharge & parents' Aadhaar</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/40">
                <Button asChild variant="secondary" size="sm" className="w-full rounded-xl font-semibold border border-primary/20">
                  <Link to="/birth-digitization-form">
                    <Download className="w-4 h-4 mr-1.5" />
                    <span>Download Official A4 Digitization Form</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="w-full text-xs rounded-xl">
                  <Link to="/public/login">
                    <span>Check Status in Citizen Portal</span>
                  </Link>
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* 6. TRANSPARENT 5-STAGE VERIFICATION WORKFLOW */}
      <section className="py-12 bg-slate-100/70 border-y border-border/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              <Clock className="w-3.5 h-3.5" />
              <span>Transparent Governance Roadmap</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
              How Your Application Is Processed
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Every certificate issued by Bagula II Gram Panchayat undergoes rigorous physical and record verification to ensure absolute legal validity.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 sm:gap-4">
            {[
              {
                num: "01",
                role: "Citizen / Kiosk",
                title: "Document Assembly",
                bengaliTitle: "নথিপত্র প্রস্তুত",
                desc: "Citizen prepares death certificate, heir Aadhaar cards, and clears current financial year GP property tax.",
              },
              {
                num: "02",
                role: "Ward Member",
                title: "Sansad Field Enquiry",
                bengaliTitle: "সরেজমিন তদন্ত",
                desc: "Elected Sansad representative visits location, inspects family composition, and records two neighbor witness statements.",
              },
              {
                num: "03",
                role: "DEO Desk",
                title: "Portal Submission",
                bengaliTitle: "ডিজিটাল আবেদন দাখিল",
                desc: "DEO or applicant submits online application with scanned KYC proofs; system generates tracking Acknowledgement ID.",
              },
              {
                num: "04",
                role: "GP Secretary",
                title: "Office Scrutiny",
                bengaliTitle: "দপ্তরে নথি যাচাই",
                desc: "Executive Assistant and Gram Panchayat Secretary verify register records, holding numbers, and legal compliance.",
              },
              {
                num: "05",
                role: "GP Pradhan",
                title: "Approval & QR Seal",
                bengaliTitle: "প্রধানের স্বাক্ষর ও অনুমোদন",
                desc: "Prodhan Smt. Susmita Biswas Barman reviews and approves; watermarked certificate with QR verification is issued.",
              },
            ].map((step) => (
              <div
                key={step.num}
                className="rounded-2xl bg-white p-4 sm:p-5 border border-border/70 shadow-2xs space-y-2 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                      {step.num}
                    </span>
                    <span className="text-[9px] font-semibold text-muted-foreground uppercase bg-muted px-2 py-0.5 rounded-md">
                      {step.role}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{step.title}</h4>
                    <p className="text-[11px] text-primary font-bengali font-medium">
                      {step.bengaliTitle}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 10-Step Standard Workflow Collapsible Summary */}
          <Card className="p-5 sm:p-6 rounded-2xl border border-border/80 bg-white space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <span>Comprehensive 10-Step Citizen Journey / পূর্ণাঙ্গ কর্মপ্রবাহ</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Step-by-step pathway from citizen sign-up to certificate download
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-medium">
                Standard Protocol
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2">
              {standardWorkflow.map((item) => (
                <div key={item.step} className="p-3 rounded-xl border border-border/50 bg-slate-50 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      {item.step}
                    </span>
                    <span className="text-xs font-bold text-foreground truncate">{item.en}</span>
                  </div>
                  <p className="text-[11px] text-primary font-bengali font-medium">{item.bn}</p>
                  <p className="text-[10px] text-muted-foreground leading-snug">{item.desc}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* 7. DOCUMENT GUIDANCE & REQUIREMENTS MATRIX */}
      <section className="py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              <FileText className="w-3.5 h-3.5" />
              <span>Document Checklist</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
              Required Documents by Service
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Ensure you have all requisite original documents scanned or photocopied prior to applying.
            </p>
          </div>

          {/* Doc Tabs */}
          <div className="flex items-center justify-center gap-2 p-1 rounded-xl bg-muted/60 max-w-md mx-auto">
            <button
              type="button"
              onClick={() => setActiveDocTab("warish")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                activeDocTab === "warish"
                  ? "bg-white text-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Warish Certificate
            </button>
            <button
              type="button"
              onClick={() => setActiveDocTab("dependent")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                activeDocTab === "dependent"
                  ? "bg-white text-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Dependent Certificate
            </button>
            <button
              type="button"
              onClick={() => setActiveDocTab("birth")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                activeDocTab === "birth"
                  ? "bg-white text-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Birth Digitization
            </button>
          </div>

          {/* Doc Content */}
          <Card className="p-6 rounded-2xl border border-border/80 bg-white space-y-4 shadow-sm">
            {activeDocTab === "warish" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-border/40">
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-foreground">
                      Warish (Legal Heir) Certificate Checklist
                    </h3>
                    <p className="text-xs text-primary font-bengali">
                      ওয়ারিশান সার্টিফিকেটের জন্য প্রয়োজনীয় নথিপত্র
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs font-semibold">
                    7 Mandatory Items
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-border/50 space-y-1">
                    <p className="font-bold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>1. Original Death Certificate</span>
                    </p>
                    <p className="text-muted-foreground pl-5 text-[11px]">
                      Issued by Hospital, Municipality, or Gram Panchayat CRS registrar.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-border/50 space-y-1">
                    <p className="font-bold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>2. KYC of All Surviving Legal Heirs</span>
                    </p>
                    <p className="text-muted-foreground pl-5 text-[11px]">
                      Aadhaar card and EPIC (Voter ID) for every surviving son, daughter, spouse, and mother.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-border/50 space-y-1">
                    <p className="font-bold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>3. Up-to-Date Gram Panchayat Tax Receipt</span>
                    </p>
                    <p className="text-muted-foreground pl-5 text-[11px]">
                      Current financial year holding tax paid receipt issued by Bagula II GP.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-border/50 space-y-1">
                    <p className="font-bold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>4. Sworn Succession Affidavit / Declaration</span>
                    </p>
                    <p className="text-muted-foreground pl-5 text-[11px]">
                      First Class Magistrate / Notary sworn affidavit listing all lawful successors without omission.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-border/50 space-y-1">
                    <p className="font-bold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>5. Land Record / Khatian (If applicable)</span>
                    </p>
                    <p className="text-muted-foreground pl-5 text-[11px]">
                      ROR (Porcha) or registered deed demonstrating deceased person's property holdings.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-border/50 space-y-1">
                    <p className="font-bold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>6. Ward Member Spot Enquiry Report</span>
                    </p>
                    <p className="text-muted-foreground pl-5 text-[11px]">
                      Formal enquiry certificate signed by the respective Sansad representative.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    Format: PDF, JPG, PNG (Max 5MB each)
                  </span>
                  <Button asChild size="sm" className="rounded-xl font-semibold bg-primary text-primary-foreground">
                    <Link to="/public/login">Proceed to Upload in Citizen Portal</Link>
                  </Button>
                </div>
              </div>
            )}

            {activeDocTab === "dependent" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-border/40">
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-foreground">
                      Dependent Certificate Checklist
                    </h3>
                    <p className="text-xs text-primary font-bengali">
                      নির্ভরশীলতা সার্টিফিকেটের জন্য প্রয়োজনীয় নথিপত্র
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs font-semibold">
                    6 Mandatory Items
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-border/50 space-y-1">
                    <p className="font-bold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>1. Salary Slip / Pension Book (PPO)</span>
                    </p>
                    <p className="text-muted-foreground pl-5 text-[11px]">
                      Latest salary certificate or Pension Payment Order of the primary breadwinner.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-border/50 space-y-1">
                    <p className="font-bold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>2. Aadhaar Cards of All Dependents</span>
                    </p>
                    <p className="text-muted-foreground pl-5 text-[11px]">
                      Aadhaar proofs of dependent parents, spouse, minor children, or unmarried sisters.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-border/50 space-y-1">
                    <p className="font-bold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>3. Ration Card / Family Composition Proof</span>
                    </p>
                    <p className="text-muted-foreground pl-5 text-[11px]">
                      Digital Ration Card copy showing co-residence under same household.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-border/50 space-y-1">
                    <p className="font-bold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>4. Self-Declaration of Non-Employment</span>
                    </p>
                    <p className="text-muted-foreground pl-5 text-[11px]">
                      Affidavit stating dependent members have no independent income source.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    Required for CGHS, Railway, and Compassionate appointments
                  </span>
                  <Button asChild size="sm" className="rounded-xl font-semibold bg-primary text-primary-foreground">
                    <Link to="/public/login">Proceed to Upload in Citizen Portal</Link>
                  </Button>
                </div>
              </div>
            )}

            {activeDocTab === "birth" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-border/40">
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-foreground">
                      Legacy Birth Digitization Checklist
                    </h3>
                    <p className="text-xs text-emerald-700 font-bengali">
                      জন্ম ডিজিটালাইজেশনের জন্য প্রয়োজনীয় নথিপত্র
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs font-semibold">
                    Counter Submission
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-border/50 space-y-1">
                    <p className="font-bold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>1. Hospital Discharge / Birth Slip</span>
                    </p>
                    <p className="text-muted-foreground pl-5 text-[11px]">
                      Original discharge certificate from hospital, health center, or nursing home.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-border/50 space-y-1">
                    <p className="font-bold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>2. Child Immunization (Vaccine) Card</span>
                    </p>
                    <p className="text-muted-foreground pl-5 text-[11px]">
                      Signed and stamped child immunization schedule.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-border/50 space-y-1">
                    <p className="font-bold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>3. Aadhaar & Voter ID of Both Parents</span>
                    </p>
                    <p className="text-muted-foreground pl-5 text-[11px]">
                      Clear photocopies with parents' signatures.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-border/50 space-y-1">
                    <p className="font-bold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>4. Existing Handwritten GP Certificate</span>
                    </p>
                    <p className="text-muted-foreground pl-5 text-[11px]">
                      Legacy manual register copy or old handwritten birth slip if available.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    Intake: 1st Tuesday & Wednesday of month at GP Office Counter (10:30 AM)
                  </span>
                  <Button asChild size="sm" variant="secondary" className="rounded-xl font-semibold">
                    <Link to="/birth-digitization-form">
                      <Download className="w-3.5 h-3.5 mr-1" />
                      <span>Download A4 Printable Form</span>
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </section>

      {/* 8. LIVE NOTICE BOARD SECTION */}
      <section id="notices" className="py-12 bg-slate-100/60 border-y border-border/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <CitizenNoticeBoard />
        </div>
      </section>

      {/* 9. CITIZEN INFORMATION DESK & FAQ SHORTCUT */}
      <section className="py-8 bg-slate-50 border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="rounded-2xl border border-primary/20 bg-white p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
                <HelpCircle size={13} />
                <span>Citizen Information Desk</span>
              </div>
              <h3 className="text-sm font-bold text-foreground">Need help or have questions regarding applications?</h3>
              <p className="text-xs text-muted-foreground">
                Find answers regarding Warish certificates, birth digitization, and Gram Panchayat procedures in our FAQ section.
              </p>
            </div>
            <Link
              to="/public/faq"
              className="shrink-0 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition flex items-center gap-1.5"
            >
              <span>View FAQ &amp; Information Desk</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      {/* 10. PURPOSE & IMPORTANT INFORMATION CARDS */}
      <section className="py-10 bg-slate-50 border-t border-border/70">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
          <Card className="p-5 sm:p-6 space-y-3.5 shadow-sm bg-white">
            <h2 className="font-bold text-base sm:text-lg flex items-center gap-2 text-foreground">
              <span>🎯 Statutory Purpose / উদ্দেশhyo (উদ্দেশ্য)</span>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              This portal allows eligible residents of Bagula 2 No. Gram Panchayat to:
              <br />
              <span className="font-bengali">এই পোর্টালের মাধ্যমে বগুলা ২ নং গ্রাম পঞ্চায়েতের যোগ্য বাসিন্দারা পারবেন:</span>
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {purposes.map((p) => (
                <li key={p.en} className="flex items-start gap-2.5 text-xs sm:text-sm bg-slate-50 p-2.5 rounded-xl border border-border/50">
                  <span className="text-base select-none shrink-0 mt-0.5">{p.icon}</span>
                  <span className="leading-snug">
                    <span className="font-semibold text-foreground">{p.en}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5 font-bengali">{p.bn}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5 sm:p-6 space-y-2.5 border-amber-300/60 bg-amber-50/50 shadow-sm">
            <h2 className="font-bold text-sm sm:text-base flex items-center gap-2 text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Important Information / গুরুত্বপূর্ণ তথ্য</span>
            </h2>
            <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed">
              Creating an account does not guarantee approval of any application. Applications are
              verified according to Gram Panchayat rules, physical enquiry findings, and official records available with the office.
            </p>
            <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed font-bengali pt-1 border-t border-amber-200/60">
              অ্যাকাউন্ট তৈরি করলেই আবেদন অনুমোদিত হবে এমন নিশ্চয়তা নেই। পঞ্চায়েতের নিয়ম, সরেজমিন তদন্তের রিপোর্ট ও দপ্তরে
              উপলব্ধ মূল নথি অনুযায়ী প্রতিটি আবেদন পুঙ্খানুপুঙ্খ যাচাই সাপেক্ষ।
            </p>
          </Card>

          {/* OFFICIAL STATUTORY DISCLAIMER (Full English & Bengali legal text preserved) */}
          <Card className="p-5 sm:p-6 space-y-3.5 border-destructive/30 bg-destructive/5 shadow-sm">
            <h2 className="font-bold text-sm sm:text-base flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-5 h-5 text-destructive shrink-0" />
              <span>Statutory Disclaimer / দাবিত্যাগ ও আইনি ঘোষণা</span>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              This portal is a facilitation service of Bagula II Gram Panchayat, Hanskhali Block,
              Nadia. Information submitted must be true and correct; submission of false information
              or forged documents may lead to rejection of the application and action under
              applicable law. Certificates issued through this portal remain subject to verification
              by the issuing authority and may be cancelled if obtained by suppression of facts.
              Downloaded copies are watermarked and are valid only when verification succeeds on the
              official verification page. The Gram Panchayat is not responsible for delays caused by
              incomplete documents, network failure, or incorrect contact details supplied by the
              applicant. Services listed here may be added, modified or withdrawn as per Panchayat
              policy and Government directions.
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-2 border-t border-destructive/20 font-bengali">
              এই পোর্টালটি বগুলা ২ নং গ্রাম পঞ্চায়েত, হাঁসখালি ব্লক, নদীয়ার একটি সহায়তামূলক নাগরিক সেবা ব্যবস্থা। আবেদনপত্রে দাখিল করা সমস্ত তথ্য সম্পূর্ণ সত্য এবং নির্ভুল হওয়া আবশ্যক; অসত্য বা বিভ্রান্তিকর তথ্য প্রদান কিংবা জাল ও বিকৃত নথিপত্র দাখিল করা হলে সংশ্লিষ্ট আবেদনটি অবিলম্বে বাতিল হবে এবং প্রযোজ্য ভারতীয় ও রাজ্য আইনানুযায়ী উপযুক্ত শাস্তিমূলক ব্যবস্থা গ্রহণ করা হতে পারে। এই পোর্টালের মাধ্যমে ইস্যু করা সমস্ত ডিজিটাল শংসাপত্র প্রদানকারী কর্তৃপক্ষের আনুষ্ঠানিক যাচাই সাপেক্ষ এবং কোনো তথ্য গোপন, অসত্য বিবরণ কিংবা অননুমোদিত উপায়ে শংসাপত্র সংগৃহীত হলে তা যেকোনো সময় বাতিল করা হতে পারে। ডাউনলোডকৃত প্রতিটি শংসাপত্রের প্রতিলিপিতে ডিজিটাল নিরাপত্তা জলছাপ (Watermark) থাকবে এবং এই পোর্টালের অফিসিয়াল পাবলিক যাচাইকরণ পেজে সফলভাবে প্রতিপাদিত হলেই কেবল তা আইনত বৈধ বলে গণ্য হবে। অসম্পূর্ণ নথিপত্র, প্রযুক্তিগত বা ইন্টারনেট বিভ্রাট কিংবা আবেদনকারীর প্রদত্ত ভুল মোবাইল নম্বর বা ইমেলের কারণে সৃষ্ট কোনো বিলম্বের জন্য গ্রাম পঞ্চায়েত কর্তৃপক্ষ কোনোভাবেই দায়ী থাকবে না। সরকারি নির্দেশিকা ও পঞ্চায়েত নীতিমালার ভিত্তিতে এখানে তালিকাভুক্ত পরিষেবাসমূহ যেকোনো সময় সংযোজন, সংশোধন বা প্রত্যাহার করার পূর্ণ অধিকার পঞ্চায়েত কর্তৃপক্ষ সংরক্ষণ করে।
            </p>
          </Card>

          {/* Citizen Agreement Checkbox & Proceed Actions */}
          <div className="p-4 rounded-2xl border border-primary/20 bg-white shadow-sm space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="agree"
                checked={agreed}
                onCheckedChange={(v) => setAgreed(v === true)}
                className="mt-1"
              />
              <label htmlFor="agree" className="text-xs sm:text-sm leading-snug cursor-pointer select-none">
                <span className="font-bold text-foreground">
                  I have read, understood, and accept the statutory declaration and citizen terms above.
                </span>
                <span className="block text-xs text-muted-foreground font-bengali mt-0.5">
                  আমি উপরের সমস্ত তথ্য ও শর্তাবলী পড়েছি এবং বুঝেছি।
                </span>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-1">
              <Button
                asChild
                disabled={!agreed}
                size="lg"
                className="w-full sm:flex-1 h-12 text-sm font-semibold rounded-xl shadow-xs"
              >
                <Link
                  to="/public/register"
                  onClick={(e) => {
                    if (!agreed) e.preventDefault();
                  }}
                  aria-disabled={!agreed}
                  className={
                    !agreed
                      ? "pointer-events-none opacity-50 flex items-center justify-center gap-2"
                      : "flex items-center justify-center gap-2"
                  }
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account / নিবন্ধন করুন</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full sm:flex-1 h-12 text-sm font-semibold rounded-xl border-2 hover:bg-muted/80 shadow-2xs"
              >
                <Link to="/public/login" className="flex items-center justify-center gap-2 text-center">
                  <LogIn className="w-4 h-4 text-primary" />
                  <span>Already Registered? Citizen Login</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Civil Certificate Workflow Modal */}
      <CivilCertificateWorkflowModal
        open={workflowModalOpen}
        onOpenChange={setWorkflowModalOpen}
        initialTab={workflowTab}
      />
    </PublicShell>
  );
}
