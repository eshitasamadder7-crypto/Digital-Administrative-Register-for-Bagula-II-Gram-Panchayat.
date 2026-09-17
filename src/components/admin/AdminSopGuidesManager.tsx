import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Video,
  Save,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  ExternalLink,
  CheckCircle2,
  FileText,
  Clock,
  Building2,
  ShieldCheck,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  type RedirectGuide,
  type WorkflowStep,
  type DocumentRequired,
  type VideoGuide,
} from "@/data/redirectGuides";
import {
  useAllDynamicRedirectGuides,
  saveMasterServiceGuide,
  extractYouTubeId,
} from "@/lib/sopMasterData";
import { ServiceInformationViewer } from "@/components/services/ServiceInformationViewer";

export function AdminSopGuidesManager() {
  const { guides, loading, refresh } = useAllDynamicRedirectGuides();
  const guideKeys = Object.keys(guides);

  const [selectedKey, setSelectedKey] = useState<string>("legacy-birth-digitization");
  const [currentGuide, setCurrentGuide] = useState<RedirectGuide | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // When selected key changes or guides update, clone into editable state
  useEffect(() => {
    if (guides[selectedKey]) {
      setCurrentGuide(JSON.parse(JSON.stringify(guides[selectedKey])));
    } else if (guideKeys.length > 0 && !guides[selectedKey]) {
      setSelectedKey(guideKeys[0]);
    }
  }, [selectedKey, guides, guideKeys]);

  if (!currentGuide) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>Loading SOP and Workflow Master Data...</p>
      </div>
    );
  }

  const ytId = currentGuide.videoGuide?.youtubeUrl
    ? extractYouTubeId(currentGuide.videoGuide.youtubeUrl)
    : (currentGuide.videoGuide?.youtubeId || "");

  const handleYtUrlChange = (url: string) => {
    const extracted = extractYouTubeId(url);
    setCurrentGuide((prev) => {
      if (!prev) return null;
      const vg = prev.videoGuide || {
        title: `${prev.title} - Online Application & Verification Guide`,
        bengaliTitle: `${prev.bengaliTitle} আবেদন ও ভেরিফিকেশন পদ্ধতি`,
        channel: "Janma-Mrityu Tathya & GP Support",
        youtubeId: extracted,
        youtubeUrl: url,
        duration: "5 mins",
        highlights: [],
      };
      return {
        ...prev,
        videoGuide: {
          ...vg,
          youtubeUrl: url,
          youtubeId: extracted || vg.youtubeId,
        },
      };
    });
  };

  // Workflow steps helpers
  const updateStep = (index: number, field: keyof WorkflowStep, value: any) => {
    setCurrentGuide((prev) => {
      if (!prev) return null;
      const steps = [...prev.workflow];
      steps[index] = { ...steps[index], [field]: value };
      return { ...prev, workflow: steps };
    });
  };

  const addStep = () => {
    setCurrentGuide((prev) => {
      if (!prev) return null;
      const newStep: WorkflowStep = {
        step: prev.workflow.length + 1,
        title: "New Verification Step",
        bengaliTitle: "নতুন ধাপ",
        description: "Describe the specific actions required for this step.",
        tips: "Important notes for citizen or operator.",
      };
      return { ...prev, workflow: [...prev.workflow, newStep] };
    });
  };

  const removeStep = (index: number) => {
    setCurrentGuide((prev) => {
      if (!prev) return null;
      const steps = prev.workflow.filter((_, i) => i !== index).map((s, idx) => ({ ...s, step: idx + 1 }));
      return { ...prev, workflow: steps };
    });
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    setCurrentGuide((prev) => {
      if (!prev) return null;
      const steps = [...prev.workflow];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= steps.length) return prev;
      const temp = steps[index];
      steps[index] = steps[targetIndex];
      steps[targetIndex] = temp;
      const renumbered = steps.map((s, idx) => ({ ...s, step: idx + 1 }));
      return { ...prev, workflow: renumbered };
    });
  };

  // Document checklist helpers
  const updateDoc = (index: number, field: keyof DocumentRequired, value: any) => {
    setCurrentGuide((prev) => {
      if (!prev) return null;
      const docs = [...prev.documents];
      docs[index] = { ...docs[index], [field]: value };
      return { ...prev, documents: docs };
    });
  };

  const addDoc = () => {
    setCurrentGuide((prev) => {
      if (!prev) return null;
      const newDoc: DocumentRequired = {
        name: "New Required Document",
        bengaliName: "নতুন প্রয়োজনীয় নথি",
        mandatory: true,
        format: "PDF / JPG",
        maxSize: "200 KB",
        details: "Original to be produced during physical verification.",
      };
      return { ...prev, documents: [...prev.documents, newDoc] };
    });
  };

  const removeDoc = (index: number) => {
    setCurrentGuide((prev) => {
      if (!prev) return null;
      const docs = prev.documents.filter((_, i) => i !== index);
      return { ...prev, documents: docs };
    });
  };

  // Video highlights helper
  const addHighlight = () => {
    setCurrentGuide((prev) => {
      if (!prev || !prev.videoGuide) return prev;
      return {
        ...prev,
        videoGuide: {
          ...prev.videoGuide,
          highlights: [...(prev.videoGuide.highlights || []), "New video topic highlight"],
        },
      };
    });
  };

  const updateHighlight = (idx: number, val: string) => {
    setCurrentGuide((prev) => {
      if (!prev || !prev.videoGuide) return prev;
      const hl = [...prev.videoGuide.highlights];
      hl[idx] = val;
      return {
        ...prev,
        videoGuide: { ...prev.videoGuide, highlights: hl },
      };
    });
  };

  const removeHighlight = (idx: number) => {
    setCurrentGuide((prev) => {
      if (!prev || !prev.videoGuide) return prev;
      const hl = prev.videoGuide.highlights.filter((_, i) => i !== idx);
      return {
        ...prev,
        videoGuide: { ...prev.videoGuide, highlights: hl },
      };
    });
  };

  // Eligibility helpers
  const addEligibility = () => {
    setCurrentGuide((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        eligibility: [...(prev.eligibility || []), ""],
      };
    });
  };

  const updateEligibility = (idx: number, val: string) => {
    setCurrentGuide((prev) => {
      if (!prev) return null;
      const list = [...(prev.eligibility || [])];
      list[idx] = val;
      return { ...prev, eligibility: list };
    });
  };

  const removeEligibility = (idx: number) => {
    setCurrentGuide((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        eligibility: (prev.eligibility || []).filter((_, i) => i !== idx),
      };
    });
  };

  // Purpose helpers
  const addPurpose = () => {
    setCurrentGuide((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        purposes: [...(prev.purposes || []), ""],
      };
    });
  };

  const updatePurpose = (idx: number, val: string) => {
    setCurrentGuide((prev) => {
      if (!prev) return null;
      const list = [...(prev.purposes || [])];
      list[idx] = val;
      return { ...prev, purposes: list };
    });
  };

  const removePurpose = (idx: number) => {
    setCurrentGuide((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        purposes: (prev.purposes || []).filter((_, i) => i !== idx),
      };
    });
  };

  // FAQ helpers
  const addFaq = () => {
    setCurrentGuide((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        faqs: [
          ...(prev.faqs || []),
          { question: "", answer: "", questionBn: "", answerBn: "" },
        ],
      };
    });
  };

  const updateFaq = (idx: number, field: string, val: string) => {
    setCurrentGuide((prev) => {
      if (!prev) return null;
      const list = [...(prev.faqs || [])];
      list[idx] = { ...list[idx], [field]: val };
      return { ...prev, faqs: list };
    });
  };

  const removeFaq = (idx: number) => {
    setCurrentGuide((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        faqs: (prev.faqs || []).filter((_, i) => i !== idx),
      };
    });
  };

  // Save to DB
  const handleSave = async () => {
    if (!currentGuide) return;
    setSaving(true);
    try {
      const res = await saveMasterServiceGuide(currentGuide);
      if (res.success) {
        toast.success(`✅ Master SOP & Workflow for "${currentGuide.title}" saved successfully!`);
        await refresh();
      } else {
        toast.error(res.error || "Failed to save SOP");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to save SOP");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Selector & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-border/50 shadow-sm">
        <div className="flex-1 space-y-1">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Select Government Service SOP
          </Label>
          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="w-full h-10 px-3 py-1 text-sm bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary font-medium"
          >
            {guideKeys.map((k) => (
              <option key={k} value={k}>
                {guides[k]?.title || k} ({guides[k]?.category || "General"})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 pt-2 sm:pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPreviewOpen(true)}
            className="rounded-xl border-primary/30 text-primary hover:bg-primary/10"
          >
            <Eye size={14} className="mr-1.5" /> Citizen Preview
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            <Save size={14} className="mr-1.5" />
            {saving ? "Publishing..." : "Save & Publish SOP"}
          </Button>
        </div>
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Service Details & SOP Workflow */}
        <div className="lg:col-span-2 space-y-6">
          {/* Service Basic Info Card */}
          <section className="bg-white/90 backdrop-blur-sm border border-border/50 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/30 pb-3">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-primary" />
                <h3 className="text-base font-bold">1. Service Identification & Official Policy</h3>
              </div>
              <Badge variant="outline" className="bg-primary/5 text-primary text-xs">
                ID: {currentGuide.id}
              </Badge>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Service Title (English)</Label>
                <Input
                  value={currentGuide.title}
                  onChange={(e) => setCurrentGuide({ ...currentGuide, title: e.target.value })}
                  placeholder="e.g. Legacy Birth Certificate Digitization"
                  className="rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Bengali Title (বাংলা)</Label>
                <Input
                  value={currentGuide.bengaliTitle}
                  onChange={(e) => setCurrentGuide({ ...currentGuide, bengaliTitle: e.target.value })}
                  placeholder="e.g. হস্তলিখিত জন্ম সার্টিফিকেট ডিজিটাইজেশন"
                  className="rounded-xl text-sm font-bengali"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Category</Label>
                <Input
                  value={currentGuide.category}
                  onChange={(e) => setCurrentGuide({ ...currentGuide, category: e.target.value })}
                  placeholder="e.g. Birth & Death Registration"
                  className="rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Official Department</Label>
                <Input
                  value={currentGuide.officialDept}
                  onChange={(e) => setCurrentGuide({ ...currentGuide, officialDept: e.target.value })}
                  placeholder="e.g. Directorate of Health Services, Govt. of WB"
                  className="rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Official Portal Name</Label>
                <Input
                  value={currentGuide.portalName}
                  onChange={(e) => setCurrentGuide({ ...currentGuide, portalName: e.target.value })}
                  placeholder="e.g. Janma-Mrityu Tathya Portal"
                  className="rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Official Portal URL</Label>
                <Input
                  value={currentGuide.portalUrl}
                  onChange={(e) => setCurrentGuide({ ...currentGuide, portalUrl: e.target.value })}
                  placeholder="https://... or internal link"
                  className="rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Destination Type (Safety Engine)</Label>
                <select
                  value={currentGuide.destinationType || "EXTERNAL_URL"}
                  onChange={(e) => setCurrentGuide({ ...currentGuide, destinationType: e.target.value as any })}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm"
                >
                  <option value="EXTERNAL_URL">External Government Portal (Requires Confirmation)</option>
                  <option value="INTERNAL_ROUTE">Internal Application Route (Direct)</option>
                  <option value="DOCUMENT">Document / PDF Download</option>
                  <option value="NO_REDIRECT">Informational Only (No Outbound Link)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">URL Slug (Shareable Link)</Label>
                <Input
                  value={currentGuide.slug || currentGuide.id}
                  onChange={(e) => setCurrentGuide({ ...currentGuide, slug: e.target.value })}
                  placeholder="e.g. wbpms-residential"
                  className="rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Turnaround Time</Label>
                <Input
                  value={currentGuide.turnaroundTime || ""}
                  onChange={(e) => setCurrentGuide({ ...currentGuide, turnaroundTime: e.target.value })}
                  placeholder="e.g. 7-15 working days"
                  className="rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Processing Fee Structure</Label>
                <Input
                  value={currentGuide.feeInfo || ""}
                  onChange={(e) => setCurrentGuide({ ...currentGuide, feeInfo: e.target.value })}
                  placeholder="e.g. Free / Late fee ₹20 as per rule"
                  className="rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <Label className="text-xs font-medium">Regulatory Framework / Legal SOP Rule</Label>
              <Input
                value={currentGuide.regulatoryInfo || ""}
                onChange={(e) => setCurrentGuide({ ...currentGuide, regulatoryInfo: e.target.value })}
                placeholder="e.g. Section 12/17 of the RBD Act, 1969 and Rule 12/13 of WB RBD Rules, 2000"
                className="rounded-xl text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">English Description / Overview</Label>
              <Textarea
                rows={2}
                value={currentGuide.description}
                onChange={(e) => setCurrentGuide({ ...currentGuide, description: e.target.value })}
                className="rounded-xl text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Bengali Description (বাংলা বিবরণ)</Label>
              <Textarea
                rows={2}
                value={currentGuide.bengaliDescription}
                onChange={(e) => setCurrentGuide({ ...currentGuide, bengaliDescription: e.target.value })}
                className="rounded-xl text-sm font-bengali"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Local Gram Panchayat Notice / Advisory</Label>
              <Textarea
                rows={2}
                value={currentGuide.localOfficeNotice || ""}
                onChange={(e) => setCurrentGuide({ ...currentGuide, localOfficeNotice: e.target.value })}
                placeholder="e.g. Citizens must present physical manual certificates at Bagula II GP counter for physical ink-and-register verification."
                className="rounded-xl text-sm"
              />
            </div>
          </section>

          {/* SOP Workflow Steps Builder */}
          <section className="bg-white/90 backdrop-blur-sm border border-border/50 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/30 pb-3">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-primary" />
                <h3 className="text-base font-bold">2. Step-by-Step SOP Workflow Builder</h3>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={addStep} className="rounded-xl text-xs">
                <Plus size={14} className="mr-1" /> Add Step
              </Button>
            </div>

            <div className="space-y-3">
              {currentGuide.workflow.map((st, idx) => (
                <div
                  key={idx}
                  className="border border-border/50 rounded-xl p-4 bg-background/50 space-y-3 relative group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                        {st.step}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground">
                        Step {st.step} of {currentGuide.workflow.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={idx === 0}
                        onClick={() => moveStep(idx, "up")}
                        className="h-7 w-7"
                      >
                        <ArrowUp size={13} />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={idx === currentGuide.workflow.length - 1}
                        onClick={() => moveStep(idx, "down")}
                        className="h-7 w-7"
                      >
                        <ArrowDown size={13} />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeStep(idx)}
                        className="h-7 w-7 text-rose-600 hover:text-rose-700"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium">Step Title (English)</Label>
                      <Input
                        value={st.title}
                        onChange={(e) => updateStep(idx, "title", e.target.value)}
                        className="text-xs rounded-lg h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium">Step Title (বাংলা)</Label>
                      <Input
                        value={st.bengaliTitle || ""}
                        onChange={(e) => updateStep(idx, "bengaliTitle", e.target.value)}
                        className="text-xs rounded-lg h-8 font-bengali"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium">Instructions & SOP Details</Label>
                    <Textarea
                      rows={2}
                      value={st.description}
                      onChange={(e) => updateStep(idx, "description", e.target.value)}
                      className="text-xs rounded-lg"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium text-amber-700">Important Tip / Citizen Warning</Label>
                    <Input
                      value={st.tips || ""}
                      onChange={(e) => updateStep(idx, "tips", e.target.value)}
                      placeholder="e.g. Ensure mobile number is active for OTP verification."
                      className="text-xs rounded-lg h-8 bg-amber-50/50 border-amber-200"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Required Documents Checklist Builder */}
          <section className="bg-white/90 backdrop-blur-sm border border-border/50 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/30 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600" />
                <h3 className="text-base font-bold">3. Required Documents Checklist</h3>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={addDoc} className="rounded-xl text-xs">
                <Plus size={14} className="mr-1" /> Add Document
              </Button>
            </div>

            <div className="space-y-3">
              {currentGuide.documents.map((doc, idx) => (
                <div
                  key={idx}
                  className="border border-border/50 rounded-xl p-3 bg-background/50 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={doc.name}
                        onChange={(e) => updateDoc(idx, "name", e.target.value)}
                        placeholder="Document Name (English)"
                        className="text-xs font-medium h-8 rounded-lg"
                      />
                      <Input
                        value={doc.bengaliName || ""}
                        onChange={(e) => updateDoc(idx, "bengaliName", e.target.value)}
                        placeholder="Document Name (বাংলা)"
                        className="text-xs h-8 rounded-lg font-bengali"
                      />
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeDoc(idx)}
                      className="h-8 w-8 text-rose-600 hover:text-rose-700 shrink-0"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 items-center">
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`mand-${idx}`}
                        checked={doc.mandatory}
                        onCheckedChange={(val) => updateDoc(idx, "mandatory", val)}
                      />
                      <Label htmlFor={`mand-${idx}`} className="text-[11px] cursor-pointer">
                        {doc.mandatory ? (
                          <span className="text-emerald-700 font-semibold">Mandatory</span>
                        ) : (
                          <span className="text-muted-foreground">Optional</span>
                        )}
                      </Label>
                    </div>

                    <Input
                      value={doc.format}
                      onChange={(e) => updateDoc(idx, "format", e.target.value)}
                      placeholder="Format (e.g. PDF)"
                      className="text-xs h-7 rounded-md"
                    />

                    <Input
                      value={doc.maxSize}
                      onChange={(e) => updateDoc(idx, "maxSize", e.target.value)}
                      placeholder="Max Size (e.g. 100 KB)"
                      className="text-xs h-7 rounded-md"
                    />
                  </div>

                  <Input
                    value={doc.details || ""}
                    onChange={(e) => updateDoc(idx, "details", e.target.value)}
                    placeholder="Specific notes (e.g. Must show seal and signature of hospital/doctor)"
                    className="text-[11px] h-7 rounded-md bg-muted/30"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Eligibility Criteria & Key Purposes */}
          <section className="bg-white/90 backdrop-blur-sm border border-border/50 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/30 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-primary" />
                <h3 className="text-base font-bold">4. Eligibility & Key Purposes</h3>
              </div>
            </div>

            {/* Eligibility List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Eligibility Rules (Who can apply?)</Label>
                <Button type="button" size="sm" variant="ghost" onClick={addEligibility} className="h-7 text-xs">
                  <Plus size={12} className="mr-1" /> Add Criterion
                </Button>
              </div>
              <div className="space-y-1.5">
                {(currentGuide.eligibility || []).map((crit, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <Input
                      value={crit}
                      onChange={(e) => updateEligibility(idx, e.target.value)}
                      placeholder="e.g. Permanent resident of Bagula II Gram Panchayat area"
                      className="text-xs h-8 rounded-lg"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeEligibility(idx)}
                      className="h-8 w-8 text-rose-600 hover:text-rose-700 shrink-0"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                ))}
                {(!currentGuide.eligibility || currentGuide.eligibility.length === 0) && (
                  <p className="text-xs text-muted-foreground italic py-1">No custom eligibility rules defined.</p>
                )}
              </div>
            </div>

            {/* Purposes List */}
            <div className="space-y-2 pt-3 border-t border-border/30">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Key Purposes & Use Cases (Where is this required?)</Label>
                <Button type="button" size="sm" variant="ghost" onClick={addPurpose} className="h-7 text-xs">
                  <Plus size={12} className="mr-1" /> Add Purpose
                </Button>
              </div>
              <div className="space-y-1.5">
                {(currentGuide.purposes || []).map((purp, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <Input
                      value={purp}
                      onChange={(e) => updatePurpose(idx, e.target.value)}
                      placeholder="e.g. Land registry mutation and record of rights (RoR) update"
                      className="text-xs h-8 rounded-lg"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removePurpose(idx)}
                      className="h-8 w-8 text-rose-600 hover:text-rose-700 shrink-0"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                ))}
                {(!currentGuide.purposes || currentGuide.purposes.length === 0) && (
                  <p className="text-xs text-muted-foreground italic py-1">No custom purposes defined.</p>
                )}
              </div>
            </div>
          </section>

          {/* Frequently Asked Questions (FAQs) */}
          <section className="bg-white/90 backdrop-blur-sm border border-border/50 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/30 pb-3">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-amber-600" />
                <h3 className="text-base font-bold">5. Frequently Asked Questions (Citizen Guidance)</h3>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={addFaq} className="rounded-xl text-xs">
                <Plus size={14} className="mr-1" /> Add FAQ
              </Button>
            </div>

            <div className="space-y-3">
              {(currentGuide.faqs || []).map((faq, idx) => (
                <div key={idx} className="border border-border/40 rounded-xl p-3 bg-background/50 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Input
                      value={faq.question}
                      onChange={(e) => updateFaq(idx, "question", e.target.value)}
                      placeholder="Question (English)"
                      className="text-xs font-semibold h-8 rounded-lg"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeFaq(idx)}
                      className="h-8 w-8 text-rose-600 hover:text-rose-700 shrink-0"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                  <Textarea
                    rows={2}
                    value={faq.answer}
                    onChange={(e) => updateFaq(idx, "answer", e.target.value)}
                    placeholder="Answer (English)..."
                    className="text-xs rounded-lg"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={faq.questionBn || ""}
                      onChange={(e) => updateFaq(idx, "questionBn", e.target.value)}
                      placeholder="Question (বাংলা - ঐচ্ছিক)"
                      className="text-xs h-7 rounded-lg font-bengali"
                    />
                    <Input
                      value={faq.answerBn || ""}
                      onChange={(e) => updateFaq(idx, "answerBn", e.target.value)}
                      placeholder="Answer (বাংলা - ঐচ্ছিক)"
                      className="text-xs h-7 rounded-lg font-bengali"
                    />
                  </div>
                </div>
              ))}
              {(!currentGuide.faqs || currentGuide.faqs.length === 0) && (
                <p className="text-xs text-muted-foreground italic py-1">No FAQs added for this service yet.</p>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: YouTube Video Link & Live Preview */}
        <div className="space-y-6">
          <section className="bg-white/90 backdrop-blur-sm border border-border/50 rounded-2xl p-5 space-y-4 shadow-sm sticky top-4">
            <div className="flex items-center justify-between border-b border-border/30 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <Video size={20} />
                <h3 className="text-base font-bold text-foreground">YouTube Video Guide</h3>
              </div>
              {ytId && (
                <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px]">
                  ID: {ytId}
                </Badge>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">YouTube Video Link / URL</Label>
                <Input
                  value={currentGuide.videoGuide?.youtubeUrl || ""}
                  onChange={(e) => handleYtUrlChange(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="rounded-xl text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  Paste any YouTube URL or 11-char ID. The video player updates instantly.
                </p>
              </div>

              {/* Live Video Embed or Preview */}
              <div className="rounded-xl overflow-hidden border border-border/60 bg-black aspect-video relative group flex items-center justify-center">
                {ytId ? (
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${ytId}?rel=0`}
                    title="YouTube Video Guide"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                ) : (
                  <div className="text-center p-4 text-zinc-400 space-y-2">
                    <Play size={32} className="mx-auto text-zinc-500 opacity-60" />
                    <p className="text-xs font-medium">No YouTube Video Configured</p>
                    <p className="text-[10px] text-zinc-500">
                      Add a video link above to provide step-by-step video guidance to citizens.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-medium">Video Title (English)</Label>
                <Input
                  value={currentGuide.videoGuide?.title || ""}
                  onChange={(e) =>
                    setCurrentGuide((prev) =>
                      prev
                        ? {
                            ...prev,
                            videoGuide: {
                              ...prev.videoGuide!,
                              title: e.target.value,
                            },
                          }
                        : null
                    )
                  }
                  placeholder="e.g. Official Video Guide: Legacy Birth Certificate Digitization"
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Video Title (বাংলা)</Label>
                <Input
                  value={currentGuide.videoGuide?.bengaliTitle || ""}
                  onChange={(e) =>
                    setCurrentGuide((prev) =>
                      prev
                        ? {
                            ...prev,
                            videoGuide: {
                              ...prev.videoGuide!,
                              bengaliTitle: e.target.value,
                            },
                          }
                        : null
                    )
                  }
                  placeholder="e.g. ভিডিও গাইড: পুরোনো জন্ম সার্টিফিকেট অনলাইনে তোলার নিয়ম"
                  className="rounded-xl text-xs font-bengali"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium">Channel Name</Label>
                  <Input
                    value={currentGuide.videoGuide?.channel || ""}
                    onChange={(e) =>
                      setCurrentGuide((prev) =>
                        prev
                          ? {
                              ...prev,
                              videoGuide: {
                                ...prev.videoGuide!,
                                channel: e.target.value,
                              },
                            }
                          : null
                      )
                    }
                    placeholder="e.g. Janma-Mrityu Tathya"
                    className="rounded-lg text-xs h-8"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-medium">Duration</Label>
                  <Input
                    value={currentGuide.videoGuide?.duration || ""}
                    onChange={(e) =>
                      setCurrentGuide((prev) =>
                        prev
                          ? {
                              ...prev,
                              videoGuide: {
                                ...prev.videoGuide!,
                                duration: e.target.value,
                              },
                            }
                          : null
                      )
                    }
                    placeholder="e.g. 7 mins"
                    className="rounded-lg text-xs h-8"
                  />
                </div>
              </div>

              {/* Video Highlights */}
              <div className="space-y-2 pt-2 border-t border-border/30">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Video Highlights & Key Chapters</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={addHighlight}
                    className="h-6 px-2 text-[11px]"
                  >
                    <Plus size={12} className="mr-1" /> Add
                  </Button>
                </div>

                <div className="space-y-1.5">
                  {(currentGuide.videoGuide?.highlights || []).map((hl, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <Input
                        value={hl}
                        onChange={(e) => updateHighlight(idx, e.target.value)}
                        className="text-xs h-7 rounded-md"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeHighlight(idx)}
                        className="h-7 w-7 text-rose-600 hover:text-rose-700 shrink-0"
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border/30">
              <Button
                type="button"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm"
                onClick={handleSave}
                disabled={saving}
              >
                <Save size={14} className="mr-1.5" />
                {saving ? "Saving Changes..." : "Save SOP & Video Links"}
              </Button>
            </div>
          </section>
        </div>
      </div>

      {/* Citizen Preview Modal with Full Hub Features */}
      {previewOpen && currentGuide && (
        <ServiceInformationViewer
          guideKey={currentGuide.id}
          initialGuide={currentGuide}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
        />
      )}
    </div>
  );
}
