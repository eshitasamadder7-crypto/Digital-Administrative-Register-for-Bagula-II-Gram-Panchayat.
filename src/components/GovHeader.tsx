import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown, ExternalLink } from "lucide-react";
import { VerifyQuickAction } from "@/components/VerifyQuickAction";
import { NotificationCenter } from "@/components/NotificationCenter";
import { ExternalRedirectModal } from "@/components/ExternalRedirectModal";
import { getRedirectGuide, type RedirectGuide } from "@/data/redirectGuides";
import { useAppSettings } from "@/lib/appSettings";
import { AlertTriangle } from "lucide-react";

const birthDeathItems = [
  { label: "📄 Birth Digitization A4 Form (ডিজিটালাইজেশন আবেদনপত্র)", to: "/birth-digitization-form" },
  { label: "📄 CRS Official Forms (Download First)", guideKey: "crs-forms" },
  { label: "🆕 New Registration — Birth", guideKey: "birth-new" },
  { label: "🆕 New Registration — Death", guideKey: "death-new" },
  { label: "✏️ Correction — Birth", guideKey: "birth-death-correction" },
  { label: "✏️ Correction — Death", guideKey: "death-correction" },
  { label: "⏰ Delayed Registration — Birth", guideKey: "birth-death-delayed" },
  { label: "⏰ Delayed Registration — Death", guideKey: "death-delayed" },
  { label: "💾 Digitalization — Birth Certificate (Old)", guideKey: "birth-digitalization" },
];

const certificateItems = [
  { label: "📄 Warish A4 Application Form (আবেদনপত্র)", to: "/warish-application-form" },
  { label: "📄 Birth Digitization A4 Form (আবেদনপত্র)", to: "/birth-digitization-form" },
  { label: "👤 Dependent Certificate", to: "/dependent-certificate" },
  { label: "📜 Warish Certificate (Admin)", to: "/warish-certificate" },
];

const wbpmsItems = [
  { label: "🏠 Residential Certificate", guideKey: "wbpms-residential" },
  { label: "📋 Character Certificate", guideKey: "wbpms-character" },
  { label: "💰 Income Certificate", guideKey: "wbpms-income" },
  { label: "🧑 Same Person Certificate", guideKey: "wbpms-same-person" },
  { label: "📏 Distance Certificate", guideKey: "wbpms-distance" },
  { label: "🏷️ Caste Authentication", guideKey: "wbpms-caste" },
  { label: "💍 Unmarried Certificate", guideKey: "wbpms-unmarried" },
];

const citizenItems = [
  { label: "📄 Warish A4 Application Form (আবেদনপত্র)", to: "/warish-application-form" },
  { label: "📄 Birth Digitization A4 Form (আবেদনপত্র)", to: "/birth-digitization-form" },
  { label: "📜 Warish Certificate (Workflow & Apply)", guideKey: "warish-workflow" },
  { label: "👤 Dependent Certificate (Workflow & Apply)", guideKey: "dependent-workflow" },
  { label: "🌐 Public Citizen Portal", to: "/public" },
  { label: "🏠 WBPMS Certificates", guideKey: "wbpms-general" },
  { label: "📑 Document Requirements", to: "/wbpms-info" },
  { label: "🏛️ Elected Representatives", to: "/elected-representatives" },
];

export default function GovHeader() {
  const { authority } = useAppSettings();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bdOpen, setBdOpen] = useState(false);
  const [certOpen, setCertOpen] = useState(false);
  const [wbpmsOpen, setWbpmsOpen] = useState(false);
  const [citizenOpen, setCitizenOpen] = useState(false);
  const [redirectGuide, setRedirectGuide] = useState<RedirectGuide | null>(null);
  const [redirectModalOpen, setRedirectModalOpen] = useState(false);
  const location = useLocation();
  const bdRef = useRef<HTMLDivElement>(null);
  const certRef = useRef<HTMLDivElement>(null);
  const wbpmsRef = useRef<HTMLDivElement>(null);
  const citizenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setBdOpen(false);
    setCertOpen(false);
    setWbpmsOpen(false);
    setCitizenOpen(false);
  }, [location]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bdRef.current && !bdRef.current.contains(e.target as Node)) setBdOpen(false);
      if (certRef.current && !certRef.current.contains(e.target as Node)) setCertOpen(false);
      if (wbpmsRef.current && !wbpmsRef.current.contains(e.target as Node)) setWbpmsOpen(false);
      if (citizenRef.current && !citizenRef.current.contains(e.target as Node)) setCitizenOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const closeAll = () => { setBdOpen(false); setCertOpen(false); setWbpmsOpen(false); setCitizenOpen(false); };

  const openRedirect = (key: string) => {
    closeAll();
    setMobileOpen(false);
    setRedirectGuide(getRedirectGuide(key));
    setRedirectModalOpen(true);
  };

  return (
    <header className="no-print sticky top-0 z-50">
      {/* Emergency Announcement Banner configured in Super Admin Authority Settings */}
      {authority.emergencyNoticeEnabled && (
        <aside aria-label="Administrative Emergency Notice" className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-600 text-white text-xs px-4 py-2 text-center flex items-center justify-center gap-2 shadow-md font-medium tracking-wide">
          <AlertTriangle size={15} className="shrink-0 animate-pulse text-amber-200" />
          <span>{authority.emergencyNoticeTextEn}</span>
          {authority.emergencyNoticeTextBn && (
            <span className="opacity-90 font-bengali hidden sm:inline border-l border-white/30 pl-2">
              {authority.emergencyNoticeTextBn}
            </span>
          )}
        </aside>
      )}

      <div className="gov-tricolor-top" />
      <div className="gov-gradient-header text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="text-center mb-1">
            <p className="text-xs opacity-80 tracking-wider uppercase">Office of the</p>
            <div role="text" className="text-xl md:text-2xl font-bold tracking-wide font-heading uppercase">
              {authority.gramPanchayatName || "BAGULA II GRAM PANCHAYAT"}
            </div>
            <p className="text-xs opacity-80">(Under {authority.blockName || "Hanskhali"} Panchayat Samity)</p>
            <p className="text-xs opacity-70">
              Vill: {authority.officeAddressVillage || "Stationpara"}, P.O.: {authority.officeAddressPostOffice || "Bagula"}, P.S.: {authority.policeStation || "Hanskhali"}, {authority.district || "Nadia"}, W.B. - {authority.pincode || "741502"}
            </p>
            <p className="text-xs opacity-70">Email: {authority.contactEmail || "bagula2nogp111@gmail.com"}</p>
          </div>
          <div className="flex justify-between text-xs mt-2 max-w-md mx-auto">
            <div className="text-center">
              <p className="font-bold" style={{ color: "hsl(30 100% 60%)" }}>
                {authority.pradhanName ? `Smt. ${authority.pradhanName}` : "Smt. Susmita Biswas Barman"}
              </p>
              <p className="opacity-80">Prodhan</p>
            </div>
            <div className="text-center">
              <p className="font-bold" style={{ color: "hsl(30 100% 60%)" }}>
                {authority.upaPradhanName ? `Sri ${authority.upaPradhanName}` : "Sri Manaranjan Bhowmick"}
              </p>
              <p className="opacity-80">Upa-Prodhan</p>
            </div>
          </div>
        </div>

        <nav className="border-t border-primary-foreground/10" style={{ background: "hsla(30, 100%, 60%, 0.15)" }}>
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-12">
              <div className="hidden md:flex items-center gap-1 flex-wrap">
                <Link to="/" className="px-3 py-2 text-sm rounded hover:bg-primary-foreground/10 transition">Home</Link>

                <Link to="/public" className="px-3 py-2 text-sm font-semibold rounded bg-primary-foreground/15 hover:bg-primary-foreground/25 transition">Public Access</Link>

                <button
                  type="button"
                  onClick={() => openRedirect("prd-tax")}
                  className="px-3 py-2 text-sm rounded hover:bg-primary-foreground/10 transition flex items-center gap-1"
                >
                  PRD Tax <ExternalLink size={12} />
                </button>

                <button
                  type="button"
                  onClick={() => openRedirect("mnrega-jobcard")}
                  className="px-3 py-2 text-sm rounded hover:bg-primary-foreground/10 transition flex items-center gap-1"
                >
                  MNREGA Jobs <ExternalLink size={12} />
                </button>

                <div ref={bdRef} className="relative">
                  <button onClick={() => { closeAll(); setBdOpen(!bdOpen); }} className="px-3 py-2 text-sm rounded hover:bg-primary-foreground/10 transition flex items-center gap-1">
                    Birth & Death <ChevronDown size={14} className={`transition ${bdOpen ? "rotate-180" : ""}`} />
                  </button>
                  {bdOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-card text-card-foreground rounded-lg shadow-xl border w-72 py-2 z-50">
                      {birthDeathItems.map((item, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => openRedirect(item.guideKey)}
                          className="w-full text-left block px-4 py-2 text-sm hover:bg-muted transition flex items-center justify-between"
                        >
                          {item.label} <ExternalLink size={12} className="text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div ref={certRef} className="relative">
                  <button onClick={() => { closeAll(); setCertOpen(!certOpen); }} className="px-3 py-2 text-sm rounded hover:bg-primary-foreground/10 transition flex items-center gap-1">
                    Certificates <ChevronDown size={14} className={`transition ${certOpen ? "rotate-180" : ""}`} />
                  </button>
                  {certOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-card text-card-foreground rounded-lg shadow-xl border w-64 py-2 z-50">
                      {certificateItems.map((item, i) => (
                        <Link key={i} to={item.to} className="block px-4 py-2 text-sm hover:bg-muted transition">
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div ref={wbpmsRef} className="relative">
                  <button onClick={() => { closeAll(); setWbpmsOpen(!wbpmsOpen); }} className="px-3 py-2 text-sm rounded hover:bg-primary-foreground/10 transition flex items-center gap-1">
                    WBPMS Services <ChevronDown size={14} className={`transition ${wbpmsOpen ? "rotate-180" : ""}`} />
                  </button>
                  {wbpmsOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-card text-card-foreground rounded-lg shadow-xl border w-72 py-2 z-50">
                      {wbpmsItems.map((item, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => openRedirect(item.guideKey)}
                          className="w-full text-left block px-4 py-2 text-sm hover:bg-muted transition flex items-center justify-between"
                        >
                          {item.label} <ExternalLink size={12} className="text-muted-foreground" />
                        </button>
                      ))}
                      <div className="border-t mt-1 pt-1">
                        <Link to="/wbpms-info" className="block px-4 py-2 text-sm hover:bg-muted transition font-medium" style={{ color: "hsl(30 100% 50%)" }}>
                          📑 Document Requirements & Info
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                <div ref={citizenRef} className="relative">
                  <button onClick={() => { closeAll(); setCitizenOpen(!citizenOpen); }} className="px-3 py-2 text-sm rounded hover:bg-primary-foreground/10 transition flex items-center gap-1">
                    Citizen Services <ChevronDown size={14} className={`transition ${citizenOpen ? "rotate-180" : ""}`} />
                  </button>
                  {citizenOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-card text-card-foreground rounded-lg shadow-xl border w-72 py-2 z-50">
                      {citizenItems.map((item, i) =>
                        'guideKey' in item ? (
                          <button
                            key={i}
                            type="button"
                            onClick={() => openRedirect(item.guideKey!)}
                            className="w-full text-left block px-4 py-2 text-sm hover:bg-muted transition flex items-center justify-between"
                          >
                            {item.label} <ExternalLink size={12} className="text-muted-foreground" />
                          </button>
                        ) : (
                          <Link key={i} to={item.to!} className="block px-4 py-2 text-sm hover:bg-muted transition">
                            {item.label}
                          </Link>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                className="md:hidden p-2"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileOpen}
                aria-controls="gov-mobile-menu"
              >
                {mobileOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <div className="hidden md:block">
                <div className="flex items-center gap-2">
                  <NotificationCenter variant="compact" tone="light" />
                  <VerifyQuickAction variant="compact" />
                </div>
              </div>
            </div>
          </div>

          {mobileOpen && (
            <div className="md:hidden border-t border-primary-foreground/10 pb-4 px-4" style={{ background: "hsla(30, 100%, 60%, 0.1)" }}>
              <Link to="/" className="block py-2 text-sm">Home</Link>
              <Link to="/public" className="block py-2 text-sm font-semibold">Public Access</Link>
              <p className="py-1 text-xs opacity-70">Cyber Cafe Access — Coming Soon</p>
              <button
                type="button"
                onClick={() => openRedirect("prd-tax")}
                className="w-full text-left block py-2 text-sm"
              >
                PRD Tax ↗
              </button>
              <button
                type="button"
                onClick={() => openRedirect("mnrega-jobcard")}
                className="w-full text-left block py-2 text-sm"
              >
                MNREGA Jobs ↗
              </button>
              <p className="text-xs font-bold mt-3 mb-1 opacity-70">Birth & Death</p>
              {birthDeathItems.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => openRedirect(item.guideKey)}
                  className="w-full text-left block py-1.5 pl-3 text-xs opacity-90"
                >
                  {item.label} ↗
                </button>
              ))}
              <p className="text-xs font-bold mt-3 mb-1 opacity-70">Certificates</p>
              {certificateItems.map((item, i) => (
                <Link key={i} to={item.to} className="block py-1.5 pl-3 text-sm">{item.label}</Link>
              ))}
              <p className="text-xs font-bold mt-3 mb-1 opacity-70">WBPMS Services</p>
              {wbpmsItems.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => openRedirect(item.guideKey)}
                  className="w-full text-left block py-1.5 pl-3 text-xs opacity-90"
                >
                  {item.label} ↗
                </button>
              ))}
              <Link to="/wbpms-info" className="block py-1.5 pl-3 text-sm" style={{ color: "hsl(30 100% 60%)" }}>📑 Document Requirements</Link>
              <p className="text-xs font-bold mt-3 mb-1 opacity-70">Citizen Services</p>
              <Link to="/elected-representatives" className="block py-1.5 pl-3 text-sm">🏛️ Elected Representatives</Link>
            </div>
          )}
        </nav>
      </div>

      <ExternalRedirectModal
        guide={redirectGuide}
        open={redirectModalOpen}
        onOpenChange={setRedirectModalOpen}
      />
    </header>
  );
}
