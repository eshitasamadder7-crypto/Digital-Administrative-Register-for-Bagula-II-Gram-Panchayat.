import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { ArrowRight, ShieldAlert } from "lucide-react";
import PublicShell from "./PublicShell";

const purposes = [
  { en: "Apply for available services", bn: "উপলব্ধ পরিষেবার জন্য আবেদন করুন", icon: "📝" },
  { en: "Track applications", bn: "আবেদনের অগ্রগতি দেখুন", icon: "📍" },
  { en: "Receive notifications", bn: "বিজ্ঞপ্তি পান", icon: "🔔" },
  { en: "Download issued certificates (watermarked copy)", bn: "ইস্যু হওয়া শংসাপত্র ডাউনলোড করুন (জলছাপ সহ)", icon: "📥" },
  { en: "Verify certificates", bn: "শংসাপত্র যাচাই করুন", icon: "🔍" },
  { en: "Maintain their profile", bn: "নিজের প্রোফাইল হালনাগাদ রাখুন", icon: "👤" },
  { en: "Request duplicate certificates (subject to Panchayat policy)", bn: "ডুপ্লিকেট শংসাপত্রের আবেদন (পঞ্চায়েত নীতি সাপেক্ষে)", icon: "📑" },
];

const workflow = [
  { en: "Public Registration", bn: "পাবলিক রেজিস্ট্রেশন", icon: "📝" },
  { en: "Email Verification", bn: "ইমেল যাচাই", icon: "✉️" },
  { en: "Citizen Account Created", bn: "নাগরিক অ্যাকাউন্ট তৈরি", icon: "👤" },
  { en: "Login", bn: "লগইন", icon: "🔐" },
  { en: "Choose Service", bn: "পরিষেবা নির্বাচন", icon: "📑" },
  { en: "Create Application", bn: "আবেদন তৈরি", icon: "✍️" },
  { en: "Submit Application", bn: "আবেদন জমা", icon: "📤" },
  { en: "Office Processing", bn: "দপ্তরে প্রক্রিয়াকরণ", icon: "🏛️" },
  { en: "Certificate Issued", bn: "শংসাপত্র প্রদান", icon: "📜" },
  { en: "Download & Verify", bn: "ডাউনলোড ও যাচাই", icon: "🔍" },
];

export default function PublicIntro() {
  const [agreed, setAgreed] = useState(false);

  return (
    <PublicShell>
      <Helmet>
        <title>Public Citizen Portal — Bagula II Gram Panchayat</title>
        <meta name="description" content="Introduction to the Bagula II Gram Panchayat Public Citizen Portal — apply, track, download and verify certificates online." />
        <link rel="canonical" href="https://deo-workflow-helper.lovable.app/public" />
        <meta property="og:title" content="Public Citizen Portal — Bagula II Gram Panchayat" />
        <meta property="og:description" content="Residents of Bagula II Gram Panchayat can apply for, track, download and verify certificates online." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://deo-workflow-helper.lovable.app/public" />
      </Helmet>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <header className="text-center space-y-2">
          <p className="text-[11px] uppercase tracking-[0.2em] text-primary font-semibold flex items-center justify-center gap-1.5">
            🏛️ Bagula II Gram Panchayat
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">🌐 Public Citizen Portal / নাগরিক পোর্টাল</h1>
          <p className="text-sm text-muted-foreground">
            Welcome to the Bagula Gram Panchayat Public Citizen Portal.
          </p>
          <p className="text-sm text-muted-foreground font-medium">
            বগুলা গ্রাম পঞ্চায়েত পাবলিক নাগরিক পোর্টালে আপনাকে স্বাগতম।
          </p>
        </header>

        <Card className="p-5 sm:p-6 space-y-3.5 shadow-sm">
          <h2 className="font-semibold text-base sm:text-lg flex items-center gap-2">
            🎯 Purpose / উদ্দেশ্য
          </h2>
          <p className="text-sm text-muted-foreground">
            This portal allows eligible residents of Bagula 2 No. Gram Panchayat to:
            <br />
            এই পোর্টালের মাধ্যমে বগুলা ২ নং গ্রাম পঞ্চায়েতের যোগ্য বাসিন্দারা পারবেন:
          </p>
          <ul className="space-y-2.5">
            {purposes.map((p) => (
              <li key={p.en} className="flex items-start gap-2.5 text-sm">
                <span className="text-base select-none shrink-0 mt-0.5">{p.icon}</span>
                <span className="leading-snug">
                  <span className="font-medium">{p.en}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{p.bn}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5 sm:p-6 space-y-3.5 shadow-sm">
          <h2 className="font-semibold text-base sm:text-lg flex items-center gap-2">
            🔄 Workflow / কর্মপ্রবাহ
          </h2>
          <ol className="space-y-1.5">
            {workflow.map((s, i) => (
              <li key={s.en}>
                <div className="flex items-center gap-3 rounded-xl border bg-muted/40 px-3.5 py-2.5 hover:bg-muted/60 transition-colors">
                  <span className="h-7 w-7 shrink-0 rounded-full bg-primary text-primary-foreground text-xs grid place-items-center font-bold shadow-xs">
                    {i + 1}
                  </span>
                  <span className="text-base shrink-0 select-none">{s.icon}</span>
                  <span className="text-sm font-medium leading-snug">
                    {s.en}
                    <span className="block text-xs font-normal text-muted-foreground">{s.bn}</span>
                  </span>
                </div>
                {i < workflow.length - 1 && (
                  <div className="ml-7 h-2.5 w-px bg-border/80" aria-hidden />
                )}
              </li>
            ))}
          </ol>
        </Card>

        <Card className="p-5 sm:p-6 space-y-2.5 border-accent/40 bg-accent/5 shadow-sm">
          <h2 className="font-semibold text-base flex items-center gap-2">
            ℹ️ Important Information / গুরুত্বপূর্ণ তথ্য
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Creating an account does not guarantee approval of any application. Applications are
            verified according to Gram Panchayat rules and the records available with the office.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            অ্যাকাউন্ট তৈরি করলেই আবেদন অনুমোদিত হবে এমন নিশ্চয়তা নেই। পঞ্চায়েতের নিয়ম ও দপ্তরে
            উপলব্ধ নথি অনুযায়ী প্রতিটি আবেদন পুঙ্খানুপুঙ্খ যাচাই করা হয়।
          </p>
        </Card>

        <Card className="p-5 sm:p-6 space-y-3 border-destructive/30 bg-destructive/5 shadow-sm">
          <h2 className="font-semibold text-base flex items-center gap-2 text-destructive">
            <ShieldAlert size={18} className="text-destructive shrink-0" /> ⚠️ Disclaimer / দাবিত্যাগ
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
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
          <p className="text-sm text-muted-foreground leading-relaxed pt-1 border-t border-destructive/20">
            এই পোর্টালটি বগুলা ২ নং গ্রাম পঞ্চায়েত, হাঁসখালি ব্লক, নদীয়ার একটি সহায়তামূলক নাগরিক সেবা ব্যবস্থা। আবেদনপত্রে দাখিল করা সমস্ত তথ্য সম্পূর্ণ সত্য এবং নির্ভুল হওয়া আবশ্যক; অসত্য বা বিভ্রান্তিকর তথ্য প্রদান কিংবা জাল ও বিকৃত নথিপত্র দাখিল করা হলে সংশ্লিষ্ট আবেদনটি অবিলম্বে বাতিল হবে এবং প্রযোজ্য ভারতীয় ও রাজ্য আইনানুযায়ী উপযুক্ত শাস্তিমূলক ব্যবস্থা গ্রহণ করা হতে পারে। এই পোর্টালের মাধ্যমে ইস্যু করা সমস্ত ডিজিটাল শংসাপত্র প্রদানকারী কর্তৃপক্ষের আনুষ্ঠানিক যাচাই সাপেক্ষ এবং কোনো তথ্য গোপন, অসত্য বিবরণ কিংবা অননুমোদিত উপায়ে শংসাপত্র সংগৃহীত হলে তা যেকোনো সময় বাতিল করা হতে পারে। ডাউনলোডকৃত প্রতিটি শংসাপত্রের প্রতিলিপিতে ডিজিটাল নিরাপত্তা জলছাপ (Watermark) থাকবে এবং এই পোর্টালের অফিসিয়াল পাবলিক যাচাইকরণ পেজে সফলভাবে প্রতিপাদিত হলেই কেবল তা আইনত বৈধ বলে গণ্য হবে। অসম্পূর্ণ নথিপত্র, প্রযুক্তিগত বা ইন্টারনেট বিভ্রাট কিংবা আবেদনকারীর প্রদত্ত ভুল মোবাইল নম্বর বা ইমেলের কারণে সৃষ্ট কোনো বিলম্বের জন্য গ্রাম পঞ্চায়েত কর্তৃপক্ষ কোনোভাবেই দায়ী থাকবে না। সরকারি নির্দেশিকা ও পঞ্চায়েত নীতিমালার ভিত্তিতে এখানে তালিকাভুক্ত পরিষেবাসমূহ যেকোনো সময় সংযোজন, সংশোধন বা প্রত্যাহার করার পূর্ণ অধিকার পঞ্চায়েত কর্তৃপক্ষ সংরক্ষণ করে।
          </p>
        </Card>

        <div className="flex items-start gap-3 rounded-xl border p-4 bg-card shadow-xs">
          <Checkbox id="agree" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />
          <label htmlFor="agree" className="text-sm leading-snug cursor-pointer select-none">
            <span className="font-medium">✅ I have read and understood the above information.</span>
            <span className="block text-xs text-muted-foreground mt-0.5">
              আমি উপরের তথ্য পড়েছি এবং বুঝেছি।
            </span>
          </label>
        </div>

        {/* Side-by-side action buttons with enlarged size */}
        <div className="flex flex-row items-center gap-3 sm:gap-4 w-full pt-1">
          <Button
            asChild
            disabled={!agreed}
            size="lg"
            className="flex-1 min-h-[50px] sm:min-h-[54px] text-sm sm:text-base font-semibold px-4 sm:px-6 py-3 rounded-xl shadow-sm transition-all"
          >
            <Link
              to="/public/register"
              onClick={(e) => { if (!agreed) e.preventDefault(); }}
              aria-disabled={!agreed}
              className={!agreed ? "pointer-events-none opacity-50 flex items-center justify-center gap-2" : "flex items-center justify-center gap-2"}
            >
              <span>Continue / এগিয়ে যান</span>
              <ArrowRight size={18} className="shrink-0" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="flex-1 min-h-[50px] sm:min-h-[54px] text-sm sm:text-base font-semibold px-4 sm:px-6 py-3 rounded-xl border-2 hover:bg-muted/80 shadow-sm transition-all"
          >
            <Link to="/public/login" className="flex items-center justify-center gap-2 text-center">
              <span>🔐 Already registered? Login</span>
            </Link>
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground pt-2">
          📍 Bagula II Gram Panchayat · Hanskhali Block · Nadia, West Bengal
        </p>
      </div>
    </PublicShell>
  );
}
