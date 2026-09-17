import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
  Calendar,
} from "lucide-react";
import { type RedirectGuide } from "@/data/redirectGuides";
import { useDynamicRedirectGuide } from "@/lib/sopMasterData";
import { validateRedirectDestination } from "@/lib/redirectSafety";

interface ExternalRedirectModalProps {
  guide: RedirectGuide | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExternalRedirectModal({
  guide: initialGuide,
  open,
  onOpenChange,
}: ExternalRedirectModalProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>("workflow");
  const [videoPlaying, setVideoPlaying] = useState<boolean>(false);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);

  const { guide: dynamicGuide } = useDynamicRedirectGuide(initialGuide?.id || "");
  const guide = dynamicGuide || initialGuide;

  if (!guide) return null;

  const redirectResult = validateRedirectDestination(guide.portalUrl);

  const executeRedirect = () => {
    onOpenChange(false);
    setShowExitConfirm(false);
    if (redirectResult.destinationType === "INTERNAL_ROUTE") {
      navigate(redirectResult.sanitizedUrl);
    } else if (redirectResult.isExternal) {
      window.open(redirectResult.sanitizedUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleProceed = () => {
    if (redirectResult.isExternal) {
      setShowExitConfirm(true);
    } else {
      executeRedirect();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl border border-primary/25 shadow-xl">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 p-5 border-b border-border/40">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="outline" className="bg-white/80 border-primary/30 text-primary font-medium text-[11px]">
              <Building2 size={12} className="mr-1 inline" /> {guide.category}
            </Badge>
            <Badge variant="secondary" className="text-[11px]">
              <Lock size={10} className="mr-1 inline text-emerald-600" /> Official Govt Portal
            </Badge>
            {guide.turnaroundTime && (
              <Badge variant="outline" className="text-[11px] bg-amber-50 text-amber-800 border-amber-200">
                <Clock size={10} className="mr-1 inline text-amber-600" /> {guide.turnaroundTime}
              </Badge>
            )}
          </div>

          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-lg sm:text-xl font-bold font-heading text-foreground flex items-center gap-2">
              <span>{guide.title}</span>
            </DialogTitle>
            <p className="text-sm font-semibold text-primary font-bengali">
              {guide.bengaliTitle}
            </p>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
              {guide.description}
            </DialogDescription>
            <p className="text-xs text-muted-foreground/90 font-bengali">
              {guide.bengaliDescription}
            </p>
          </DialogHeader>

          {guide.regulatoryInfo && (
            <div className="mt-3 p-2 rounded-lg bg-white/70 border border-border/40 flex items-start gap-2 text-[11px] text-muted-foreground">
              <ShieldCheck size={14} className="text-primary shrink-0 mt-0.5" />
              <span><strong>Regulatory Framework:</strong> {guide.regulatoryInfo}</span>
            </div>
          )}
        </div>

        {/* Content Body with Tabs */}
        <div className="p-5 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 w-full bg-muted/60 p-1 rounded-xl">
              <TabsTrigger value="workflow" className="text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                <Clock size={13} className="mr-1.5 hidden sm:inline" /> Workflow & Steps
              </TabsTrigger>
              <TabsTrigger value="documents" className="text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                <FileText size={13} className="mr-1.5 hidden sm:inline" /> Documents ({guide.documents.length})
              </TabsTrigger>
              <TabsTrigger value="video" className="text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                <PlayCircle size={13} className="mr-1.5 hidden sm:inline text-rose-500" /> Video Guide
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: WORKFLOW */}
            <TabsContent value="workflow" className="mt-4 space-y-3">
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-xs text-primary font-medium flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>Review the 5-step official submission workflow before leaving for the portal.</span>
              </div>

              <div className="space-y-3 mt-3">
                {guide.workflow.map((w) => (
                  <div key={w.step} className="flex gap-3.5 p-3 rounded-xl border border-border/40 bg-white/60 hover:bg-white transition-all shadow-2xs">
                    <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {w.step}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-1">
                        <h4 className="text-xs font-bold text-foreground">{w.title}</h4>
                        {w.bengaliTitle && (
                          <span className="text-[11px] font-medium text-primary font-bengali">
                            {w.bengaliTitle}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {w.description}
                      </p>
                      {w.tips && (
                        <p className="text-[11px] text-amber-700 bg-amber-50/70 border border-amber-200/50 p-1.5 rounded-lg">
                          💡 <strong>Pro Tip:</strong> {w.tips}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* TAB 2: REQUIRED DOCUMENTS */}
            <TabsContent value="documents" className="mt-4 space-y-3">
              <div className="p-3 rounded-xl bg-muted/50 border border-border/40 text-xs text-muted-foreground">
                Ensure all documents meet the file format and size limits specified below to avoid portal upload rejection.
              </div>

              <div className="grid gap-2.5">
                {guide.documents.map((doc, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-border/40 bg-white/70 flex items-start justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 size={16} className={doc.mandatory ? "text-primary mt-0.5 shrink-0" : "text-muted-foreground mt-0.5 shrink-0"} />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-foreground">{doc.name}</span>
                          {doc.mandatory ? (
                            <Badge variant="destructive" className="text-[10px] py-0 px-1.5">Mandatory</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5">Optional</Badge>
                          )}
                        </div>
                        {doc.bengaliName && (
                          <p className="text-[11px] text-primary font-medium font-bengali mt-0.5">
                            {doc.bengaliName}
                          </p>
                        )}
                        {doc.details && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {doc.details}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-block text-[10px] font-semibold bg-muted px-2 py-0.5 rounded-md text-foreground">
                        {doc.format}
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Max {doc.maxSize}</p>
                    </div>
                  </div>
                ))}
              </div>

              {guide.downloadFormUrl && (
                <div className="p-3.5 rounded-xl bg-accent/5 border border-accent/20 flex items-center justify-between gap-3 mt-3">
                  <div>
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Download size={14} className="text-accent" /> {guide.downloadFormLabel || "Download Official Form"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Print and fill this form before visiting the portal.
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline" className="rounded-xl border-accent/40 hover:bg-accent/10">
                    <a href={guide.downloadFormUrl} target="_blank" rel="noopener noreferrer">
                      Download PDF
                    </a>
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* TAB 3: VIDEO GUIDE & TUTORIAL */}
            <TabsContent value="video" className="mt-4 space-y-4">
              <div className="rounded-2xl border border-border/40 bg-white/80 overflow-hidden shadow-sm">
                {videoPlaying ? (
                  <div className="aspect-video w-full bg-black">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${guide.videoGuide.youtubeId || "Ww7o6H4qX2g"}?autoplay=1&rel=0`}
                      title={guide.videoGuide.title}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="relative aspect-video w-full bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex flex-col items-center justify-center text-center p-6 text-white group">
                    <div className="w-14 h-14 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-rose-600 transition cursor-pointer mb-3"
                      onClick={() => setVideoPlaying(true)}>
                      <PlayCircle size={32} className="ml-0.5" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-rose-300">
                      Step-by-Step Video Walkthrough
                    </p>
                    <h4 className="text-sm sm:text-base font-bold text-white max-w-md mt-1">
                      {guide.videoGuide.title}
                    </h4>
                    {guide.videoGuide.bengaliTitle && (
                      <p className="text-xs text-rose-200/90 font-bengali mt-0.5">
                        {guide.videoGuide.bengaliTitle}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-slate-300 mt-2">
                      <span>Channel: {guide.videoGuide.channel}</span>
                      {guide.videoGuide.duration && <span>· {guide.videoGuide.duration}</span>}
                    </div>
                    <Button
                      size="sm"
                      className="mt-3 bg-white text-slate-900 hover:bg-white/90 rounded-xl text-xs font-semibold gap-1.5"
                      onClick={() => setVideoPlaying(true)}
                    >
                      <PlayCircle size={14} className="text-rose-600" /> Watch Embedded Tutorial
                    </Button>
                  </div>
                )}

                <div className="p-4 space-y-3 bg-muted/20">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="text-xs font-bold text-foreground">
                      Key Highlights Covered in Tutorial:
                    </p>
                    <Button asChild variant="outline" size="sm" className="h-7 text-[11px] gap-1">
                      <a href={guide.videoGuide.youtubeUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink size={12} /> Open on YouTube
                      </a>
                    </Button>
                  </div>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    {guide.videoGuide.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary font-bold">✓</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Local Panchayat Office Advisory */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-900 leading-relaxed">
            🏛️ <strong>Bagula II Gram Panchayat Advisory:</strong> {guide.localOfficeNotice}
          </div>

          {/* Destination Verification Badge */}
          <div className="p-3 rounded-xl bg-muted/40 border border-border/40 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 truncate">
              <Lock size={13} className="text-emerald-600 shrink-0" />
              <span className="truncate text-muted-foreground">
                Target URL: <span className="font-mono text-foreground font-semibold">{guide.portalUrl}</span>
              </span>
            </div>
            <span className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider bg-emerald-100/70 px-2 py-0.5 rounded-sm shrink-0">
              Verified Govt URL
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border/40 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <Button
            variant="ghost"
            className="w-full sm:w-auto text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onOpenChange(false)}
          >
            Cancel / Stay on Bagula II GP
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {guide.downloadFormUrl && (
              <Button asChild variant="outline" size="sm" className="w-full sm:w-auto text-xs rounded-xl">
                {guide.downloadFormUrl.startsWith("/") ? (
                  <Link to={guide.downloadFormUrl} onClick={() => onOpenChange(false)}>
                    <Download size={13} className="mr-1" /> {guide.downloadFormLabel || "Form PDF"}
                  </Link>
                ) : (
                  <a href={guide.downloadFormUrl} target="_blank" rel="noopener noreferrer">
                    <Download size={13} className="mr-1" /> {guide.downloadFormLabel || "Form PDF"}
                  </a>
                )}
              </Button>
            )}
            <Button
              className="w-full sm:w-auto text-xs rounded-xl bg-primary text-primary-foreground font-medium shadow-sm gap-1.5"
              onClick={handleProceed}
            >
              <span>Proceed to Official Portal</span>
              <ArrowRight size={14} />
            </Button>
          </div>
        </div>

        {/* Safe Exit Confirmation Dialog */}
        <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
          <DialogContent className="max-w-md p-6 rounded-2xl border border-primary/30">
            <DialogHeader className="text-left space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
                <ExternalLink size={20} />
              </div>
              <DialogTitle className="text-base font-bold text-foreground">
                You are leaving the Bagula II Gram Panchayat website.
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                You will be redirected to the official government portal:
                <br />
                <span className="font-mono font-semibold text-foreground break-all mt-1 block">
                  {redirectResult.sanitizedUrl}
                </span>
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center justify-end gap-2.5 pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => setShowExitConfirm(false)}
              >
                Cancel / Stay on Bagula II GP
              </Button>
              <Button
                size="sm"
                className="rounded-xl text-xs bg-primary text-primary-foreground font-semibold"
                onClick={executeRedirect}
              >
                Continue to Official Website →
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
