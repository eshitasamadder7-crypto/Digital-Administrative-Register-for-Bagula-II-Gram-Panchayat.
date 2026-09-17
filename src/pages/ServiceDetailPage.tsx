import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ServiceInformationViewer } from "@/components/services/ServiceInformationViewer";
import { getDynamicRedirectGuide } from "@/lib/sopMasterData";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Building2 } from "lucide-react";

export default function ServiceDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const guideKey = slug || "wbpms-residential";
  const guide = getDynamicRedirectGuide(guideKey);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-8 px-4 sm:px-6">
      <Helmet>
        <title>{guide ? `${guide.title} | Bagula II Gram Panchayat` : "Service Information | Bagula II GP"}</title>
        <meta
          name="description"
          content={guide?.description || "Official service information, SOP guidelines, and application procedures for Bagula II Gram Panchayat, Nadia."}
        />
      </Helmet>

      {/* Breadcrumb Navigation */}
      <div className="max-w-4xl mx-auto mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground flex items-center gap-1">
            <Home size={13} /> Home
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium truncate">{guide?.title || slug}</span>
        </div>

        <Button asChild variant="ghost" size="sm" className="h-8 text-xs gap-1.5">
          <Link to="/">
            <ArrowLeft size={13} /> Back to Services
          </Link>
        </Button>
      </div>

      <div className="max-w-4xl mx-auto">
        <ServiceInformationViewer guideKey={guideKey} inline />
      </div>
    </div>
  );
}
