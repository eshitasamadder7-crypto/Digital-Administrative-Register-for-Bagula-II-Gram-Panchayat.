import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import LegacyBirthDigitizationPortal from "@/components/birth/LegacyBirthDigitizationPortal";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, FileText, Globe } from "lucide-react";

export default function BirthDigitizationFormPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-12">
      <Helmet>
        <title>Legacy Birth Certificate Digitization Pre-Verification Portal — Bagula II Gram Panchayat</title>
        <meta
          name="description"
          content="Decentralized Cyber Cafe Pre-Verification & Digitization Tool for Bagula II Gram Panchayat (Nadia). Case-I SOP compliance, DPDP 2025 zero-retention, and phonetic register search."
        />
      </Helmet>

      {/* Navigation Header (hidden on print) */}
      <div className="no-print sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/80 px-4 py-3 shadow-2xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
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
            <a
              href="/legacy-digitization.html"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex"
            >
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs h-8 text-emerald-800 border-emerald-300 hover:bg-emerald-50"
              >
                <FileText size={13} className="mr-1 text-emerald-700" />
                <span>Standalone Single HTML</span>
              </Button>
            </a>
            <Link to="/warish-application-form">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl text-xs h-8 text-muted-foreground hover:text-foreground hidden sm:inline-flex"
              >
                <FileText size={13} className="mr-1" />
                <span>Warish A4 Form</span>
              </Button>
            </Link>
            <a
              href="https://janmamrityutathya.wb.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex"
            >
              <Button variant="outline" size="sm" className="rounded-xl text-xs font-semibold h-8 text-primary border-primary/30">
                <Globe size={13} className="mr-1 text-primary" />
                <span>State Portal (JMTP)</span>
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        <LegacyBirthDigitizationPortal />
      </main>
    </div>
  );
}
