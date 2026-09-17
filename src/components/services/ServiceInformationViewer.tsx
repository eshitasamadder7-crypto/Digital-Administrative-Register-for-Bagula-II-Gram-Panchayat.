import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ExternalLink,
  Download,
  ArrowRight,
  ShieldCheck,
  Clock,
  FileText,
  PlayCircle,
  AlertCircle,
  CheckCircle2,
  Building2,
  Lock,
  BookOpen,
  Users,
  Calendar,
  AlertTriangle,
  X,
  Share2,
  Check,
} from "lucide-react";
import { type RedirectGuide } from "@/data/redirectGuides";
import { useDynamicRedirectGuide, extractYouTubeId } from "@/lib/sopMasterData";
import { validateRedirectDestination } from "@/lib/redirectSafety";
import { toast } from "sonner";

interface ServiceInformationViewerProps {
  guideKey: string;
  initialGuide?: RedirectGuide | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  inline?: boolean;
}

export function ServiceInformationViewer({
  guideKey,
  initialGuide,
  open = true,
  onOpenChange,
  inline = false,
}: ServiceInformationViewerProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [videoPlaying, setVideoPlaying] = useState<boolean>(false);
  const [showExitModal, setShowExitModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const { guide: dynamicGuide } = useDynamicRedirectGuide(guideKey);
  const guide = dynamicGuide || initialGuide;

  const ytId = useMemo(() => {
    if (!guide?.videoGuide?.youtubeUrl) return guide?.videoGuide?.youtubeId || "";
    return extractYouTubeId(guide.videoGuide.youtubeUrl) || guide.videoGuide?.youtubeId || "";
  }, [guide?.videoGuide]);

  if (!guide) return null;

  const redirectResult = validateRedirectDestination(guide.portalUrl);

  const handleProceedToDestination = () => {
    setShowExitModal(false);
    if (onOpenChange) onOpenChange(false);

    if (redirectResult.destinationType === "INTERNAL_ROUTE") {
      navigate(redirectResult.sanitizedUrl);
    } else if (redirectResult.isExternal) {
      window.open(redirectResult.sanitizedUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleInitiateRedirect = () => {
    if (redirectResult.destinationType === "INTERNAL_ROUTE") {
      handleProceedToDestination();
    } else {
      setShowExitModal(true);
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Service information link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const content = (
    <div className="flex flex-col bg-background text-foreground rounded-2xl overflow-hidden border border-border/40 shadow-xl max-w-4xl mx-auto w-full">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-accent/15 p-5 sm:p-6 border-b border-border/50 relative">
        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="bg-white/80 dark:bg-slate-900/80 border-primary/30 text-primary font-medium text-xs">
              <Building2 size={13} className="mr-1 inline" /> {guide.category}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <Lock size={11} className="mr-1 inline text-emerald-600" /> Official Govt Service
            </Badge>
            {guide.turnaroundTime && (
              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200">
                <Clock size={11} className="mr-1 inline text-amber-600" /> {guide.turnaroundTime}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
              title="Share service"
            >
              {copied ? <Check size={14} className="text-emerald-600 mr-1" /> : <Share2 size={14} className="mr-1" />}
              {copied ? "Copied" : "Share"}
            </Button>
            {onOpenChange && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </Button>
            )}
          </div>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground">
          {guide.title}
        </h1>
        <p className="text-base font-semibold text-primary font-bengali mt-0.5">
          {guide.bengaliTitle}
        </p>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-2 max-w-3xl">
          {guide.description}
        </p>
        {guide.bengaliDescription && (
          <p className="text-xs text-muted-foreground/90 font-bengali mt-1">
            {guide.bengaliDescription}
          </p>
        )}

        {guide.regulatoryInfo && (
          <div className="mt-3 p-2.5 rounded-xl bg-white/75 dark:bg-slate-900/60 border border-border/40 flex items-start gap-2.5 text-xs text-muted-foreground">
            <ShieldCheck size={16} className="text-primary shrink-0 mt-0.5" />
            <div>
              <strong className="text-foreground">Regulatory Authority & Framework: </strong>
              <span>{guide.regulatoryInfo}</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">
        <div className="border-b border-border/40 bg-muted/25 px-4 overflow-x-auto">
          <TabsList className="h-11 bg-transparent p-0 flex space-x-1 sm:space-x-2">
            <TabsTrigger
              value="overview"
              className="text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg px-3 py-1.5"
            >
              <BookOpen size={13} className="mr-1.5 inline" /> Overview
            </TabsTrigger>
            <TabsTrigger
              value="eligibility"
              className="text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg px-3 py-1.5"
            >
              <Users size={13} className="mr-1.5 inline" /> Eligibility & Purpose
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg px-3 py-1.5"
            >
              <FileText size={13} className="mr-1.5 inline" /> Documents ({guide.documents?.length || 0})
            </TabsTrigger>
            <TabsTrigger
              value="workflow"
              className="text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg px-3 py-1.5"
            >
              <ShieldCheck size={13} className="mr-1.5 inline" /> SOP & Steps ({guide.workflow?.length || 0})
            </TabsTrigger>
            {guide.videoGuide && (
              <TabsTrigger
                value="video"
                className="text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg px-3 py-1.5"
              >
                <PlayCircle size={13} className="mr-1.5 inline text-rose-600" /> Video Guide
              </TabsTrigger>
            )}
            <TabsTrigger
              value="downloads"
              className="text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg px-3 py-1.5"
            >
              <Download size={13} className="mr-1.5 inline" /> Downloads
            </TabsTrigger>
            <TabsTrigger
              value="advisory"
              className="text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg px-3 py-1.5"
            >
              <AlertCircle size={13} className="mr-1.5 inline text-amber-600" /> Advisory
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="p-5 sm:p-6 space-y-5 flex-1 focus-visible:outline-none">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Issuing Authority</span>
              <p className="text-xs font-bold text-foreground mt-1 flex items-center gap-1.5">
                <Building2 size={14} className="text-primary" />
                {guide.officialDept || "Bagula II Gram Panchayat"}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Turnaround Time</span>
              <p className="text-xs font-bold text-foreground mt-1 flex items-center gap-1.5">
                <Clock size={14} className="text-amber-600" />
                {guide.turnaroundTime || "7 - 15 Working Days"}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Statutory Fees</span>
              <p className="text-xs font-bold text-foreground mt-1 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-600" />
                {guide.feeInfo || "Free of charge / Nil statutory fee"}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground">Service Description & Administrative Scope</h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {guide.description}
            </p>
            {guide.bengaliDescription && (
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-bengali">
                {guide.bengaliDescription}
              </p>
            )}
          </div>

          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
            <h4 className="text-xs font-bold text-primary flex items-center gap-2">
              <Lock size={14} /> Official Government Portal Verification
            </h4>
            <p className="text-xs text-muted-foreground">
              This service is officially processed through{" "}
              <strong className="text-foreground">{guide.portalName}</strong>. Bagula II Gram Panchayat
              provides decentralized pre-verification, document scrutiny, and Sub-Registrar attestation.
            </p>
            <div className="pt-2">
              <Button
                onClick={handleInitiateRedirect}
                className="rounded-xl shadow-sm text-xs font-semibold gap-1.5"
                size="sm"
              >
                <span>Proceed to Application / Portal</span>
                <ArrowRight size={14} />
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Eligibility & Purpose */}
        <TabsContent value="eligibility" className="p-5 sm:p-6 space-y-4 flex-1 focus-visible:outline-none">
          <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-2">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Users size={16} className="text-primary" /> Qualifying Eligibility Criteria
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {guide.eligibility ||
                "Applicant must be an ordinary or permanent resident of Bagula II Gram Panchayat (Hanskhali Block, Nadia District), residing in any of the 30 Gram Sansad Wards (Bagula Station Para, College Para, Puratanpara, Madhyapara, Bara Muragacha, Muragacha Colony, Milannagar, Sahapur, Hatibandha, Santinagar, or Madna)."}
            </p>
          </div>

          {guide.purposes && guide.purposes.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Accepted Uses & Statutory Purposes
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {guide.purposes.map((p, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-border/40 flex items-start gap-2.5 text-xs text-foreground">
                    <CheckCircle2 size={15} className="text-primary shrink-0 mt-0.5" />
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab 3: Documents Checklist */}
        <TabsContent value="documents" className="p-5 sm:p-6 space-y-4 flex-1 focus-visible:outline-none">
          <div>
            <h3 className="text-sm font-bold text-foreground">Mandatory & Supporting Documents Checklist</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Keep original documents ready for physical verification at the Bagula II Gram Panchayat office.
            </p>
          </div>

          <div className="divide-y divide-border/40 border border-border/40 rounded-xl overflow-hidden bg-white/60 dark:bg-slate-900/40">
            {guide.documents.map((doc, idx) => (
              <div key={idx} className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs sm:text-sm font-semibold text-foreground">{doc.name}</p>
                    {doc.mandatory ? (
                      <Badge className="bg-rose-500 text-white text-[10px] font-semibold">Mandatory</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">Optional / Supporting</Badge>
                    )}
                  </div>
                  {doc.bengaliName && (
                    <p className="text-xs text-primary font-bengali">{doc.bengaliName}</p>
                  )}
                  {doc.details && (
                    <p className="text-xs text-muted-foreground">{doc.details}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 text-[11px] text-muted-foreground">
                  <span className="px-2 py-0.5 rounded bg-muted font-mono">{doc.format}</span>
                  <span className="px-2 py-0.5 rounded bg-muted font-mono">Max {doc.maxSize}</span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Tab 4: SOP & Workflow Steps */}
        <TabsContent value="workflow" className="p-5 sm:p-6 space-y-4 flex-1 focus-visible:outline-none">
          <div>
            <h3 className="text-sm font-bold text-foreground">Step-by-Step Standard Operating Procedure (SOP)</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Authorized guidance based on West Bengal Directorate of Panchayats & Rural Development regulations.
            </p>
          </div>

          <div className="space-y-3">
            {guide.workflow.map((st, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-border/40 bg-white/70 dark:bg-slate-900/50 shadow-xs flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  {st.step || idx + 1}
                </div>
                <div className="space-y-1.5 flex-1 min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-foreground">{st.title}</h4>
                  {st.bengaliTitle && (
                    <p className="text-xs font-semibold text-primary font-bengali">{st.bengaliTitle}</p>
                  )}
                  <p className="text-xs text-muted-foreground leading-relaxed">{st.description}</p>
                  {st.tips && (
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-900 dark:text-amber-200">
                      💡 <strong>Panchayat Tip:</strong> {st.tips}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Tab 5: Video Tutorial */}
        {guide.videoGuide && (
          <TabsContent value="video" className="p-5 sm:p-6 space-y-4 flex-1 focus-visible:outline-none">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-foreground">{guide.videoGuide.title}</h3>
                {guide.videoGuide.bengaliTitle && (
                  <p className="text-xs font-semibold text-primary font-bengali">{guide.videoGuide.bengaliTitle}</p>
                )}
              </div>
              <Button asChild variant="outline" size="sm" className="text-xs gap-1.5 rounded-xl">
                <a href={guide.videoGuide.youtubeUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={13} /> Open on YouTube
                </a>
              </Button>
            </div>

            <div className="rounded-xl overflow-hidden border border-border/40 bg-slate-950 aspect-video shadow-md flex items-center justify-center relative">
              {videoPlaying && ytId ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0`}
                  title={guide.videoGuide.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="text-center p-6 space-y-3">
                  <PlayCircle size={48} className="text-rose-500 mx-auto animate-pulse cursor-pointer" onClick={() => setVideoPlaying(true)} />
                  <p className="text-xs text-slate-300 font-medium max-w-sm mx-auto">
                    Click to play the step-by-step video tutorial directly inside this portal.
                  </p>
                  <Button
                    size="sm"
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs rounded-xl shadow-xs"
                    onClick={() => setVideoPlaying(true)}
                  >
                    Play Tutorial
                  </Button>
                </div>
              )}
            </div>

            {guide.videoGuide.highlights && guide.videoGuide.highlights.length > 0 && (
              <div className="p-4 rounded-xl bg-muted/20 border border-border/40 space-y-2">
                <p className="text-xs font-bold text-foreground">Video Walkthrough Key Highlights:</p>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {guide.videoGuide.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary font-bold">✓</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>
        )}

        {/* Tab 6: Downloads */}
        <TabsContent value="downloads" className="p-5 sm:p-6 space-y-4 flex-1 focus-visible:outline-none">
          <h3 className="text-sm font-bold text-foreground">Official Forms & Downloadable Templates</h3>

          <div className="space-y-2.5">
            {guide.downloadFormUrl && (
              <div className="p-4 rounded-xl border border-primary/25 bg-primary/5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                    <FileText size={20} />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-foreground">
                      {guide.downloadFormLabel || "Standard Official Application Form (PDF)"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Official blank physical application format for printing & office submission.
                    </p>
                  </div>
                </div>

                {guide.downloadFormUrl.startsWith("/") ? (
                  <Button asChild size="sm" className="rounded-xl text-xs gap-1.5 shrink-0">
                    <Link to={guide.downloadFormUrl} onClick={() => onOpenChange?.(false)}>
                      <Download size={13} /> Open Form
                    </Link>
                  </Button>
                ) : (
                  <Button asChild size="sm" className="rounded-xl text-xs gap-1.5 shrink-0">
                    <a href={guide.downloadFormUrl} target="_blank" rel="noopener noreferrer">
                      <Download size={13} /> Download
                    </a>
                  </Button>
                )}
              </div>
            )}

            {/* Static companion links for ease of citizen access */}
            <div className="p-3.5 rounded-xl border border-border/40 bg-muted/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-foreground">Citizen Document Checklist Booklet</p>
                  <p className="text-[10px] text-muted-foreground">Bagula II Gram Panchayat Comprehensive Citizen Charter</p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-xl text-xs">
                <Link to="/wbpms-info">View Booklet</Link>
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Tab 7: Advisory */}
        <TabsContent value="advisory" className="p-5 sm:p-6 space-y-4 flex-1 focus-visible:outline-none">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-950 dark:text-amber-200 space-y-2">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600" />
              Official Bagula II Gram Panchayat Notice & Advisory
            </h3>
            <p className="text-xs leading-relaxed">
              {guide.localOfficeNotice ||
                "Citizens are strictly advised to verify that English and Bengali spellings on Aadhaar, Voter Card (EPIC), and Land Records match exactly before submission. In case of any discrepancy, consult your local Gram Sansad Ward Member or the Panchayat Executive Assistant during public visiting hours (11:00 AM to 3:00 PM, Monday to Friday)."}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-2 text-xs text-muted-foreground">
            <h4 className="font-bold text-foreground">Local Contact & Helpdesk:</h4>
            <p>Office of the Bagula II Gram Panchayat, Hanskhali Block, Nadia, West Bengal.</p>
            <p>Email: <span className="font-mono text-foreground">bagula2nogp111@gmail.com</span></p>
            <p>Jurisdiction: 30 Wards under Nadia District Administration.</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Persistent Footer Actions */}
      <div className="p-4 border-t border-border/40 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground truncate w-full sm:w-auto">
          <Lock size={13} className="text-emerald-600 shrink-0" />
          <span className="truncate">
            Target Destination: <strong className="font-mono text-foreground">{guide.portalUrl}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {onOpenChange && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs w-full sm:w-auto"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          )}

          <Button
            size="sm"
            className="rounded-xl text-xs bg-primary text-primary-foreground font-semibold shadow-sm gap-1.5 w-full sm:w-auto"
            onClick={handleInitiateRedirect}
          >
            <span>Continue to Service</span>
            <ArrowRight size={14} />
          </Button>
        </div>
      </div>

      {/* Safe External Exit Confirmation Dialog */}
      <Dialog open={showExitModal} onOpenChange={setShowExitModal}>
        <DialogContent className="max-w-md p-6 rounded-2xl border border-primary/30">
          <DialogHeader className="text-left space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
              <ExternalLink size={20} />
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              You are leaving the Bagula II Gram Panchayat website.
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              You are now navigating to the external official government service portal:
              <br />
              <span className="font-mono font-semibold text-foreground break-all mt-1 block">
                {redirectResult.sanitizedUrl}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 rounded-xl bg-muted/40 border border-border/40 text-[11px] text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">Notice:</p>
            <p>Bagula II Gram Panchayat does not control external server availability or third-party cookies. Please ensure you keep your OTP credentials secure.</p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => setShowExitModal(false)}
            >
              Cancel / Stay on Bagula II GP
            </Button>
            <Button
              size="sm"
              className="rounded-xl text-xs bg-primary text-primary-foreground font-semibold"
              onClick={handleProceedToDestination}
            >
              Continue to Official Website →
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (inline) {
    return content;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl border-none shadow-2xl">
        {content}
      </DialogContent>
    </Dialog>
  );
}
