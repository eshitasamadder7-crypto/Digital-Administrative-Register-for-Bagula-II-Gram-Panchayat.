import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ScrollText,
  Users,
  CheckCircle2,
  ArrowRight,
  Clock,
  Building2,
  FileCheck,
  ShieldCheck,
  Scale,
  Download,
  ExternalLink,
  Search,
  Sparkles,
  ChevronRight,
  BookOpen,
  Info,
} from "lucide-react";
import CivilCertificateWorkflowModal from "./CivilCertificateWorkflowModal";

interface CitizenServicesWorkflowSectionProps {
  onOpenRedirect?: (key: string) => void;
  onOpenWbpmsPurpose?: () => void;
}

export default function CitizenServicesWorkflowSection({
  onOpenRedirect,
  onOpenWbpmsPurpose,
}: CitizenServicesWorkflowSectionProps) {
  const [workflowModalOpen, setWorkflowModalOpen] = useState(false);
  const [initialWorkflowTab, setInitialWorkflowTab] = useState<"warish" | "dependent">("warish");

  const openWorkflow = (tab: "warish" | "dependent") => {
    setInitialWorkflowTab(tab);
    setWorkflowModalOpen(true);
  };

  return (
    <div className="space-y-8">
      {/* Hero Service Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-accent/10 border border-primary/20 p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-primary text-primary-foreground font-semibold text-xs px-2.5 py-0.5 shadow-xs">
              🏛️ Citizen Services Center
            </Badge>
            <Badge variant="outline" className="border-primary/30 text-primary bg-white/80 text-xs font-medium">
              Bagula II Gram Panchayat · Hanskhali Block
            </Badge>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Panchayat Civil Certificate Services & Official Workflows
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Directly apply for and track civil succession, inheritance, and dependency certificates issued by the Bagula II Gram Panchayat Pradhan, or review step-by-step procedures, legal requirements, and required documents.
          </p>
          <p className="text-xs sm:text-sm text-primary font-medium font-bengali">
            বগুলা ২ নং গ্রাম পঞ্চায়েত থেকে ওয়ারিশান ও নির্ভরশীলতা শংসাপত্র পাওয়ার সম্পূর্ণ নিয়মাবলী, নথিপত্র চেকলিস্ট ও অনলাইন আবেদন
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <Button
              onClick={() => openWorkflow("warish")}
              size="sm"
              className="rounded-xl bg-primary text-primary-foreground text-xs font-semibold gap-1.5 shadow-xs"
            >
              <ScrollText size={14} />
              <span>Warish Certificate Workflow</span>
            </Button>
            <Button
              onClick={() => openWorkflow("dependent")}
              size="sm"
              variant="outline"
              className="rounded-xl border-primary/30 bg-white/80 hover:bg-white text-primary text-xs font-semibold gap-1.5 shadow-xs"
            >
              <Users size={14} />
              <span>Dependent Certificate Workflow</span>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground gap-1"
            >
              <Link to="/verify">
                <Search size={13} />
                <span>Verify Issued Certificate</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* CORE SPOTLIGHT: WARISH & DEPENDENT WORKFLOW CARDS */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles size={18} className="text-accent" />
              <span>Direct Gram Panchayat Civil Certificates</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Core administrative certificates issued under West Bengal Panchayat Act, 1973 by GP Pradhan Smt. Susmita Biswas Barman
            </p>
          </div>
          <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
            2 Core Civil Services
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* CARD 1: WARISH (SUCCESSION) CERTIFICATE */}
          <Card className="p-6 rounded-2xl border border-border/70 hover:border-primary/40 transition-all shadow-sm flex flex-col justify-between space-y-5 bg-card/80">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0 shadow-2xs">
                    <ScrollText size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5 rounded-md">
                      Panchayat Civil Service
                    </span>
                    <h4 className="text-base sm:text-lg font-bold text-foreground mt-0.5">
                      Warish (Succession) Certificate
                    </h4>
                    <p className="text-xs font-medium text-primary font-bengali">
                      ওয়ারিশান / উত্তরাধিকার শংসাপত্র
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0">
                  Active
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Certifies the complete, lawful list of surviving legal heirs of a deceased resident of Bagula II GP under the Hindu Succession Act, 1956 (with 2005 equal rights amendment for daughters) and Indian Succession Act, 1925.
              </p>

              {/* Highlights & Metrics */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-muted/40 border border-border/40 text-center">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Steps</span>
                  <span className="text-xs font-bold text-foreground">6-Step Flow</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Required Docs</span>
                  <span className="text-xs font-bold text-foreground">7 Documents</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Turnaround</span>
                  <span className="text-xs font-bold text-foreground">7–15 Days</span>
                </div>
              </div>

              {/* Use Cases Pill Badges */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-foreground flex items-center gap-1">
                  <Scale size={12} className="text-primary" /> Permissible Purposes:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded-md text-foreground">
                    Land Mutation at BL&LRO (জমির নামজারি)
                  </span>
                  <span className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded-md text-foreground">
                    Bank Account / FD Settlement
                  </span>
                  <span className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded-md text-foreground">
                    Family Pension (PPO) Claim
                  </span>
                  <span className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded-md text-foreground">
                    Property Partition
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-border/50 space-y-2">
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <Button
                  type="button"
                  onClick={() => openWorkflow("warish")}
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
                  <Link to="/public/apply/warish">
                    <span>Apply Online</span>
                    <ArrowRight size={14} />
                  </Link>
                </Button>
              </div>
              <Button
                asChild
                variant="secondary"
                size="sm"
                className="w-full rounded-xl text-xs font-semibold gap-1.5 border border-primary/20 hover:bg-primary/10"
              >
                <Link to="/warish-application-form">
                  <Download size={13} />
                  <span>Download / Print Official A4 Application Form (আবেদনপত্র)</span>
                </Link>
              </Button>
            </div>
          </Card>

          {/* CARD 2: DEPENDENT CERTIFICATE */}
          <Card className="p-6 rounded-2xl border border-border/70 hover:border-primary/40 transition-all shadow-sm flex flex-col justify-between space-y-5 bg-card/80">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 shadow-2xs">
                    <Users size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                      Panchayat Civil Service
                    </span>
                    <h4 className="text-base sm:text-lg font-bold text-foreground mt-0.5">
                      Dependent Certificate
                    </h4>
                    <p className="text-xs font-medium text-primary font-bengali">
                      নির্ভরশীলতা / পোষ্য শংসাপত্র
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0">
                  Active
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Official attestation by Bagula II Gram Panchayat certifying that a family member resides with and is wholly dependent upon a serving/retired government, railway, defence, or private employee.
              </p>

              {/* Highlights & Metrics */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-muted/40 border border-border/40 text-center">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Steps</span>
                  <span className="text-xs font-bold text-foreground">5-Step Flow</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Required Docs</span>
                  <span className="text-xs font-bold text-foreground">7 Documents</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Turnaround</span>
                  <span className="text-xs font-bold text-foreground">3–7 Days</span>
                </div>
              </div>

              {/* Use Cases Pill Badges */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-foreground flex items-center gap-1">
                  <ShieldCheck size={12} className="text-primary" /> Permissible Purposes:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded-md text-foreground">
                    CGHS / WBHS Medical Card
                  </span>
                  <span className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded-md text-foreground">
                    Railway Passes & PTO
                  </span>
                  <span className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded-md text-foreground">
                    Compassionate Appointment (Died-in-Harness)
                  </span>
                  <span className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded-md text-foreground">
                    Education Fee Concession
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-border/50 flex flex-col sm:flex-row items-center gap-2">
              <Button
                type="button"
                onClick={() => openWorkflow("dependent")}
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
                  <span>Apply Online</span>
                  <ArrowRight size={14} />
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* QUICK WORKFLOW OVERVIEW TIMELINE */}
      <Card className="p-5 sm:p-6 rounded-2xl border border-border/70 bg-muted/20 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
              <Clock size={16} className="text-primary" />
              <span>Standard 5-Stage Verification Timeline at Bagula II GP</span>
            </h4>
            <p className="text-xs text-muted-foreground">
              How applications move from citizen submission to final digital issuance
            </p>
          </div>
          <Badge variant="outline" className="text-[11px] font-semibold">
            Sansad 1 to 18
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
          {[
            {
              num: "1",
              title: "Preparation",
              desc: "Gather death proof / pay slip, clear GP tax, execute sworn affidavit.",
              role: "Citizen",
            },
            {
              num: "2",
              title: "Sansad Enquiry",
              desc: "Physical spot enquiry by elected ward member with 2 local witnesses.",
              role: "Ward Member",
            },
            {
              num: "3",
              title: "DEO / Online Filing",
              desc: "Upload scans on Citizen Portal or file physical file at GP counter.",
              role: "DEO Desk",
            },
            {
              num: "4",
              title: "Office Scrutiny",
              desc: "Assessment check by Executive Assistant & GP Secretary; notice if needed.",
              role: "GP Executive",
            },
            {
              num: "5",
              title: "Pradhan Approval",
              desc: "Pradhan signs digitally with cryptographic QR code verification ID.",
              role: "GP Pradhan",
            },
          ].map((st) => (
            <div key={st.num} className="p-3 rounded-xl bg-white/80 border border-border/40 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                  {st.num}
                </span>
                <span className="text-[9px] font-semibold text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded">
                  {st.role}
                </span>
              </div>
              <p className="text-xs font-bold text-foreground mt-1">{st.title}</p>
              <p className="text-[11px] text-muted-foreground leading-snug">{st.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Interactive Modal Component */}
      <CivilCertificateWorkflowModal
        open={workflowModalOpen}
        onOpenChange={setWorkflowModalOpen}
        initialTab={initialWorkflowTab}
      />
    </div>
  );
}
