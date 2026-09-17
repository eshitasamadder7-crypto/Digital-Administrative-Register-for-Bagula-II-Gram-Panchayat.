import React, { useState, useMemo } from "react";
import {
  HelpCircle,
  Search,
  ChevronDown,
  FileText,
  ExternalLink,
  PhoneCall,
  Calendar,
  Building2,
  Users,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";

export interface FaqItem {
  id: string;
  category: "certificates" | "birth_death" | "trade" | "tax" | "schemes" | "office";
  categoryLabel: string;
  question: string;
  bengaliQuestion?: string;
  answer: string;
  highlights?: string[];
  actionLink?: {
    label: string;
    to?: string;
    href?: string;
    isExternal?: boolean;
    onClick?: () => void;
  };
}

const FAQ_DATA: FaqItem[] = [
  {
    id: "warish-certificate-eligibility",
    category: "certificates",
    categoryLabel: "Civil Certificates",
    question: "What is a Warish (Legal Heir) Certificate and who is eligible to apply?",
    bengaliQuestion: "ওয়ারিশ (উত্তরাধিকার) সার্টিফিকেট কি এবং কারা আবেদন করতে পারেন?",
    answer:
      "A Warish (Legal Heir / Succession) Certificate is an official document certifying all the surviving legal successors of a deceased resident of Bagula II Gram Panchayat. It is required for land mutation (BL&LRO), settling bank claims, provident fund release, property partition, and life insurance payouts.",
    highlights: [
      "Applicant must be a bonafide legal heir or spouse",
      "Deceased must have had permanent residence within Bagula II GP",
      "Official certificate includes computerized QR verification",
    ],
    actionLink: {
      label: "Apply for Warish Certificate",
      to: "/public/apply/warish",
    },
  },
  {
    id: "warish-required-documents",
    category: "certificates",
    categoryLabel: "Civil Certificates",
    question: "What documents are required to apply for a Warish Certificate?",
    bengaliQuestion: "ওয়ারিশ সার্টিফিকেটের জন্য কি কি নথি প্রয়োজন?",
    answer:
      "You must submit: (1) Death Certificate of the deceased person, (2) Aadhaar & EPIC (Voter ID) cards of all surviving legal heirs, (3) Recent land tax / property receipt or Khatian if land matters are involved, and (4) Self-declaration of surviving family members.",
    highlights: [
      "Original death certificate required",
      "Voter ID / Aadhaar of all legal heirs",
      "Self-declaration / family tree",
    ],
    actionLink: {
      label: "View Civil Certificate Workflow",
      to: "/public/apply/warish",
    },
  },
  {
    id: "dependent-certificate-purpose",
    category: "certificates",
    categoryLabel: "Civil Certificates",
    question: "What is a Dependent Certificate and where is it used?",
    bengaliQuestion: "ডিপেন্ডেন্ট (নির্ভরশীলতা) সার্টিফিকেট কোথায় লাগে?",
    answer:
      "A Dependent Certificate authenticates that family members (such as elderly parents, minor children, or unmarried siblings) were fully dependent upon the primary breadwinner or deceased government employee. It is widely demanded for compassionate government jobs, family pension processing, defense rally recruitments, and ration card updates.",
    highlights: [
      "Verifies financial dependence on the primary earner",
      "Mandatory for compassionate appointment & pension",
      "Verified by the Upa-Pradhan / Pradhan",
    ],
    actionLink: {
      label: "Apply for Dependent Certificate",
      to: "/public/apply/dependent",
    },
  },
  {
    id: "linkage-certificate-genealogy",
    category: "certificates",
    categoryLabel: "Civil Certificates",
    question: "What is a Linkage Certificate and how does it prove family lineage?",
    bengaliQuestion: "লিঙ্কেজ সার্টিফিকেট কিভাবে বংশ পরিচয় প্রমাণ করে?",
    answer:
      "A Linkage Certificate establishes the direct hereditary line connecting an applicant to their ancestral forefather (father, grandfather, or original recorded landowner). It bridges name discrepancies across old land deeds, CS/RS/LR Khatians, and modern identification records.",
    highlights: [
      "Traces ancestral bloodline to grandfather/ancestor",
      "Accepted by land revenue offices and civil courts",
      "Digitally sealed by Bagula II Gram Panchayat",
    ],
    actionLink: {
      label: "Apply for Linkage Certificate",
      to: "/public/apply/linkage",
    },
  },
  {
    id: "birth-digitization-schedule",
    category: "birth_death",
    categoryLabel: "Birth & Death",
    question: "When are applications accepted for legacy Birth & Death Certificate digitization?",
    bengaliQuestion: "জন্ম ও মৃত্যু সনদ ডিজিটালাইজেশন আবেদন কবে জমা নেওয়া হয়?",
    answer:
      "As per the official Gram Panchayat resolution, applications for offline legacy Birth Certificate digitization are received exclusively on the first Tuesday and first Wednesday of every month at the GP office counter. The processing intake is capped at 100 applications per day (total 300 per monthly quota).",
    highlights: [
      "Accepted on 1st Tuesday & 1st Wednesday of each month",
      "Daily intake limit: 100 applications/day",
      "Monthly quota: 300 applications",
    ],
    actionLink: {
      label: "View Birth Digitalization Rule",
      to: "/public/login",
    },
  },
  {
    id: "birth-required-documents",
    category: "birth_death",
    categoryLabel: "Birth & Death",
    question: "What documents must be submitted for Birth Certificate digitization?",
    bengaliQuestion: "জন্ম সনদ ডিজিটাইজেশনের জন্য কি কি কাগজ দিতে হবে?",
    answer:
      "Citizens must bring: (1) Original hospital discharge certificate or institutional birth record, (2) Immunization / vaccination card with hospital stamp, (3) Aadhaar and Voter ID of both parents, and (4) Existing handwritten birth certificate copy if available.",
    highlights: [
      "Hospital discharge slip / birth report",
      "Child immunization card",
      "Parent identification (Aadhaar & EPIC)",
    ],
  },
  {
    id: "trade-license-wbpms",
    category: "trade",
    categoryLabel: "Trade License",
    question: "How can local business owners obtain or renew their Trade License (Pro-Prampatra)?",
    bengaliQuestion: "ট্রেড লাইসেন্স (প্র-প্রমাণপত্র) কিভাবে পাবেন বা নবায়ন করবেন?",
    answer:
      "Commercial entities, retail shops, wholesale depots, and small cottage industries within Bagula II GP jurisdiction can apply for fresh registration or renew their existing trade license online via the West Bengal Panchayat Management System (WBPMS). Instant payment and computerized license download are supported.",
    highlights: [
      "Apply online 24/7 on WBPMS portal",
      "Annual renewal or 3-year consolidated tenure",
      "Free facilitation kiosk at GP office",
    ],
    actionLink: {
      label: "Open WBPMS Trade Portal",
      href: "https://wbpms.gov.in",
      isExternal: true,
    },
  },
  {
    id: "property-tax-prd",
    category: "tax",
    categoryLabel: "Panchayat Tax",
    question: "How and where can residents pay their Panchayati Raj Property Tax (PRD Tax)?",
    bengaliQuestion: "পঞ্চায়েত গৃহ ও সম্পত্তি কর (PRD Tax) কিভাবে দেবেন?",
    answer:
      "Property tax can be cleared directly at the Bagula II Gram Panchayat cash collection counter or online through the PRD Tax portal using your Assessment Holding Number. Paying on time ensures computer-generated QR receipts necessary for building plan sanctions and bank loan verification.",
    highlights: [
      "Online payment via PRD Tax portal or offline counter",
      "Immediate QR-code verified tax receipt",
      "Required for property mutation & building sanction",
    ],
    actionLink: {
      label: "Pay PRD Tax Online",
      href: "https://prdtax.wb.gov.in",
      isExternal: true,
    },
  },
  {
    id: "mgnrega-job-card",
    category: "schemes",
    categoryLabel: "Social Welfare",
    question: "How can rural households get a new MGNREGA Job Card?",
    bengaliQuestion: "১০০ দিনের কাজের জব কার্ড কিভাবে পাবেন?",
    answer:
      "Every adult resident of a rural household in Bagula II GP who is willing to perform unskilled manual labor can apply. Submit Form 1 along with family Aadhaar cards, bank passbook copies, and passport photos to the Gram Rozgar Sahayak (GRS) at the Gram Panchayat office.",
    highlights: [
      "Free registration for all adult rural residents",
      "Direct Benefit Transfer (DBT) into bank/post office account",
      "Contact your booth representative or GRS",
    ],
    actionLink: {
      label: "Check MGNREGA Workers List",
      href: "https://mnregaweb2.dord.gov.in/Netnrega/writereaddata/citizen_out/panchregpeople_3201003002_eng2627.html",
      isExternal: true,
    },
  },
  {
    id: "office-hours-contact",
    category: "office",
    categoryLabel: "Office & Contact",
    question: "What are the Gram Panchayat office hours and how can I contact the Pradhan?",
    bengaliQuestion: "গ্রাম পঞ্চায়েত অফিসের সময়সূচি ও প্রধানের সাথে যোগাযোগের নিয়ম কি?",
    answer:
      "The Gram Panchayat office operates Monday through Friday from 10:00 AM to 5:00 PM (except gazetted holidays). Public document intake counters are open from 10:30 AM to 3:30 PM. You can visit the office at Stationpara, P.O. Bagula, Hanskhali, Nadia, or email bagula2nogp111@gmail.com.",
    highlights: [
      "Working Days: Monday – Friday (10:00 AM – 5:00 PM)",
      "Citizen Counters: 10:30 AM – 3:30 PM",
      "Location: Stationpara, Bagula, Nadia",
    ],
    actionLink: {
      label: "View Elected Representatives",
      to: "/elected-representatives",
    },
  },
];

interface CitizenFaqSectionProps {
  onSelectServiceGuide?: (guideKey: string) => void;
  className?: string;
}

export function CitizenFaqSection({ onSelectServiceGuide, className = "" }: CitizenFaqSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({
    "warish-certificate-eligibility": true,
    "birth-digitization-schedule": true,
  });

  const categories = [
    { id: "all", label: "All Questions", icon: Sparkles },
    { id: "certificates", label: "Civil Certificates", icon: FileText },
    { id: "birth_death", label: "Birth & Death", icon: Calendar },
    { id: "trade", label: "Trade License", icon: Building2 },
    { id: "tax", label: "Property Tax", icon: FileText },
    { id: "schemes", label: "Welfare & MGNREGA", icon: Users },
    { id: "office", label: "Office & Contact", icon: PhoneCall },
  ];

  const toggleItem = (id: string) => {
    setOpenIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    const allOpen: Record<string, boolean> = {};
    FAQ_DATA.forEach((item) => {
      allOpen[item.id] = true;
    });
    setOpenIds(allOpen);
  };

  const collapseAll = () => {
    setOpenIds({});
  };

  const filteredFaqs = useMemo(() => {
    return FAQ_DATA.filter((item) => {
      const matchCategory = selectedCategory === "all" || item.category === selectedCategory;
      if (!matchCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        item.question.toLowerCase().includes(q) ||
        item.bengaliQuestion?.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.categoryLabel.toLowerCase().includes(q) ||
        item.highlights?.some((h) => h.toLowerCase().includes(q))
      );
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div id="faq-section" className={`w-full max-w-4xl mx-auto space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
          <HelpCircle size={14} />
          <span>Citizen Information Desk</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Frequently Asked Questions
        </h2>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Clear answers regarding Warish certificates, birth record digitization schedules, trade licenses, and Gram Panchayat procedures.
        </p>
      </div>

      {/* Search and Filter Controls */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
          <input
            type="search"
            aria-label="Search FAQs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search inquiries (e.g., warish, birth digitization, trade license, tax)..."
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/90 backdrop-blur-sm border border-border/70 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all placeholder:text-muted-foreground/60"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-150 ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                    : "bg-white/70 hover:bg-white text-muted-foreground hover:text-foreground border border-border/40"
                }`}
              >
                <Icon size={13} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Controls info bar */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>
            Showing <strong>{filteredFaqs.length}</strong> of {FAQ_DATA.length} inquiries
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={expandAll}
              className="text-primary hover:underline font-medium"
            >
              Expand All
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={collapseAll}
              className="text-muted-foreground hover:text-foreground hover:underline"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* Accordion List */}
      <div className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <div className="rounded-2xl bg-white/70 border border-border/40 p-8 text-center space-y-2">
            <HelpCircle size={32} className="text-muted-foreground/40 mx-auto" />
            <p className="text-sm font-semibold text-foreground">No matching inquiries found</p>
            <p className="text-xs text-muted-foreground">
              Try adjusting your search terms or select "All Questions". You can also reach our office directly.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                className="px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/15 transition-colors"
              >
                Reset Search Filters
              </button>
            </div>
          </div>
        ) : (
          filteredFaqs.map((faq) => {
            const isOpen = !!openIds[faq.id];
            return (
              <div
                key={faq.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? "bg-white/90 border-primary/40 shadow-sm"
                    : "bg-white/70 hover:bg-white/90 border-border/50 hover:border-border"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleItem(faq.id)}
                  className="w-full flex items-start justify-between gap-4 p-4 text-left cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <div className="space-y-1 pr-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
                        {faq.categoryLabel}
                      </span>
                      {faq.bengaliQuestion && (
                        <span className="text-xs text-muted-foreground/80 font-serif">
                          {faq.bengaliQuestion}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm sm:text-base font-semibold text-foreground leading-snug">
                      {faq.question}
                    </h3>
                  </div>
                  <div
                    className={`p-1 rounded-full text-muted-foreground transition-transform duration-200 shrink-0 mt-0.5 ${
                      isOpen ? "rotate-180 text-primary bg-primary/10" : "bg-muted/40"
                    }`}
                  >
                    <ChevronDown size={18} />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 pt-1 border-t border-border/30 space-y-3 animate-fade-in text-sm text-muted-foreground leading-relaxed">
                    <p>{faq.answer}</p>

                    {faq.highlights && faq.highlights.length > 0 && (
                      <div className="bg-primary/5 rounded-xl p-3 border border-primary/10 space-y-1.5">
                        <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                          Key Citizen Highlights:
                        </p>
                        <ul className="text-xs text-foreground/80 space-y-1 list-disc pl-4">
                          {faq.highlights.map((h, idx) => (
                            <li key={idx}>{h}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {faq.actionLink && (
                      <div className="pt-1 flex items-center gap-2">
                        {faq.actionLink.to ? (
                          <Link
                            to={faq.actionLink.to}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                          >
                            <span>{faq.actionLink.label}</span>
                            <ArrowRight size={13} />
                          </Link>
                        ) : faq.actionLink.href ? (
                          <a
                            href={faq.actionLink.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                          >
                            <span>{faq.actionLink.label}</span>
                            <ExternalLink size={13} />
                          </a>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Still need help callout */}
      <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border border-primary/20 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h4 className="text-sm font-bold text-foreground">Have a specific case or unresolved query?</h4>
          <p className="text-xs text-muted-foreground">
            Contact Bagula II Gram Panchayat office during official hours (10:00 AM – 5:00 PM).
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="mailto:bagula2nogp111@gmail.com"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            Email Panchayat Office
          </a>
          <Link
            to="/elected-representatives"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-gray-50 text-foreground border border-border/70 transition-colors"
          >
            Booth Representatives
          </Link>
        </div>
      </div>
    </div>
  );
}
