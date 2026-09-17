import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Copy,
  Check,
  Building2,
  FileCheck,
  Target,
  Search,
  HelpCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { CERTIFICATE_PURPOSES } from "@/data/certificatePurposes";

interface CertificatePurposeGuideProps {
  initialServiceId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CertificatePurposeGuide({
  initialServiceId = "residential",
  open,
  onOpenChange,
}: CertificatePurposeGuideProps) {
  const [selectedServiceId, setSelectedServiceId] = useState(initialServiceId);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const selectedService =
    CERTIFICATE_PURPOSES.find((s) => s.id === selectedServiceId) || CERTIFICATE_PURPOSES[0];

  const handleCopyPurpose = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      toast.success("Purpose statement copied! Ready to paste into WBPMS.");
      setTimeout(() => setCopiedText(null), 2500);
    } catch {
      toast.error("Failed to copy purpose.");
    }
  };

  const filteredPurposes = selectedService.purposes.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.category.toLowerCase().includes(q) ||
      p.statement.toLowerCase().includes(q) ||
      p.bengaliStatement.toLowerCase().includes(q) ||
      p.requiredProof.toLowerCase().includes(q)
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl border border-primary/25 shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-accent/10 p-5 border-b border-border/60">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="outline" className="bg-white/90 border-primary/30 text-primary font-medium text-xs">
              <Building2 size={12} className="mr-1 inline" /> Bagula II Gram Panchayat
            </Badge>
            <Badge className="bg-primary text-primary-foreground text-xs">
              <Target size={12} className="mr-1 inline" /> WBPMS Purpose Standards
            </Badge>
            <Badge variant="secondary" className="text-xs">
              আবেদনের উদ্দেশ্য নির্দেশিকা
            </Badge>
          </div>
          <DialogTitle className="text-xl font-bold font-heading text-foreground">
            Official Purposes for Each WBPMS Certificate
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Standard permissible purposes for Bagula 2 No Gram Panchayat certificates. Avoid application rejection by entering clear, official purpose wording on the WBPMS portal.
          </DialogDescription>
        </div>

        <div className="p-5 space-y-5">
          {/* Certificate Selector Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {CERTIFICATE_PURPOSES.map((cert) => {
              const isSelected = cert.id === selectedServiceId;
              return (
                <button
                  key={cert.id}
                  type="button"
                  onClick={() => {
                    setSelectedServiceId(cert.id);
                    setSearchQuery("");
                  }}
                  className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-sm font-semibold"
                      : "bg-muted/40 hover:bg-muted text-foreground border-border"
                  }`}
                >
                  <span className="text-lg">{cert.icon}</span>
                  <span className="text-[11px] leading-tight font-bold line-clamp-1">{cert.name}</span>
                </button>
              );
            })}
          </div>

          {/* Current Certificate Overview Banner */}
          <div className="gov-card p-4 border bg-gradient-to-r from-primary/5 via-background to-primary/5 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedService.icon}</span>
                <div>
                  <h3 className="font-bold text-base text-foreground font-heading flex items-center gap-2">
                    {selectedService.name}
                    <Badge variant="secondary" className="text-[10px]">
                      {selectedService.tag}
                    </Badge>
                  </h3>
                  <p className="text-xs font-medium text-primary">{selectedService.bengaliName}</p>
                </div>
              </div>

              <div className="relative w-full sm:w-56">
                <Search size={13} className="absolute left-2.5 top-2 text-muted-foreground" />
                <Input
                  placeholder="Filter purposes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 h-7 text-xs"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed pt-1">
              {selectedService.summary}
            </p>
          </div>

          {/* Purposes List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-foreground">
              <span className="flex items-center gap-1.5">
                <FileCheck size={15} className="text-primary" /> Permissible Purposes & Required Evidence (
                {filteredPurposes.length} Categories)
              </span>
              <span className="text-muted-foreground text-[11px]">
                Click "Copy Purpose" to paste directly into WBPMS
              </span>
            </div>

            <div className="grid gap-3">
              {filteredPurposes.map((p, idx) => {
                const isCopied = copiedText === p.statement;
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border bg-background hover:border-primary/50 transition space-y-2 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            #{idx + 1}
                          </span>
                          <h4 className="font-bold text-xs text-foreground">{p.category}</h4>
                        </div>
                        <p className="text-xs font-medium text-primary mt-1">{p.bengaliStatement}</p>
                      </div>

                      <Button
                        size="sm"
                        variant={isCopied ? "default" : "outline"}
                        className="h-7 text-xs gap-1.5 shrink-0"
                        onClick={() => handleCopyPurpose(p.statement)}
                      >
                        {isCopied ? <Check size={12} /> : <Copy size={12} />}
                        {isCopied ? "Copied" : "Copy Purpose"}
                      </Button>
                    </div>

                    <div className="bg-muted/40 p-2.5 rounded-lg border text-xs space-y-1">
                      <div className="text-[11px] font-mono text-foreground font-semibold">
                        WBPMS Form Text:
                      </div>
                      <p className="text-muted-foreground font-mono text-[11px] leading-relaxed">
                        "{p.statement}"
                      </p>
                    </div>

                    <div className="flex items-start gap-2 text-[11px] text-muted-foreground pt-0.5">
                      <strong className="text-foreground shrink-0">Required Proof:</strong>
                      <span>{p.requiredProof}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* General Guidance Caution */}
          <div className="bg-muted/30 border rounded-xl p-3.5 text-xs text-muted-foreground space-y-1">
            <h5 className="font-bold text-foreground flex items-center gap-1.5 text-xs">
              <HelpCircle size={14} className="text-primary" /> Important Note for Cyber Cafes & Applicants:
            </h5>
            <p className="text-[11px] leading-relaxed">
              When applying on <strong className="text-foreground">wbpms.in</strong>, do not leave the purpose field blank or write vague phrases like "General Purpose" or "Official Work". Entering a specific, recognized purpose from the list above ensures rapid scrutiny and immediate approval by the Bagula II Gram Panchayat Sub-Registrar.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
