import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import WarishApplicationFormPrint from "@/components/warish/WarishApplicationFormPrint";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Printer, FileText, ScrollText } from "lucide-react";

export default function WarishApplicationFormPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-12">
      <Helmet>
        <title>Warish Application Form (A4 Print) — Bagula II Gram Panchayat</title>
        <meta
          name="description"
          content="Official Warish (Legal Heir / Succession) physical application form for Bagula II Gram Panchayat. Instant download and forced A4 printout."
        />
      </Helmet>

      {/* Navigation Header (hidden on print) */}
      <div className="no-print sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/80 px-4 py-3 shadow-2xs">
        <div className="max-w-[210mm] mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(-1)}
              className="rounded-xl text-xs gap-1.5 h-8 font-medium"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </Button>
            <Link to="/">
              <Button variant="ghost" size="sm" className="rounded-xl text-xs gap-1.5 h-8">
                <Home size={14} />
                <span className="hidden sm:inline">GP Portal</span>
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/public/apply/warish">
              <Button variant="outline" size="sm" className="rounded-xl text-xs font-semibold h-8 text-primary border-primary/30">
                <span>Apply Online Portal</span>
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={() => window.print()}
              className="rounded-xl bg-primary text-primary-foreground text-xs font-bold gap-1.5 h-8 shadow-xs"
            >
              <Printer size={14} />
              <span>Print A4 Form</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        <WarishApplicationFormPrint />
      </main>
    </div>
  );
}
