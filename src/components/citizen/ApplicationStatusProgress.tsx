import { useState } from "react";
import {
  Check,
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ApplicationTimeline from "@/modules/application/ApplicationTimeline";
import type { ApplicationKind } from "@/modules/application/types";

interface ApplicationStatusProgressProps {
  kind: ApplicationKind;
  appId: string;
  status: string | null;
  submittedAt?: string | null;
  createdAt: string;
  rejectionReason?: string | null;
  returnCount?: number;
  showTimelineToggle?: boolean;
}

type StepState = "completed" | "current" | "upcoming" | "warning" | "error";

interface ProgressStep {
  id: string;
  emoji: string;
  labelEn: string;
  labelBn: string;
  state: StepState;
  hint?: string;
}

export default function ApplicationStatusProgress({
  kind,
  appId,
  status,
  submittedAt,
  createdAt,
  rejectionReason,
  returnCount = 0,
  showTimelineToggle = true,
}: ApplicationStatusProgressProps) {
  const [showTimeline, setShowTimeline] = useState(false);

  const normStatus = (status ?? "Draft").trim().toLowerCase();

  const isDraft = normStatus === "draft";
  const isRejected = normStatus === "rejected" || normStatus === "auto_rejected";
  const isReturned = normStatus === "returned";
  const isApproved = normStatus === "approved" || normStatus === "issued";
  const isUnderVerification =
    normStatus === "processing" ||
    normStatus === "under review" ||
    normStatus === "under verification" ||
    normStatus === "locked" ||
    normStatus === "submitted";

  // Compute 3 primary milestones: Submitted -> Under Verification -> Approved (or Rejected / Returned)
  let steps: ProgressStep[] = [];
  let progressPct = 0;
  let progressColor = "bg-primary";

  if (isDraft) {
    progressPct = 10;
    progressColor = "bg-amber-500";
    steps = [
      {
        id: "draft",
        emoji: "📝",
        labelEn: "Draft",
        labelBn: "খসড়া প্রস্তুত",
        state: "current",
        hint: "Fill required details & submit",
      },
      {
        id: "submit",
        emoji: "📤",
        labelEn: "Submission",
        labelBn: "আবেদন জমা",
        state: "upcoming",
        hint: "Awaiting submission",
      },
      {
        id: "verify",
        emoji: "🔍",
        labelEn: "Verification",
        labelBn: "দপ্তরে যাচাই",
        state: "upcoming",
        hint: "Panchayat verification",
      },
      {
        id: "outcome",
        emoji: "📜",
        labelEn: "Approval",
        labelBn: "অনুমোদন ও ইস্যু",
        state: "upcoming",
        hint: "Certificate issuance",
      },
    ];
  } else if (isReturned) {
    progressPct = 50;
    progressColor = "bg-amber-500";
    steps = [
      {
        id: "submit",
        emoji: "📤",
        labelEn: "Submitted",
        labelBn: "আবেদন জমা",
        state: "completed",
        hint: submittedAt ? new Date(submittedAt).toLocaleDateString() : "Done",
      },
      {
        id: "verify",
        emoji: "🔄",
        labelEn: "Returned for Correction",
        labelBn: "সংশোধনের নির্দেশ",
        state: "warning",
        hint: `Return count: ${returnCount}/5`,
      },
      {
        id: "outcome",
        emoji: "📜",
        labelEn: "Approval",
        labelBn: "অনুমোদন ও ইস্যু",
        state: "upcoming",
        hint: "Pending resubmission",
      },
    ];
  } else if (isRejected) {
    progressPct = 100;
    progressColor = "bg-destructive";
    steps = [
      {
        id: "submit",
        emoji: "📤",
        labelEn: "Submitted",
        labelBn: "আবেদন জমা",
        state: "completed",
        hint: submittedAt ? new Date(submittedAt).toLocaleDateString() : "Done",
      },
      {
        id: "verify",
        emoji: "🔍",
        labelEn: "Under Verification",
        labelBn: "দপ্তরে যাচাই",
        state: "completed",
        hint: "Review completed",
      },
      {
        id: "outcome",
        emoji: "⛔",
        labelEn: "Rejected",
        labelBn: "আবেদন প্রত্যাখ্যাত",
        state: "error",
        hint: "Decision finalized",
      },
    ];
  } else if (isApproved) {
    progressPct = 100;
    progressColor = "bg-emerald-600";
    steps = [
      {
        id: "submit",
        emoji: "📤",
        labelEn: "Submitted",
        labelBn: "আবেদন জমা",
        state: "completed",
        hint: submittedAt ? new Date(submittedAt).toLocaleDateString() : "Done",
      },
      {
        id: "verify",
        emoji: "🔍",
        labelEn: "Under Verification",
        labelBn: "দপ্তরে যাচাই",
        state: "completed",
        hint: "Verified successfully",
      },
      {
        id: "outcome",
        emoji: "✅",
        labelEn: "Approved & Issued",
        labelBn: "অনুমোদিত ও ইস্যু",
        state: "completed",
        hint: "Certificate ready",
      },
    ];
  } else {
    // Normal in-progress (Submitted / Under Review / Processing)
    const isStrictlySubmitted = normStatus === "submitted";
    progressPct = isStrictlySubmitted ? 40 : 70;
    progressColor = "bg-primary";
    steps = [
      {
        id: "submit",
        emoji: "📤",
        labelEn: "Submitted",
        labelBn: "আবেদন জমা",
        state: "completed",
        hint: submittedAt ? new Date(submittedAt).toLocaleDateString() : "Done",
      },
      {
        id: "verify",
        emoji: "🔍",
        labelEn: "Under Verification",
        labelBn: "দপ্তরে যাচাই",
        state: "current",
        hint: isStrictlySubmitted ? "Queued for review" : "In review by DEO",
      },
      {
        id: "outcome",
        emoji: "📜",
        labelEn: "Approval & Issuance",
        labelBn: "অনুমোদন ও ইস্যু",
        state: "upcoming",
        hint: "Final administrative approval",
      },
    ];
  }

  return (
    <div className="w-full space-y-3 pt-1">
      {/* Visual Progress Bar */}
      <div className="relative">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted/80">
          <div
            className={`h-full transition-all duration-500 ease-out ${progressColor}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Progress Timeline Nodes */}
      <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 pt-1">
        {steps.map((step, idx) => {
          const isNodeCompleted = step.state === "completed";
          const isNodeCurrent = step.state === "current";
          const isNodeWarning = step.state === "warning";
          const isNodeError = step.state === "error";

          let circleStyle = "bg-muted text-muted-foreground border-border";
          let badgeVariant = "secondary";

          if (isNodeCompleted) {
            circleStyle = "bg-emerald-600 text-white border-emerald-600 shadow-sm";
          } else if (isNodeWarning) {
            circleStyle = "bg-amber-500 text-white border-amber-500 shadow-sm ring-2 ring-amber-500/20";
          } else if (isNodeError) {
            circleStyle = "bg-destructive text-destructive-foreground border-destructive shadow-sm ring-2 ring-destructive/20";
          } else if (isNodeCurrent) {
            circleStyle = "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/25 animate-pulse";
          }

          return (
            <div key={step.id} className="flex flex-col items-center text-center">
              {/* Node indicator */}
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold transition-all ${circleStyle}`}
                title={step.labelEn}
              >
                {isNodeCompleted ? (
                  <Check className="h-4 w-4" strokeWidth={3} />
                ) : isNodeError ? (
                  <XCircle className="h-4 w-4" />
                ) : isNodeWarning ? (
                  <RotateCcw className="h-4 w-4" />
                ) : (
                  <span>{step.emoji}</span>
                )}
              </div>

              {/* Step Labels */}
              <div className="mt-1.5 min-w-0">
                <p
                  className={`text-xs font-medium leading-tight line-clamp-1 ${
                    isNodeCurrent
                      ? "font-semibold text-primary"
                      : isNodeCompleted
                      ? "text-foreground"
                      : isNodeWarning
                      ? "font-semibold text-amber-700"
                      : isNodeError
                      ? "font-semibold text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {step.emoji} {step.labelEn}
                </p>
                <p className="text-[10px] text-muted-foreground/90 line-clamp-1">
                  {step.labelBn}
                </p>
                {step.hint && (
                  <p className="hidden sm:block text-[10px] text-muted-foreground mt-0.5">
                    {step.hint}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Helpful Status Context Banner */}
      {isReturned && (
        <div className="rounded-lg border border-amber-300 bg-amber-50/90 p-2.5 text-xs text-amber-900 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold">
            <RotateCcw className="h-4 w-4 text-amber-700 shrink-0" />
            <span>🔄 Action Required: Application Returned for Modification ({returnCount}/5)</span>
          </div>
          {rejectionReason && (
            <p className="pl-5 text-amber-800 text-[11px]">
              <strong>Office Remark / দপ্তরের মন্তব্য:</strong> {rejectionReason}
            </p>
          )}
          <p className="pl-5 text-amber-700 text-[10px]">
            Please click "Continue" to correct the details or documents and resubmit.
          </p>
        </div>
      )}

      {isRejected && (
        <div className="rounded-lg border border-red-300 bg-red-50/90 p-2.5 text-xs text-red-900 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold">
            <ShieldAlert className="h-4 w-4 text-red-700 shrink-0" />
            <span>⛔ Application Rejected / আবেদন প্রত্যাখ্যাত</span>
          </div>
          {rejectionReason && (
            <p className="pl-5 text-red-800 text-[11px]">
              <strong>Reason / কারণ:</strong> {rejectionReason}
            </p>
          )}
          <p className="pl-5 text-red-700 text-[10px]">
            If you have questions, please contact Bagula II Gram Panchayat office with your tracking memo.
          </p>
        </div>
      )}

      {isUnderVerification && !isReturned && !isRejected && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/80 p-2.5 text-xs text-blue-900 flex items-start gap-2">
          <Search className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-medium text-blue-950">
              🔍 Under Administrative Verification / পঞ্চায়েত দপ্তরে যাচাই চলছে
            </p>
            <p className="text-[11px] text-blue-800">
              Your application has been received and is being verified by Bagula II GP officials. You will be notified if any modification is needed.
            </p>
          </div>
        </div>
      )}

      {isApproved && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50/90 p-2.5 text-xs text-emerald-900 flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-emerald-950">
              🎉 Approved & Issued / অনুমোদিত ও শংসাপত্র প্রস্তুত!
            </p>
            <p className="text-[11px] text-emerald-800">
              Your certificate has been granted and signed. You can download your official copy or verify it in the public registry.
            </p>
          </div>
        </div>
      )}

      {isDraft && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 text-xs text-amber-900 flex items-start gap-2">
          <Clock className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-medium text-amber-950">
              ✏️ Incomplete Draft / অসম্পূর্ণ খসড়া
            </p>
            <p className="text-[11px] text-amber-800">
              This application has not been submitted yet. Please click "Continue" to review and submit it to the Panchayat office.
            </p>
          </div>
        </div>
      )}

      {/* Expandable Activity Log / Timeline */}
      {showTimelineToggle && !isDraft && (
        <div className="pt-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowTimeline((prev) => !prev);
            }}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            <span>🕒 {showTimeline ? "Hide Detailed Activity Log" : "View Detailed Activity Log"} / কার্যকলাপের বিবরণ</span>
            {showTimeline ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {showTimeline && (
            <div
              className="mt-2 rounded-lg border bg-background/95 p-3 text-xs shadow-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="mb-2 font-semibold text-foreground flex items-center gap-1.5">
                <span>📋 Official Audit Timeline / অফিসিয়াল টাইমলাইন</span>
              </h4>
              <ApplicationTimeline kind={kind} id={appId} showActor={false} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
