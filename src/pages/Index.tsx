import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Home, Briefcase, FileText, ScrollText, Bell, HelpCircle,
  Search, ExternalLink, Users, MapPin, Phone, Mail, ChevronRight,
  Download, ClipboardEdit, Clock, ArrowRight, CreditCard, Baby, Lock, X, Eye, EyeOff,
  ChevronDown, Sparkles, BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DependentCertificateForm } from "@/pages/DependentCertificate";
import { useWhatsNew } from "@/hooks/useWhatsNew";
import { VerifyQuickAction } from "@/components/VerifyQuickAction";
import { ExternalRedirectModal } from "@/components/ExternalRedirectModal";
import { ServiceInformationViewer } from "@/components/services/ServiceInformationViewer";
import CitizenServicesWorkflowSection from "@/components/citizen/CitizenServicesWorkflowSection";
import CivilCertificateWorkflowModal from "@/components/citizen/CivilCertificateWorkflowModal";
import { getRedirectGuide, type RedirectGuide } from "@/data/redirectGuides";
import { useBirthDigitalizationRule } from "@/lib/birthDigitalizationRule";
import { BirthDigitalizationRuleManager } from "@/components/BirthDigitalizationRuleManager";
import { useAuthz } from "@/lib/permissions";
import { useServiceCategories } from "@/hooks/useServiceCategories";
import { CitizenFaqSection } from "@/components/citizen/CitizenFaqSection";
import { CitizenNoticeBoard } from "@/components/citizen/CitizenNoticeBoard";

export interface ServiceCategoryDef {
  id: string;
  name: string;
  nameBn: string;
  icon: string;
  description: string;
  services: Array<{
    id: string;
    title: string;
    bengaliTitle: string;
    desc: string;
    guideKey: string;
    applyUrl?: string;
    applyLabel?: string;
    icon: string;
    turnaround?: string;
  }>;
}

export const SERVICE_CATEGORIES: ServiceCategoryDef[] = [
  {
    id: "direct-panchayat",
    name: "Direct Panchayat Certificates",
    nameBn: "পঞ্চায়েত নিজস্ব সার্টিফিকেট",
    icon: "📜",
    description: "Legal succession (Warish) & family dependency certificates issued directly by Bagula II GP",
    services: [
      {
        id: "warish-workflow",
        title: "Warish Certificate",
        bengaliTitle: "ওয়ারিশান শংসাপত্র (উত্তরাধিকার সনদ)",
        desc: "Succession certificate under West Bengal Panchayat Act 1973 for mutation and bank settlement.",
        guideKey: "warish-workflow",
        applyUrl: "/public/apply/warish",
        applyLabel: "Apply Online (Citizen Portal)",
        icon: "📜",
        turnaround: "7 - 10 Days",
      },
      {
        id: "dependent-workflow",
        title: "Dependent Certificate",
        bengaliTitle: "পারিবারিক নির্ভরশীলতা শংসাপত্র",
        desc: "Family dependency certificate for railway pass, medical reimbursement and welfare benefits.",
        guideKey: "dependent-workflow",
        applyUrl: "/public/apply/dependent",
        applyLabel: "Apply Online (Citizen Portal)",
        icon: "👤",
        turnaround: "5 - 7 Days",
      },
    ],
  },
  {
    id: "revenue",
    name: "Revenue Services",
    nameBn: "রাজস্ব ও কর পরিষেবা",
    icon: "💳",
    description: "Panchayat & Rural Development (PRD) rural property tax payment & verification",
    services: [
      {
        id: "prd-tax",
        title: "Property Tax (PRD Tax)",
        bengaliTitle: "সম্পত্তি কর ও মিউটেশন ফি",
        desc: "Pay or verify household property tax through West Bengal PRD state portal.",
        guideKey: "prd-tax",
        icon: "💳",
        turnaround: "Instant Online",
      },
    ],
  },
  {
    id: "birth-death",
    name: "Birth & Death",
    nameBn: "জন্ম ও মৃত্যু পরিষেবা",
    icon: "👶",
    description: "Civil registration under Section 12/17 RBD Act 1969 & Janma-Mrityu Tathya state portal",
    services: [
      {
        id: "birth-new",
        title: "New Birth Registration",
        bengaliTitle: "নতুন জন্ম নিবন্ধন (২১ দিনের মধ্যে)",
        desc: "Online registration within 21 days with hospital discharge certificate & parental proofs.",
        guideKey: "birth-new",
        icon: "👶",
        turnaround: "7 - 15 Days",
      },
      {
        id: "birth-death-correction",
        title: "Correction in Certificate",
        bengaliTitle: "জন্ম বা মৃত্যু তথ্যে নাম বা বানান সংশোধন",
        desc: "Correction procedure for name spelling, parent details, date or place of birth/death.",
        guideKey: "birth-death-correction",
        icon: "✏️",
        turnaround: "15 - 21 Days",
      },
      {
        id: "birth-death-delayed",
        title: "Delayed Registration",
        bengaliTitle: "বিলম্বিত জন্ম বা মৃত্যু নিবন্ধন (১ বছর পর)",
        desc: "Delayed birth/death registration after 1 year with SDO / Executive Magistrate permission.",
        guideKey: "birth-death-delayed",
        icon: "⏳",
        turnaround: "21 - 30 Days",
      },
      {
        id: "birth-digitalization",
        title: "Existing Digital Birth Certificate",
        bengaliTitle: "পুরাতন হস্তলিখিত জন্ম শংসাপত্র ডিজিটালাইজেশন",
        desc: "Legacy handwritten certificate pre-verification SOP for Sub-Registrar validation.",
        guideKey: "birth-digitalization",
        applyUrl: "/birth-digitization-form",
        applyLabel: "Fill A4 Digitization Form",
        icon: "📄",
        turnaround: "3 - 7 Days",
      },
      {
        id: "crs-forms",
        title: "CRS Forms & Templates",
        bengaliTitle: "সিআরএস ফর্ম ডাউনলোড ও নির্দেশিকা",
        desc: "Download official Form-1, Form-2, Form-5, Form-6 and delayed registration affidavit formats.",
        guideKey: "crs-forms",
        icon: "📥",
        turnaround: "Instant Download",
      },
    ],
  },
  {
    id: "employment",
    name: "Employment",
    nameBn: "কর্মসংস্থান (১০০ দিনের কাজ)",
    icon: "👷",
    description: "Mahatma Gandhi National Rural Employment Guarantee Scheme (MGNREGA) facilitation",
    services: [
      {
        id: "mnrega-jobcard",
        title: "MNREGA Job Cards",
        bengaliTitle: "এমজিএনরেগা জব কার্ড ও শ্রমিক তালিকা",
        desc: "Verify active job cards, registered household muster rolls and worker demand status.",
        guideKey: "mnrega-jobcard",
        icon: "👷",
        turnaround: "Instant Check",
      },
    ],
  },
  {
    id: "wbpms",
    name: "WBPMS Certificates",
    nameBn: "ডব্লিউবিপিএমএস শংসাপত্র",
    icon: "📑",
    description: "West Bengal Public Management System portal certificates with decentralized GP attestation",
    services: [
      {
        id: "wbpms-residential",
        title: "Residential Certificate",
        bengaliTitle: "স্থায়ী বাসিন্দা শংসাপত্র",
        desc: "Proof of residence within Bagula II GP jurisdiction for education, job and ID applications.",
        guideKey: "wbpms-residential",
        icon: "🏠",
        turnaround: "7 Days",
      },
      {
        id: "wbpms-character",
        title: "Character Certificate",
        bengaliTitle: "চারিত্রিক শংসাপত্র",
        desc: "Attestation of character and conduct for police verification, army recruitment and job entry.",
        guideKey: "wbpms-character",
        icon: "📋",
        turnaround: "7 Days",
      },
      {
        id: "wbpms-income",
        title: "Income Certificate",
        bengaliTitle: "বার্ষিক পারিবারিক আয় শংসাপত্র",
        desc: "Annual family income certificate for scholarships, fee waivers and government welfare schemes.",
        guideKey: "wbpms-income",
        icon: "💰",
        turnaround: "7 Days",
      },
      {
        id: "wbpms-same-person",
        title: "Same Person Certificate",
        bengaliTitle: "একই ব্যক্তি প্রত্যয়ন শংসাপত্র (নামের ভিন্নতা)",
        desc: "Attestation that multiple names/aliases on different official documents refer to the same individual.",
        guideKey: "wbpms-same-person",
        icon: "🧑",
        turnaround: "7 Days",
      },
      {
        id: "wbpms-distance",
        title: "Distance Certificate",
        bengaliTitle: "দূরত্ব সনদ (বাসস্থান থেকে বিদ্যালয় বা অফিস)",
        desc: "Official certified distance between citizen residence and schools, colleges, or workplace.",
        guideKey: "wbpms-distance",
        icon: "📏",
        turnaround: "7 Days",
      },
      {
        id: "wbpms-caste",
        title: "Caste Authentication",
        bengaliTitle: "জাতি পরিচয় প্রত্যয়ন শংসাপত্র",
        desc: "Panchayat local inquiry and attestation supporting SC/ST/OBC caste certificate applications.",
        guideKey: "wbpms-caste",
        icon: "🏷️",
        turnaround: "7 - 10 Days",
      },
      {
        id: "wbpms-unmarried",
        title: "Unmarried Certificate",
        bengaliTitle: "অবিবাহিত প্রত্যয়ন শংসাপত্র",
        desc: "Official declaration of single marital status for defense recruitment and state scholarships.",
        guideKey: "wbpms-unmarried",
        icon: "💍",
        turnaround: "7 Days",
      },
    ],
  },
  {
    id: "elected-reps",
    name: "Elected Representatives",
    nameBn: "নির্বাচিত জনপ্রতিনিধি ডিরেক্টরি",
    icon: "🏛️",
    description: "30 Gram Sansad Ward Members, Polling Booths, and Bagula II Panchayat Executive Committee",
    services: [
      {
        id: "ward-members",
        title: "30 Ward Members & Polling Booths",
        bengaliTitle: "৩০ জন নির্বাচিত গ্রাম সংসদ সদস্য ও বুথ তালিকা",
        desc: "Find your local ward representative, polling booth allocation, and public contact information.",
        guideKey: "",
        applyUrl: "/elected-representatives",
        applyLabel: "Open Representatives Directory",
        icon: "🏛️",
        turnaround: "Public Directory",
      },
    ],
  },
];

const mnregaUrl = "https://mnregaweb2.dord.gov.in/Netnrega/writereaddata/citizen_out/panchregpeople_3201003002_eng2627.html";

type Section = "home" | "services" | "certificates" | "notices" | "faq" | "help";

const navItems: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "services", label: "Services", icon: Briefcase },
  { id: "certificates", label: "Certificates", icon: FileText },
  { id: "notices", label: "Notices", icon: Bell },
  { id: "faq", label: "FAQ", icon: HelpCircle },
  { id: "help", label: "Help", icon: Phone },
];

const quickServices = [
  {
    title: "PRD Tax",
    desc: "Property tax payment",
    icon: FileText,
    guideKey: "prd-tax",
    color: "from-primary/20 to-primary/5",
    iconColor: "text-primary",
  },
  {
    title: "Birth & Death",
    desc: "Registration services",
    icon: ScrollText,
    guideKey: "birth-new",
    color: "from-accent/20 to-accent/5",
    iconColor: "text-accent",
  },
  {
    title: "Warish Certificate",
    desc: "Warish (succession) certificate",
    icon: ScrollText,
    to: "/public/apply/warish",
    color: "from-accent/20 to-accent/5",
    iconColor: "text-accent",
  },
  {
    title: "Dependent Certificate",
    desc: "Medical facility access",
    icon: Users,
    to: "/public/apply/dependent",
    color: "from-primary/20 to-primary/5",
    iconColor: "text-primary",
  },
];

const allServices = [
  { title: "Warish Certificate", desc: "Legal heir & succession workflow and online apply", guideKey: "warish-workflow", to: "/public/apply/warish", icon: "📜" },
  { title: "Dependent Certificate", desc: "Family dependency certificate workflow and online apply", guideKey: "dependent-workflow", to: "/public/apply/dependent", icon: "👤" },
  { title: "PRD Tax", desc: "Property tax via WB portal", guideKey: "prd-tax", icon: "💳" },
  { title: "MNREGA Jobs", desc: "View job cards & workers", guideKey: "mnrega-jobcard", icon: "👷" },
  { title: "Birth Registration", desc: "New birth registration", guideKey: "birth-new", icon: "👶" },
  { title: "Death Registration", desc: "New death registration", guideKey: "death-new", icon: "📋" },
  { title: "CRS Forms", desc: "Download official forms", guideKey: "crs-forms", icon: "📄" },
  { title: "Residential Cert.", desc: "Apply via WBPMS", guideKey: "wbpms-residential", icon: "🏠" },
  { title: "Character Cert.", desc: "Apply via WBPMS", guideKey: "wbpms-character", icon: "📋" },
  { title: "Income Cert.", desc: "Apply via WBPMS", guideKey: "wbpms-income", icon: "💰" },
  { title: "Same Person Cert.", desc: "Apply via WBPMS", guideKey: "wbpms-same-person", icon: "🧑" },
  { title: "Distance Cert.", desc: "Apply via WBPMS", guideKey: "wbpms-distance", icon: "📏" },
  { title: "Caste Auth.", desc: "Apply via WBPMS", guideKey: "wbpms-caste", icon: "🏷️" },
  { title: "Unmarried Cert.", desc: "Apply via WBPMS", guideKey: "wbpms-unmarried", icon: "💍" },
  { title: "Elected Representatives", desc: "Ward members list", to: "/elected-representatives", icon: "🏛️" },
  { title: "Document Info", desc: "Required documents", to: "/wbpms-info", icon: "📑" },
];

// What's New entries are now loaded from the backend (whats_new_entries table)

const getTodayStr = () => new Date().toISOString().slice(0, 10);

const formatUpdateDate = (dateStr: string) => {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};


export default function Index() {
  const [activeSection, setActiveSection] = useState<Section>("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedDate, setExpandedDate] = useState<string | null>(getTodayStr());
  const [redirectGuide, setRedirectGuide] = useState<RedirectGuide | null>(null);
  const [redirectModalOpen, setRedirectModalOpen] = useState(false);
  const [selectedGuideKey, setSelectedGuideKey] = useState<string>("wbpms-residential");
  const [serviceViewerOpen, setServiceViewerOpen] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("all");
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>("direct-panchayat");
  const [civilWorkflowOpen, setCivilWorkflowOpen] = useState(false);
  const [civilWorkflowTab, setCivilWorkflowTab] = useState<"warish" | "dependent">("warish");
  const { groups: whatsNewUpdates, loading: whatsNewLoading } = useWhatsNew();
  const authz = useAuthz();
  const { rule: birthRule, setRuleLocally } = useBirthDigitalizationRule();
  const { categories: serviceCategories, loading: serviceCategoriesLoading } = useServiceCategories();

  const openGuide = (key: string) => {
    setSelectedGuideKey(key);
    setRedirectGuide(getRedirectGuide(key));
    setServiceViewerOpen(true);
  };

  const openCivilWorkflow = (tab: "warish" | "dependent") => {
    setCivilWorkflowTab(tab);
    setCivilWorkflowOpen(true);
  };


  const filteredServices = searchQuery
    ? allServices.filter(
        (s) =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.desc.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div className="min-h-screen relative pb-20">
      <Helmet>
        <title>Bagula II Gram Panchayat — Public Service Portal</title>
        <meta name="description" content="Bagula II Gram Panchayat, Hanskhali, Nadia — birth & death records, WBPMS certificates, MGNREGA jobs, PRD tax and warish (succession) services." />
        <link rel="canonical" href="https://bagula2gp.lovable.app/" />
        <meta property="og:title" content="Bagula II Gram Panchayat — Public Service Portal" />
        <meta property="og:description" content="Official facilitation portal of Bagula II Gram Panchayat, Hanskhali Block, Nadia, West Bengal. Access birth & death registration, WBPMS certificates, MGNREGA and PRD tax services." />
        <meta property="og:url" content="https://bagula2gp.lovable.app/" />
      </Helmet>
      {/* Gradient Background */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background:
            "linear-gradient(160deg, hsl(30 100% 95%) 0%, hsl(0 0% 100%) 50%, hsl(140 40% 95%) 100%)",
        }}
      />

      {/* Sticky Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 border-b border-border/50">
        <div className="px-4 py-3 text-center">
          <p className="text-[10px] uppercase tracking-[0.18em] text-primary font-semibold mb-0.5">
            Public Service Facilitation Portal
          </p>
          <h1 className="text-base font-bold tracking-wide text-foreground" style={{ fontFamily: "var(--font-body)" }}>
            Bagula II Gram Panchayat — Public Service Facilitation Portal
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Hanskhali Block · Nadia · West Bengal
          </p>
          <div className="mt-2 flex items-center justify-center gap-2 flex-wrap">
            <Button asChild size="sm" className="rounded-full h-8 px-4 text-xs font-medium shadow-sm">
              <Link to="/public">🌐 Public Access</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-full h-8 px-4 text-xs font-medium border-border/70 hover:bg-white/90 shadow-sm">
              <Link to="/admin">🏛️ Office Log In</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Section Content */}
      <div className="px-4 pt-4 max-w-2xl mx-auto">
        {activeSection === "home" && (
          <div className="animate-fade-in space-y-6">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                type="search"
                aria-label="Search services"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search services (birth certificate, tax, warish...)"
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/80 backdrop-blur-sm border border-border/60 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground/60"
              />
            </div>

            {/* Search Results */}
            {searchQuery && (
              <div className="space-y-2 animate-fade-in">
                {filteredServices.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No services found for "{searchQuery}"
                  </p>
                ) : (
                  filteredServices.map((s, i) => {
                    const inner = (
                      <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/70 backdrop-blur-sm border border-border/40 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                        <span className="text-xl">{s.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{s.title}</p>
                          <p className="text-xs text-muted-foreground">{s.desc}</p>
                        </div>
                        <ChevronRight size={16} className="text-muted-foreground shrink-0" />
                      </div>
                    );
                    if ("to" in s && s.to) {
                      return <Link key={i} to={s.to}>{inner}</Link>;
                    }
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => openGuide(("guideKey" in s ? s.guideKey : "wbpms-general") as string)}
                        className="w-full text-left"
                      >
                        {inner}
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {/* Quick Services */}
            {!searchQuery && (
              <>
                {/* Public Citizen Portal & Office gateway */}
                <div className="rounded-2xl border border-primary/30 bg-white/80 backdrop-blur-sm p-4 shadow-sm space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Residents & Staff of Bagula 2 No. Gram Panchayat</p>
                    <p className="text-xs text-muted-foreground">Apply, track, download and verify certificates online, or access the GP staff portal.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <Button asChild className="w-full rounded-xl shadow-sm" size="lg">
                      <Link to="/public">🌐 Public Access</Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full rounded-xl border-primary/30 hover:bg-primary/5 font-medium shadow-sm" size="lg">
                      <Link to="/admin">🏛️ Office Log In</Link>
                    </Button>
                  </div>
                  <p className="text-[11px] text-center text-muted-foreground">
                    Cyber Cafes under Hanskhali Block — <span className="font-medium">Cyber Cafe Access — Coming Soon</span>
                  </p>
                </div>

                <VerifyQuickAction />
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground mb-3 tracking-wide uppercase">
                    Quick Services
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    {quickServices.map((s, i) => {
                      const card = (
                        <div
                          className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${s.color} backdrop-blur-sm border border-white/60 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group`}
                          style={{ animationDelay: `${i * 0.08}s` }}
                        >
                          <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center mb-3">
                            <s.icon className={s.iconColor} size={20} />
                          </div>
                          <h3 className="font-semibold text-foreground text-sm mb-0.5 flex items-center gap-1">
                            {s.title}
                            {"guideKey" in s && <ExternalLink size={10} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition" />}
                          </h3>
                          <p className="text-[11px] text-muted-foreground leading-snug">{s.desc}</p>
                        </div>
                      );
                      if ("to" in s && s.to) {
                        return (
                          <Link key={i} to={s.to} className="animate-fade-in" style={{ animationDelay: `${i * 0.08}s` }}>
                            {card}
                          </Link>
                        );
                      }
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => openGuide(("guideKey" in s ? s.guideKey : "prd-tax") as string)}
                          className="text-left animate-fade-in"
                          style={{ animationDelay: `${i * 0.08}s` }}
                        >
                          {card}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Trust Badges */}
                <section aria-labelledby="trust-badges-heading">
                <h2 id="trust-badges-heading" className="sr-only">Trust &amp; Service Badges</h2>
                <div className="grid grid-cols-2 gap-2 animate-fade-in" style={{ animationDelay: "0.28s" }}>
                  {[
                    { label: "Mobile Friendly", icon: "📱" },
                    { label: "Secure Access", icon: "🔒" },
                    { label: "Citizen Services", icon: "🤝" },
                    { label: "Admin Assistance", icon: "🏛️" },
                  ].map((b) => (
                    <div
                      key={b.label}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/70 backdrop-blur-sm border border-border/40 shadow-sm"
                    >
                      <span className="text-base" aria-hidden="true">{b.icon}</span>
                      <span className="text-[11px] font-medium text-foreground">{b.label}</span>
                    </div>
                  ))}
                </div>
                </section>

                {/* What's New */}
                <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-border/40 shadow-sm p-5 animate-fade-in" style={{ animationDelay: "0.32s" }}>
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles size={16} className="text-primary" />
                    <h2 className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">What's New</h2>
                  </div>
                  <div className="space-y-2">
                    {whatsNewUpdates
                      .filter((u) => u.date === getTodayStr())
                      .map((update) => {
                        const isOpen = expandedDate === update.date;
                        return (
                          <div
                            key={update.date}
                            className="rounded-xl border overflow-hidden transition-all duration-300 border-primary/40 bg-primary/5"
                          >
                            <button
                              onClick={() => setExpandedDate(isOpen ? null : update.date)}
                              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-primary/5 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-foreground">{formatUpdateDate(update.date)}</span>
                                <span className="text-[9px] uppercase tracking-wide bg-primary text-primary-foreground font-bold px-1.5 py-0.5 rounded">
                                  Latest
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">
                                  {update.items.length} update{update.items.length > 1 ? "s" : ""}
                                </span>
                                <ChevronDown
                                  size={16}
                                  className={`text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                                />
                              </div>
                            </button>
                            <div
                              className="overflow-hidden transition-all duration-300"
                              style={{ maxHeight: isOpen ? `${update.items.length * 48 + 16}px` : "0px", opacity: isOpen ? 1 : 0 }}
                            >
                              <div className="px-4 pb-3 space-y-2">
                                {update.items.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="text-xs text-muted-foreground leading-relaxed pl-3 border-l-2 border-primary/30 py-1 animate-fade-in"
                                    style={{ animationDelay: `${idx * 0.05}s` }}
                                  >
                                    {item}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    {!whatsNewLoading && whatsNewUpdates.filter((u) => u.date === getTodayStr()).length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-3">
                        No updates posted today.
                      </p>
                    )}
                    {whatsNewLoading && (
                      <p className="text-xs text-muted-foreground text-center py-3">Loading updates…</p>
                    )}
                  </div>
                </div>

                {/* About Card */}
                <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-border/40 shadow-sm p-5 animate-fade-in" style={{ animationDelay: "0.35s" }}>
                  <h2 className="text-sm font-semibold text-muted-foreground mb-3 tracking-wide uppercase">
                    About
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Serving the people of Hanskhali Block, District Nadia, West Bengal.
                    Access government services, download forms, and generate official certificates.
                  </p>
                  <div className="space-y-2.5">
                    <div className="flex gap-2.5 items-start">
                      <MapPin size={15} className="text-primary mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        Vill: Stationpara, P.O.: Bagula, P.S.: Hanskhali, Nadia, W.B.
                      </p>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <Mail size={15} className="text-primary mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground">bagula2nogp111@gmail.com</p>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <Phone size={15} className="text-primary mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground">Contact during working hours</p>
                    </div>
                  </div>
                </div>

                {/* Notice Preview - Birth Certificate Digitalization */}
                <div
                  className={`rounded-2xl backdrop-blur-sm border shadow-sm p-5 animate-fade-in transition-all ${
                    birthRule.isActive
                      ? "bg-white/75 border-border/40 hover:border-primary/30"
                      : "bg-amber-50/70 dark:bg-amber-950/20 border-amber-300/50"
                  }`}
                  style={{ animationDelay: "0.45s" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="text-xl shrink-0 mt-0.5">{birthRule.icon || "📢"}</span>
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground text-sm">
                            {birthRule.title}
                          </h3>
                          {birthRule.isActive ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-semibold">
                              Accepting Applications
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-semibold">
                              Intake Paused by Administration
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {birthRule.isActive ? (
                            <>
                              Applications accepted on the{" "}
                              <strong className="text-foreground">{birthRule.acceptedDays}</strong> — up to{" "}
                              <strong className="text-foreground">{birthRule.monthlyLimit} applications</strong>, limit{" "}
                              <strong className="text-foreground">{birthRule.dailyLimit}/day</strong>.
                            </>
                          ) : (
                            <span>{birthRule.deactivationNotice}</span>
                          )}
                        </p>

                        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <button
                              type="button"
                              onClick={() => openGuide("birth-digitalization")}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                            >
                              <span>View SOP Guidelines &amp; Pre-Verification</span>
                              <ArrowRight size={12} />
                            </button>

                            <Link
                              to="/birth-digitization-form"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline bg-accent/10 px-2.5 py-1 rounded-md border border-accent/20"
                            >
                              <Download size={12} />
                              <span>Print / Fill A4 Application Form (আবেদনপত্র)</span>
                            </Link>
                          </div>

                          {authz.isSuperAdmin && (
                            <BirthDigitalizationRuleManager
                              currentRule={birthRule}
                              onRuleUpdated={setRuleLocally}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Frequently Asked Questions Section on Landing Page */}
                <CitizenFaqSection onSelectServiceGuide={openGuide} className="pt-6" />
              </>
            )}
          </div>
        )}

        {activeSection === "services" && (
          <div className="animate-fade-in space-y-6">
            {/* Header & Progressive Category Selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground">
                    Public Service Hub — Bagula II Gram Panchayat
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Progressive e-governance information: Select a category to view authorized SOPs, required documents & official portals
                  </p>
                </div>
              </div>

              {/* Category Pills Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar">
                <button
                  onClick={() => setActiveCategoryFilter("all")}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    activeCategoryFilter === "all"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-white/80 dark:bg-slate-900/80 text-muted-foreground hover:text-foreground border border-border/40"
                  }`}
                >
                  All Categories ({serviceCategories.length})
                </button>
                {serviceCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      activeCategoryFilter === cat.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-white/80 dark:bg-slate-900/80 text-muted-foreground hover:text-foreground border border-border/40"
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                    <span className="text-[10px] opacity-75">({cat.services.length})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Render Categories & Their Services */}
            <div className="space-y-5">
              {serviceCategories.filter(
                (c) => activeCategoryFilter === "all" || activeCategoryFilter === c.id
              ).map((category) => (
                <div
                  key={category.id}
                  className="rounded-2xl bg-white/80 dark:bg-slate-900/70 backdrop-blur-sm border border-border/50 shadow-sm overflow-hidden animate-fade-in"
                >
                  {/* Category Header */}
                  <div className="px-5 py-3.5 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/40 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl shrink-0">{category.icon}</span>
                      <div>
                        <h3 className="text-sm font-bold text-foreground truncate">
                          {category.name}
                        </h3>
                        <p className="text-[11px] text-primary font-bengali">
                          {category.nameBn}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold shrink-0">
                      {category.services.length} Service{category.services.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="p-4 sm:p-5 space-y-3">
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                      {category.description}
                    </p>

                    <div className="grid grid-cols-1 gap-3">
                      {category.services.map((svc) => (
                        <div
                          key={svc.id}
                          className="p-4 rounded-xl border border-border/40 bg-white/60 dark:bg-slate-950/40 hover:border-primary/30 hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                        >
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-base shrink-0">{svc.icon}</span>
                              <h4 className="text-sm font-bold text-foreground">
                                {svc.title}
                              </h4>
                              {svc.turnaround && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-amber-700 dark:text-amber-300 border-amber-200">
                                  {svc.turnaround}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-primary font-bengali">
                              {svc.bengaliTitle}
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {svc.desc}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/30">
                            {svc.guideKey ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs rounded-xl h-8 gap-1 hover:border-primary/40 hover:text-primary"
                                onClick={() => openGuide(svc.guideKey)}
                              >
                                <BookOpen size={13} />
                                <span>View SOP & Info</span>
                              </Button>
                            ) : null}

                            {svc.applyUrl ? (
                              svc.applyUrl.startsWith("/") ? (
                                <Button asChild size="sm" className="text-xs rounded-xl h-8 gap-1 bg-primary text-primary-foreground font-medium shadow-xs">
                                  <Link to={svc.applyUrl}>
                                    <span>{svc.applyLabel || "Apply Online"}</span>
                                    <ArrowRight size={13} />
                                  </Link>
                                </Button>
                              ) : (
                                <Button asChild size="sm" className="text-xs rounded-xl h-8 gap-1 bg-primary text-primary-foreground font-medium shadow-xs">
                                  <a href={svc.applyUrl} target="_blank" rel="noopener noreferrer">
                                    <span>{svc.applyLabel || "Open Portal"}</span>
                                    <ExternalLink size={13} />
                                  </a>
                                </Button>
                              )
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Link to Document Information Booklet */}
            <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-border/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-primary shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-foreground">
                    Comprehensive Citizen Document Guidelines & Rules
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Official list of accepted identity and residential proofs under West Bengal Panchayat SOPs
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-xl text-xs shrink-0">
                <Link to="/wbpms-info">View Booklet</Link>
              </Button>
            </div>
          </div>
        )}

        {activeSection === "certificates" && (
          <div className="animate-fade-in space-y-6">
            <div className="border-b border-border/50 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-primary text-primary-foreground text-xs font-semibold">
                  🏛️ Gram Panchayat Civil Services
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Bagula II GP · Nadia
                </Badge>
              </div>
              <h2 className="text-xl font-bold text-foreground">Civil & Administrative Certificates</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Apply online for succession (Warish) & dependent certificates, check step-by-step statutory workflows, or access administrative drafting tools.
              </p>
            </div>

            {/* Warish Certificate Card */}
            <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-border/60 shadow-sm p-5 sm:p-6 space-y-4 hover:border-primary/40 transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0">
                    <ScrollText size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5 rounded">
                      Civil Certification
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-foreground mt-0.5">
                      Warish (Succession) Certificate
                    </h3>
                    <p className="text-xs font-semibold text-primary font-bengali">
                      ওয়ারিশান / উত্তরাধিকার শংসাপত্র
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200">
                  Online Service Active
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Official attestation of surviving Class-I legal heirs of a deceased resident of Bagula II GP under the Hindu Succession Act, 1956 & Indian Succession Act, 1925 for land mutation at BL&LRO, bank claims, and family pension.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40">
                  <span className="text-[10px] text-muted-foreground block font-medium">Turnaround</span>
                  <span className="font-bold text-foreground">7 to 15 Days</span>
                </div>
                <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40">
                  <span className="text-[10px] text-muted-foreground block font-medium">Required Docs</span>
                  <span className="font-bold text-foreground">7 Documents</span>
                </div>
                <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40">
                  <span className="text-[10px] text-muted-foreground block font-medium">Sansad Enquiry</span>
                  <span className="font-bold text-foreground">Ward 1 to 18</span>
                </div>
                <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40">
                  <span className="text-[10px] text-muted-foreground block font-medium">Equal Rights</span>
                  <span className="font-bold text-emerald-700">Daughters Mandatory</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-3 border-t border-border/40">
                <Button
                  onClick={() => openCivilWorkflow("warish")}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto flex-1 rounded-xl text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                >
                  <BookOpen size={14} />
                  <span>View Full Workflow & Rules</span>
                </Button>
                <Button
                  asChild
                  variant="secondary"
                  size="sm"
                  className="w-full sm:w-auto rounded-xl text-xs font-semibold gap-1.5 border border-primary/20 hover:bg-primary/10"
                >
                  <Link to="/warish-application-form">
                    <Download size={13} />
                    <span>Download A4 Form</span>
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="w-full sm:w-auto flex-1 rounded-xl bg-primary text-primary-foreground text-xs font-semibold gap-1.5 shadow-xs"
                >
                  <Link to="/public/apply/warish">
                    <span>Citizen Apply Online</span>
                    <ArrowRight size={14} />
                  </Link>
                </Button>
                <Link to="/warish-certificate" className="w-full sm:w-auto">
                  <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-foreground">
                    <Lock size={12} className="mr-1" /> Staff Drafting Tool
                  </Button>
                </Link>
              </div>
            </div>

            {/* Dependent Certificate Card */}
            <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-border/60 shadow-sm p-5 sm:p-6 space-y-4 hover:border-primary/40 transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                    <Users size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">
                      Civil Certification
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-foreground mt-0.5">
                      Dependent Certificate
                    </h3>
                    <p className="text-xs font-semibold text-primary font-bengali">
                      নির্ভরশীলতা / পোষ্য শংসাপত্র
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200">
                  Online Service Active
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Official attestation by Bagula II Gram Panchayat certifying that a family member resides with and is wholly dependent upon a serving/retired government, railway, defence, or private employee.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40">
                  <span className="text-[10px] text-muted-foreground block font-medium">Turnaround</span>
                  <span className="font-bold text-foreground">3 to 7 Days</span>
                </div>
                <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40">
                  <span className="text-[10px] text-muted-foreground block font-medium">Required Docs</span>
                  <span className="font-bold text-foreground">7 Documents</span>
                </div>
                <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40">
                  <span className="text-[10px] text-muted-foreground block font-medium">Permissible Purpose</span>
                  <span className="font-bold text-foreground">CGHS / Railway / Job</span>
                </div>
                <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40">
                  <span className="text-[10px] text-muted-foreground block font-medium">GP Tax</span>
                  <span className="font-bold text-emerald-700">Clearance Required</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-3 border-t border-border/40">
                <Button
                  onClick={() => openCivilWorkflow("dependent")}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto flex-1 rounded-xl text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                >
                  <BookOpen size={14} />
                  <span>View Full Workflow & Rules</span>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="w-full sm:w-auto flex-1 rounded-xl bg-primary text-primary-foreground text-xs font-semibold gap-1.5 shadow-xs"
                >
                  <Link to="/public/apply/dependent">
                    <span>Citizen Apply Online</span>
                    <ArrowRight size={14} />
                  </Link>
                </Button>
                <Link to="/dependent-certificate" className="w-full sm:w-auto">
                  <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-foreground">
                    <Lock size={12} className="mr-1" /> Staff Drafting Tool
                  </Button>
                </Link>
              </div>
            </div>

            {/* Linkage Certificate - Coming Soon (Day 1 placeholder) */}
            <div className="rounded-2xl bg-white/50 backdrop-blur-sm border border-dashed border-border/50 shadow-sm p-5 animate-fade-in" style={{ animationDelay: "0.12s" }}>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <FileText className="text-muted-foreground" size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Linkage Certificate</p>
                  <p className="text-xs text-muted-foreground">Family / dependent linkage verification — in development</p>
                </div>
              </div>
              <Button className="w-full rounded-xl" size="sm" variant="secondary" disabled>
                Coming Soon
              </Button>
            </div>

            {/* WBPMS Certificates */}
            <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-border/40 shadow-sm overflow-hidden animate-fade-in" style={{ animationDelay: "0.16s" }}>
              <div className="px-4 py-3 bg-secondary/10 border-b border-secondary/20 flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">WBPMS Certificates (External Portal)</h3>
                <Link to="/wbpms-info" className="text-xs text-primary font-medium hover:underline">
                  Purpose & Doc Guide →
                </Link>
              </div>
              <div className="p-4 space-y-2">
                {[
                  { name: "Residential", key: "wbpms-residential" },
                  { name: "Character", key: "wbpms-character" },
                  { name: "Income", key: "wbpms-income" },
                  { name: "Same Person", key: "wbpms-same-person" },
                  { name: "Distance", key: "wbpms-distance" },
                  { name: "Caste Authentication", key: "wbpms-caste" },
                  { name: "Unmarried", key: "wbpms-unmarried" }
                ].map((cert, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => openGuide(cert.key)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/60 border border-border/30 hover:bg-secondary/5 transition-all group text-left"
                  >
                    <FileText size={16} className="text-secondary shrink-0" />
                    <span className="text-sm text-foreground flex-1">{cert.name} Certificate</span>
                    <ExternalLink size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === "notices" && (
          <div className="animate-fade-in space-y-4">
            <CitizenNoticeBoard />
          </div>
        )}

        {activeSection === "faq" && (
          <div className="animate-fade-in py-2">
            <CitizenFaqSection onSelectServiceGuide={openGuide} />
          </div>
        )}

        {activeSection === "help" && (
          <div className="animate-fade-in space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-foreground">Help, Citizen Guidance & Office Information</h2>
              <p className="text-xs text-muted-foreground">
                Get assistance regarding Gram Panchayat services, working hours, application submissions, and official communications.
              </p>
            </div>

            <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-border/50 shadow-sm p-5 sm:p-6 space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MapPin size={16} className="text-primary" />
                <span>Bagula II Gram Panchayat Office Address &amp; Contact</span>
              </h3>

              <div className="grid sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-primary font-semibold">
                    <MapPin size={14} />
                    <span>Location</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Vill: Stationpara, P.O.: Bagula, P.S.: Hanskhali, Dist: Nadia, PIN: 741502, West Bengal
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-primary font-semibold">
                    <Mail size={14} />
                    <span>Official Email</span>
                  </div>
                  <p className="text-foreground font-mono font-medium">bagula2nogp111@gmail.com</p>
                  <p className="text-[11px] text-muted-foreground">Monitored during office working days</p>
                </div>

                <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-primary font-semibold">
                    <Phone size={14} />
                    <span>Working Hours</span>
                  </div>
                  <p className="text-foreground font-semibold">Mon – Fri: 10:00 AM – 5:00 PM</p>
                  <p className="text-[11px] text-muted-foreground">Counters close at 3:30 PM</p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3 flex-wrap border-t border-border/30 text-xs">
                <span className="text-muted-foreground">
                  Need representative assistance for your ward/sansad?
                </span>
                <Link
                  to="/elected-representatives"
                  className="inline-flex items-center gap-1 text-primary font-semibold hover:underline"
                >
                  <span>View Elected Representatives &amp; Ward Members</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>

            <CitizenFaqSection onSelectServiceGuide={openGuide} className="pt-2" />
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="px-4 py-6 mt-6 max-w-2xl mx-auto">
        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          This website serves as a public facilitation platform of Bagula II Gram Panchayat.
          Certificates generated are draft-based and subject to official verification.
          No user data is stored on server. Use must comply with applicable laws of India.
        </p>
      </div>


      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/80 border-t border-border/50 no-print">
        <div className="max-w-2xl mx-auto flex items-center justify-around py-1.5 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveSection(item.id); setSearchQuery(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all duration-200 min-w-[56px] ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-all duration-200 ${isActive ? "bg-primary/10" : ""}`}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                </div>
                <span className={`text-[10px] font-medium ${isActive ? "font-semibold" : ""}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
        {/* Safe area for devices with home indicator */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>

      {/* Unified Service Information Viewer (Overview, Eligibility, Documents, SOP, Video, Form, Redirect) */}
      <ServiceInformationViewer
        guideKey={selectedGuideKey}
        initialGuide={redirectGuide}
        open={serviceViewerOpen}
        onOpenChange={setServiceViewerOpen}
      />

      {/* Safe External Redirect Modal with Workflows & Video Tutorials (Fallback) */}
      <ExternalRedirectModal
        guide={redirectGuide}
        open={redirectModalOpen}
        onOpenChange={setRedirectModalOpen}
      />

      {/* Civil Certificate (Warish & Dependent) Comprehensive Workflow Modal */}
      <CivilCertificateWorkflowModal
        open={civilWorkflowOpen}
        onOpenChange={setCivilWorkflowOpen}
        initialTab={civilWorkflowTab}
      />
    </div>
  );
}
