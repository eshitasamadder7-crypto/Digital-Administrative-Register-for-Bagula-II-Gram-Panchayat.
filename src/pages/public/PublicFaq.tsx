import { Helmet } from "react-helmet-async";
import { CitizenFaqSection } from "@/components/citizen/CitizenFaqSection";
import PublicShell from "./PublicShell";
import { BackButton } from "@/components/BackButton";

export default function PublicFaq() {
  return (
    <PublicShell>
      <Helmet>
        <title>Citizen Information Desk & FAQ — Bagula II Gram Panchayat</title>
        <meta
          name="description"
          content="Frequently Asked Questions and Citizen Information Desk for Bagula II Gram Panchayat services, Warish succession certificates, and birth record digitization."
        />
        <link rel="canonical" href="https://bagula2gp.lovable.app/public/faq" />
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <BackButton fallbackPath="/public" text="Back to Citizen Home" />
        <CitizenFaqSection />
      </div>
    </PublicShell>
  );
}
