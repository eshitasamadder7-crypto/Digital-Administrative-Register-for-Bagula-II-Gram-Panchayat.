import { useState, useMemo } from "react";
import {
  Search,
  Building2,
  Phone,
  Mail,
  CheckCircle2,
  LayoutGrid,
  Table as TableIcon,
  Landmark,
  UserCheck,
  MapPin,
  ExternalLink,
  HelpCircle,
  Sparkles,
  Layers,
  Award,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { GoBackButton } from "@/components/GoBackButton";
import {
  ELECTED_REPRESENTATIVES_DATA,
  BOOTHS_SANSAD_MAPPINGS,
  PANCHAYAT_SAMITI_REPRESENTATIVES,
  type ElectedRepresentativeRecord,
  type BoothSansadMapping,
} from "@/lib/electedRepresentativesData";
import {
  useElectedRepresentativesLive,
  getPartyColorConfig,
  PARTY_OPTIONS,
  type PartyColorTheme,
} from "@/lib/membersMasterData";
import {
  PartyOfficialLogo,
  PartyLogoBadge,
} from "@/components/PartyOfficialLogo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function ElectedRepresentatives() {
  const { representatives: liveRepresentatives, loading: liveLoading } = useElectedRepresentativesLive();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedWard, setSelectedWard] = useState<string>("all");
  const [selectedCaste, setSelectedCaste] = useState<string>("all");
  const [selectedParty, setSelectedParty] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"members" | "booths">("members");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Profile modal state for viewing individual representative
  const [selectedMember, setSelectedMember] = useState<ElectedRepresentativeRecord | null>(null);

  // Dynamic Seat Tally & Winning Political Party Calculation (Total 30 Sansads)
  const partyTally = useMemo(() => {
    const counts: Record<string, { theme: PartyColorTheme; count: number; members: ElectedRepresentativeRecord[] }> = {};
    PARTY_OPTIONS.forEach((opt) => {
      counts[opt.code] = { theme: opt, count: 0, members: [] };
    });

    liveRepresentatives.forEach((rep) => {
      const theme = (rep as any).partyTheme || getPartyColorConfig(rep.partyCode || rep.partyName);
      if (!counts[theme.code]) {
        counts[theme.code] = { theme, count: 0, members: [] };
      }
      counts[theme.code].count += 1;
      counts[theme.code].members.push(rep);
    });

    const sortedList = Object.values(counts).sort((a, b) => b.count - a.count);
    const winning = sortedList[0] || { theme: getPartyColorConfig("AITC"), count: 0, members: [] };
    const majorityThreshold = 16; // 16 out of 30 seats
    const hasMajority = winning.count >= majorityThreshold;

    return {
      allParties: sortedList,
      activeParties: sortedList.filter((p) => p.count > 0),
      winningParty: winning.theme,
      winningCount: winning.count,
      winningPercentage: ((winning.count / 30) * 100).toFixed(1),
      hasMajority,
      totalSeats: 30,
      majorityThreshold,
    };
  }, [liveRepresentatives]);

  // Key officials: Prodhan & Upa-Prodhan
  const prodhan = useMemo(
    () => liveRepresentatives.find((m) => m.designation === "Prodhan") || liveRepresentatives[0],
    [liveRepresentatives]
  );
  const upaProdhan = useMemo(
    () => liveRepresentatives.find((m) => m.designation === "Upa-Prodhan") || liveRepresentatives[1],
    [liveRepresentatives]
  );

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return liveRepresentatives.filter((m) => {
      if (selectedRole !== "all" && m.designation !== selectedRole) {
        return false;
      }
      if (selectedWard !== "all" && m.wardNumber !== Number(selectedWard)) {
        return false;
      }
      if (selectedCaste !== "all" && m.caste !== selectedCaste) {
        return false;
      }
      if (selectedParty !== "all") {
        const theme = (m as any).partyTheme || getPartyColorConfig(m.partyCode || m.partyName);
        if (selectedParty === "WINNING") {
          if (theme.code !== partyTally.winningParty.code) {
            return false;
          }
        } else if (theme.code !== selectedParty && !m.partyName?.toLowerCase().includes(selectedParty.toLowerCase())) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          m.nameBn.toLowerCase().includes(q) ||
          m.address.toLowerCase().includes(q) ||
          m.caste.toLowerCase().includes(q) ||
          m.sansadNo.toLowerCase().includes(q) ||
          m.partNo.toLowerCase().includes(q) ||
          m.contact.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.partyName.toLowerCase().includes(q) ||
          `ward ${m.wardNumber}`.includes(q) ||
          `sansad ${m.sansadNo}`.toLowerCase().includes(q) ||
          `part ${m.partNo}`.toLowerCase().includes(q) ||
          `booth ${m.partNo}`.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [liveRepresentatives, selectedRole, selectedWard, selectedCaste, selectedParty, searchQuery, partyTally.winningParty.code]);

  // Filtered booths list
  const filteredBooths = useMemo(() => {
    return BOOTHS_SANSAD_MAPPINGS.filter((b) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          b.boothName.toLowerCase().includes(q) ||
          b.boothNameBn.toLowerCase().includes(q) ||
          b.location.toLowerCase().includes(q) ||
          b.representativeName.toLowerCase().includes(q) ||
          b.sansadNo.toLowerCase().includes(q) ||
          b.boothNumber.toString().includes(q) ||
          `ward ${b.wardNumber}`.includes(q) ||
          `sansad ${b.sansadNo}`.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20 animate-fade-in">
      <Helmet>
        <title>🏛️ Elected Representatives (30 Sansads & 33 Booths) — Bagula II Gram Panchayat</title>
        <meta
          name="description"
          content="Official 30 Elected Ward Representatives (Sansads I to XXX) and 33 Polling Booths (Parts 21 to 53) of Bagula II Gram Panchayat, Nadia, West Bengal."
        />
        <meta property="og:title" content="🏛️ Elected Representatives — Bagula II Gram Panchayat" />
        <meta
          property="og:description"
          content="Dynamic institutional register of 30 Elected Members and 33 Polling Booths of Bagula II Gram Panchayat (PGE-2023)."
        />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <GoBackButton fallbackUrl="/" className="mb-4" />

        {/* Header Hero Banner */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md mb-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-md mb-3 border border-white/15">
              <Building2 size={13} />
              <span>🏛️ Panchayats & Rural Development Department, Govt. of West Bengal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight font-heading flex items-center gap-3">
              <span>🏛️ Elected Representatives Directory</span>
            </h1>
            <p className="text-sm sm:text-base text-emerald-100/90 mt-2 font-bengali">
              🗳️ বগুলা ২ নং গ্রাম পঞ্চায়েতের ৩০টি গ্রাম সংসদের নির্বাচিত জনপ্রতিনিধি ও ৩৩টি পোলিং বুথ রেজিস্টার (PGE-2023)
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-emerald-200/90">
              <span>📍 <strong>District:</strong> Nadia</span>
              <span>•</span>
              <span>🏢 <strong>Block:</strong> Hanskhali</span>
              <span>•</span>
              <span>👥 <strong>Gram Sansads:</strong> 30 (I – XXX)</span>
              <span>•</span>
              <span>🗳️ <strong>Polling Booths:</strong> 33 (Parts 21 – 53)</span>
            </div>
          </div>
        </div>

        {/* Structural Clarification Banner (30 Sansads vs 33 Booths) */}
        <div className="bg-emerald-50/90 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 mb-6 text-xs text-emerald-950 shadow-xs flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold text-base shadow-xs">
            💡
          </div>
          <div className="flex-1 space-y-1">
            <h2 className="font-bold text-sm text-emerald-900 flex items-center gap-2">
              <span>🗳️ Institutional Delimitation: 30 Sansads & 33 Polling Booths</span>
            </h2>
            <p className="text-emerald-800 leading-relaxed">
              Bagula II Gram Panchayat is constituted with <strong>30 Elected Ward Members</strong> representing <strong>30 Gram Sansads</strong> (numbered <strong>I to XXX</strong>) covering <strong>33 Polling Booths</strong> (Part Nos. <strong>21 to 53</strong>).
            </p>
            <div className="pt-1.5 flex flex-wrap gap-2 text-[11px] font-medium text-emerald-900">
              <span className="bg-white/80 border border-emerald-300 px-2 py-0.5 rounded-md">
                ⚡ <strong>Sansad IX (Ward 9):</strong> Parts 29 & 30
              </span>
              <span className="bg-white/80 border border-emerald-300 px-2 py-0.5 rounded-md">
                ⚡ <strong>Sansad X (Ward 10):</strong> Parts 31 & 32
              </span>
              <span className="bg-white/80 border border-emerald-300 px-2 py-0.5 rounded-md">
                ⚡ <strong>Sansad XVII (Ward 17):</strong> Parts 39 & 40
              </span>
              <span className="text-emerald-700 self-center">
                (Remaining 27 Sansads have 1 polling booth each)
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* WINNING POLITICAL PARTY & GOVERNING BOARD BANNER (PGE-2023)              */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-5 md:p-6 mb-8 border border-slate-700/60 shadow-md relative overflow-hidden">
          {/* Subtle party theme glowing aura */}
          <div
            className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ backgroundColor: partyTally.winningParty.hex }}
          />

          <div className="relative z-10">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-700/80">
              <div className="flex items-center gap-3.5">
                {/* Official Party Logo of Winning Party */}
                <div className="relative shrink-0">
                  <PartyOfficialLogo
                    theme={partyTally.winningParty}
                    size="xl"
                    className="border-2 border-white/40 shadow-md ring-4 ring-amber-400/30"
                  />
                  <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-amber-950 font-black text-[10px] px-1.5 py-0.5 rounded-full shadow-xs">
                    🏆 #1
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-amber-400/90 text-amber-950 font-extrabold text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                      🏆 WINNING POLITICAL PARTY
                    </span>
                    <span className="text-xs text-slate-300 font-medium">
                      PGE-2023 West Bengal Mandate
                    </span>
                  </div>
                  <h2 className="text-lg md:text-xl font-black text-white mt-1 flex items-center gap-2 flex-wrap">
                    <span>{partyTally.winningParty.fullName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-md font-bold text-white border border-white/20 ${partyTally.winningParty.badgeClass}`}>
                      {partyTally.winningParty.shortLabel}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-300 font-bengali">
                    {partyTally.winningParty.fullNameBn} · নির্বাচন প্রতীক: {partyTally.winningParty.symbolBn}
                  </p>
                </div>
              </div>

              {/* Status & Quick Filter Button */}
              <div className="flex items-center gap-2 self-stretch md:self-auto justify-between md:justify-end">
                <div className="bg-slate-800/80 border border-slate-600 rounded-2xl px-3.5 py-2 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Board Seats
                  </span>
                  <span className="text-xl font-extrabold text-amber-400 font-mono">
                    {partyTally.winningCount}
                    <span className="text-xs text-slate-400 font-normal"> / 30</span>
                  </span>
                </div>

                <Button
                  type="button"
                  variant={selectedParty === "WINNING" || selectedParty === partyTally.winningParty.code ? "default" : "outline"}
                  onClick={() => {
                    if (selectedParty === "WINNING" || selectedParty === partyTally.winningParty.code) {
                      setSelectedParty("all");
                    } else {
                      setSelectedParty("WINNING");
                    }
                  }}
                  className={`h-11 px-4 text-xs font-bold rounded-xl transition-all shadow-xs ${
                    selectedParty === "WINNING" || selectedParty === partyTally.winningParty.code
                      ? "bg-amber-400 hover:bg-amber-300 text-amber-950 border-amber-300"
                      : "bg-white/10 hover:bg-white/20 text-white border-white/20"
                  }`}
                >
                  {selectedParty === "WINNING" || selectedParty === partyTally.winningParty.code ? (
                    <>👥 Showing Winning Party ({partyTally.winningCount}) · Reset</>
                  ) : (
                    <>🏆 Allow Winning Party Only ({partyTally.winningCount} Seats)</>
                  )}
                </Button>
              </div>
            </div>

            {/* Political Parties Seat Tally Bar (30 Seats Total) */}
            <div className="pt-4">
              <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
                <span className="font-semibold flex items-center gap-1.5">
                  <span>🏛️ Gram Sansad Seat Distribution</span>
                  <span className="text-[11px] text-slate-400">(Majority Mark: 16 of 30 Seats)</span>
                </span>
                <span className="text-amber-300 font-bold text-[11px]">
                  {partyTally.hasMajority ? "✓ Absolute Majority Formed" : "Coalition / Single Largest Party"}
                </span>
              </div>

              {/* Progress stack */}
              <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex border border-slate-700/80 mb-3 shadow-inner">
                {partyTally.activeParties.map((item) => {
                  const pct = (item.count / 30) * 100;
                  return (
                    <div
                      key={item.theme.code}
                      style={{ width: `${pct}%`, backgroundColor: item.theme.hex }}
                      className="h-full transition-all relative group"
                      title={`${item.theme.shortLabel}: ${item.count} Seats (${pct.toFixed(1)}%)`}
                    />
                  );
                })}
              </div>

              {/* Interactive Clickable Seat Tally Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                  Filter by Party:
                </span>

                <button
                  type="button"
                  onClick={() => setSelectedParty("all")}
                  className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all border ${
                    selectedParty === "all"
                      ? "bg-white text-slate-900 border-white shadow-xs"
                      : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700"
                  }`}
                >
                  All 30 Seats
                </button>

                {partyTally.activeParties.map((item) => {
                  const isSelected = selectedParty === item.theme.code || (selectedParty === "WINNING" && item.theme.code === partyTally.winningParty.code);
                  const isWinning = item.theme.code === partyTally.winningParty.code;

                  return (
                    <button
                      key={item.theme.code}
                      type="button"
                      onClick={() => {
                        setSelectedParty(isSelected ? "all" : item.theme.code);
                      }}
                      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-bold transition-all border ${
                        isSelected
                          ? `${item.theme.badgeClass} ring-2 ring-white shadow-xs`
                          : "bg-slate-800/80 text-slate-200 border-slate-700 hover:bg-slate-700"
                      }`}
                    >
                      <PartyOfficialLogo theme={item.theme} size="xs" showTooltip={false} />
                      <span>{item.theme.shortLabel}:</span>
                      <span className="font-extrabold">{item.count}</span>
                      {isWinning && (
                        <span className="bg-amber-400 text-amber-950 text-[10px] px-1 rounded font-black">
                          WINNER
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Key Executive Leadership Cards (Prodhan & Upa-Prodhan) */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          {/* Prodhan */}
          {prodhan && (() => {
            const prodhanTheme = (prodhan as any)?.partyTheme || getPartyColorConfig(prodhan.partyCode || prodhan.partyName || "AITC");
            return (
              <div
                onClick={() => setSelectedMember(prodhan)}
                className={`bg-white rounded-2xl p-5 border-2 ${prodhanTheme.cardBorderClass} shadow-xs hover:shadow-md transition cursor-pointer relative overflow-hidden flex items-start gap-4 group`}
              >
                <div className={`w-2 h-full absolute left-0 top-0 ${prodhanTheme.dotClass}`} />
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-2xl shrink-0 group-hover:scale-105 transition-transform border-2 ${prodhanTheme.avatarBgClass} ${prodhanTheme.avatarTextClass} ${prodhanTheme.avatarBorderClass}`}>
                  👑
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[11px] font-bold">
                        👑 Prodhan (Pradhan)
                      </Badge>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${prodhanTheme.badgeClass}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${prodhanTheme.dotClass}`} />
                        {prodhanTheme.shortLabel} ({prodhanTheme.colorName})
                      </span>
                    </div>
                    <span className="text-[11px] text-amber-700 font-semibold group-hover:underline flex items-center gap-1">
                      <span>View Profile</span>
                      <ExternalLink size={11} />
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <h3 className="text-base font-extrabold text-slate-900 truncate">
                      {prodhan.name}
                    </h3>
                    <PartyOfficialLogo theme={prodhanTheme} size="sm" />
                    {prodhanTheme.code === partyTally.winningParty.code && (
                      <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 font-bold px-1.5 py-0.2 rounded-full inline-flex items-center gap-0.5" title="Member of Winning Majority Party">
                        🏆 Winning Party
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 font-bengali">{prodhan.nameBn}</p>
                  <div className="mt-2 text-xs text-slate-600 space-y-0.5">
                    <p>
                      <span className="font-semibold text-slate-800">📍 Constituency:</span> Sansad #{prodhan.sansadNo} (Ward #{prodhan.wardNumber}) · {prodhan.address}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-800">🗳️ Polling Booth:</span> Part #{prodhan.partNo} · <span className="font-semibold text-slate-800">🏷️ Caste:</span> {prodhan.caste}
                    </p>
                    <p className="flex items-center gap-1.5 pt-1 text-slate-700">
                      <Phone size={12} className="text-emerald-600" />
                      <span>{prodhan.contact}</span>
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Upa-Prodhan */}
          {upaProdhan && (() => {
            const upaTheme = (upaProdhan as any)?.partyTheme || getPartyColorConfig(upaProdhan.partyCode || upaProdhan.partyName || "AITC");
            return (
              <div
                onClick={() => setSelectedMember(upaProdhan)}
                className={`bg-white rounded-2xl p-5 border-2 ${upaTheme.cardBorderClass} shadow-xs hover:shadow-md transition cursor-pointer relative overflow-hidden flex items-start gap-4 group`}
              >
                <div className={`w-2 h-full absolute left-0 top-0 ${upaTheme.dotClass}`} />
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-2xl shrink-0 group-hover:scale-105 transition-transform border-2 ${upaTheme.avatarBgClass} ${upaTheme.avatarTextClass} ${upaTheme.avatarBorderClass}`}>
                  🤝
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Badge className="bg-blue-100 text-blue-900 border-blue-300 text-[11px] font-bold">
                        🤝 Upa-Prodhan
                      </Badge>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${upaTheme.badgeClass}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${upaTheme.dotClass}`} />
                        {upaTheme.shortLabel} ({upaTheme.colorName})
                      </span>
                    </div>
                    <span className="text-[11px] text-blue-700 font-semibold group-hover:underline flex items-center gap-1">
                      <span>View Profile</span>
                      <ExternalLink size={11} />
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <h3 className="text-base font-extrabold text-slate-900 truncate">
                      {upaProdhan.name}
                    </h3>
                    <PartyOfficialLogo theme={upaTheme} size="sm" />
                    {upaTheme.code === partyTally.winningParty.code && (
                      <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 font-bold px-1.5 py-0.2 rounded-full inline-flex items-center gap-0.5" title="Member of Winning Majority Party">
                        🏆 Winning Party
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 font-bengali">{upaProdhan.nameBn}</p>
                  <div className="mt-2 text-xs text-slate-600 space-y-0.5">
                    <p>
                      <span className="font-semibold text-slate-800">📍 Constituency:</span> Sansad #{upaProdhan.sansadNo} (Ward #{upaProdhan.wardNumber}) · {upaProdhan.address}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-800">🗳️ Polling Booth:</span> Part #{upaProdhan.partNo} · <span className="font-semibold text-slate-800">🏷️ Caste:</span> {upaProdhan.caste}
                    </p>
                    <p className="flex items-center gap-1.5 pt-1 text-slate-700">
                      <Phone size={12} className="text-emerald-600" />
                      <span>{upaProdhan.contact}</span>
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* View Selection Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 bg-slate-200/70 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("members")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "members"
                  ? "bg-white text-emerald-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>👥 30 Elected Members</span>
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">
                {filteredMembers.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("booths")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "booths"
                  ? "bg-white text-emerald-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>🗳️ 33 Polling Booths Mapping</span>
              <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px]">
                33 Parts
              </span>
            </button>
          </div>

          {activeTab === "members" && (
            <div className="flex items-center gap-2">
              <div className="bg-slate-200/70 p-1 rounded-xl flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                    viewMode === "table"
                      ? "bg-white shadow-xs text-slate-900"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Table View"
                >
                  <TableIcon size={14} />
                  <span>Table View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                    viewMode === "cards"
                      ? "bg-white shadow-xs text-slate-900"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Cards View"
                >
                  <LayoutGrid size={14} />
                  <span>Cards View</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input
                type="text"
                placeholder={
                  activeTab === "members"
                    ? "🔍 Search Name, Sansad, Part, Caste..."
                    : "🔍 Search Booth Name, Location, Part..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs bg-slate-50/50 border-slate-200"
              />
            </div>

            {/* Ward / Sansad Filter */}
            {activeTab === "members" && (
              <>
                <div>
                  <select
                    value={selectedWard}
                    onChange={(e) => setSelectedWard(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="all">🏛️ All 30 Sansads / Wards</option>
                    {ELECTED_REPRESENTATIVES_DATA.map((m) => (
                      <option key={m.slNo} value={m.wardNumber}>
                        Sansad {m.sansadNo} (Ward #{m.wardNumber}) — {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Role Filter */}
                <div>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="all">🎖️ All Roles / Designations</option>
                    <option value="Prodhan">👑 Prodhan</option>
                    <option value="Upa-Prodhan">🤝 Upa-Prodhan</option>
                    <option value="Ward Member">👤 Ward Member</option>
                  </select>
                </div>

                {/* Political Party Filter (Super Admin Color Mapped & Winning Party) */}
                <div>
                  <select
                    value={selectedParty}
                    onChange={(e) => setSelectedParty(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    <option value="all">🚩 All Parties & Colors (30 Members)</option>
                    <option value="WINNING">
                      🏆 Winning Party: {partyTally.winningParty.shortLabel} ({partyTally.winningCount} Seats - Ruling Board)
                    </option>
                    {partyTally.allParties.map((p) => (
                      <option key={p.theme.code} value={p.theme.code}>
                        {p.theme.shortLabel === partyTally.winningParty.shortLabel ? "🏆 " : ""}
                        {p.theme.shortLabel} ({p.theme.colorName}) — {p.count} Seat{p.count !== 1 ? "s" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Caste Category Filter */}
                <div>
                  <select
                    value={selectedCaste}
                    onChange={(e) => setSelectedCaste(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="all">🏷️ All Castes (SC / GEN / ST)</option>
                    <option value="S.C">S.C (Scheduled Caste)</option>
                    <option value="GEN">GEN (General)</option>
                    <option value="S.T">S.T (Scheduled Tribe)</option>
                    <option value="OBC">OBC (Other Backward)</option>
                  </select>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100">
            <span>
              {activeTab === "members" ? (
                <>
                  👥 Showing <strong className="text-slate-800">{filteredMembers.length}</strong> of 30 Elected Representatives
                </>
              ) : (
                <>
                  🗳️ Showing <strong className="text-slate-800">{filteredBooths.length}</strong> of 33 Polling Booths (Parts 21 to 53)
                </>
              )}
            </span>
            {(searchQuery || selectedWard !== "all" || selectedRole !== "all" || selectedCaste !== "all" || selectedParty !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedWard("all");
                  setSelectedRole("all");
                  setSelectedCaste("all");
                  setSelectedParty("all");
                }}
                className="text-emerald-700 hover:underline font-semibold"
              >
                🔄 Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: 30 ELECTED MEMBERS VIEW                                           */}
        {/* ========================================================================= */}
        {activeTab === "members" && (
          <>
            {/* VIEW MODE: TABLE FORMAT (PRIMARY REQUEST) */}
            {viewMode === "table" && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs mb-8">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100/90 text-slate-700 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-3.5 text-center">SL</th>
                        <th className="px-3 py-3.5 text-center">Ward</th>
                        <th className="px-3 py-3.5 text-center">Sansad</th>
                        <th className="px-4 py-3.5">Elected Representative</th>
                        <th className="px-3 py-3.5 text-center">Caste</th>
                        <th className="px-4 py-3.5">Designation</th>
                        <th className="px-4 py-3.5">Political Party & Color</th>
                        <th className="px-4 py-3.5">Address / Locality</th>
                        <th className="px-4 py-3.5">Part / Polling Booth(s)</th>
                        <th className="px-4 py-3.5">Contact</th>
                        <th className="px-3 py-3.5 text-center">Profile</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredMembers.map((m) => {
                        const theme = (m as any).partyTheme || getPartyColorConfig(m.partyCode || m.partyName);
                        return (
                          <tr
                            key={m.slNo}
                            onClick={() => setSelectedMember(m)}
                            className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                          >
                            {/* SL NO */}
                            <td className="px-3 py-3.5 text-center font-mono text-slate-500 font-semibold">
                              {m.slNo}
                            </td>

                            {/* WARD NUMBER */}
                            <td className="px-3 py-3.5 text-center">
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs">
                                {m.wardNumber}
                              </span>
                            </td>

                            {/* SANSAD NUMBER (ROMAN) */}
                            <td className="px-3 py-3.5 text-center">
                              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-200">
                                {m.sansadNo}
                              </span>
                            </td>

                            {/* REPRESENTATIVE NAME & AVATAR WITH PARTY COLOR RING */}
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border-2 shadow-2xs ${theme.avatarBgClass} ${theme.avatarTextClass} ${theme.avatarBorderClass}`}
                                >
                                  {m.name.charAt(0)}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="font-bold text-slate-900 group-hover:text-primary transition-colors">
                                      {m.name}
                                    </p>
                                    {/* Official Political Party Logo */}
                                    <PartyOfficialLogo theme={theme} size="sm" />
                                    {theme.code === partyTally.winningParty.code && (
                                      <span
                                        className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 font-extrabold px-1.5 py-0.2 rounded-full inline-flex items-center gap-0.5"
                                        title="Member of Winning / Ruling Majority Party"
                                      >
                                        <span>🏆</span>
                                        <span className="hidden md:inline">Ruling Board</span>
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-500 font-bengali">{m.nameBn}</p>
                                </div>
                              </div>
                            </td>

                            {/* CASTE */}
                            <td className="px-3 py-3.5 text-center">
                              <span className="inline-block font-semibold text-slate-700 px-2 py-0.5 rounded bg-slate-100 text-[11px]">
                                {m.caste}
                              </span>
                            </td>

                            {/* DESIGNATION */}
                            <td className="px-4 py-3.5">
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md ${
                                  m.designation === "Prodhan"
                                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                                    : m.designation === "Upa-Prodhan"
                                    ? "bg-blue-100 text-blue-900 border border-blue-300"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {m.designation === "Prodhan"
                                  ? "👑 Prodhan"
                                  : m.designation === "Upa-Prodhan"
                                  ? "🤝 Upa-Prodhan"
                                  : "👤 Ward Member"}
                              </span>
                            </td>

                            {/* POLITICAL PARTY & PROFILE COLOR BADGE */}
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <PartyLogoBadge
                                  theme={theme}
                                  isWinningParty={theme.code === partyTally.winningParty.code}
                                />
                                <span className="text-[10px] font-semibold text-slate-500">
                                  ({theme.colorName})
                                </span>
                              </div>
                            </td>

                            {/* ADDRESS */}
                            <td className="px-4 py-3.5 text-slate-700">
                              <span className="font-medium">{m.address}</span>
                            </td>

                            {/* PART / BOOTH */}
                            <td className="px-4 py-3.5">
                              <div className="space-y-0.5">
                                <span
                                  className={`font-bold text-xs ${
                                    m.isDualBooth ? "text-amber-800" : "text-slate-900"
                                  }`}
                                >
                                  Part #{m.partNo}
                                </span>
                                {m.isDualBooth && (
                                  <span className="block text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                    ⚡ 2 Polling Booths
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* CONTACT */}
                            <td className="px-4 py-3.5 text-slate-700 font-mono text-[11px]">
                              {m.contact}
                            </td>

                            {/* ACTION / PROFILE VIEWER */}
                            <td className="px-3 py-3.5 text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedMember(m);
                                }}
                                className="h-7 px-2.5 text-[11px] font-semibold text-emerald-800 border-emerald-300 hover:bg-emerald-50"
                              >
                                👤 View
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VIEW MODE: CARDS FORMAT */}
            {viewMode === "cards" && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {filteredMembers.map((m) => {
                  const theme = (m as any).partyTheme || getPartyColorConfig(m.partyCode || m.partyName);
                  return (
                    <div
                      key={m.slNo}
                      onClick={() => setSelectedMember(m)}
                      className={`bg-white rounded-2xl p-4 border-2 ${theme.cardBorderClass} shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between group relative overflow-hidden`}
                    >
                      {/* Left color bar matching political party */}
                      <div className={`w-1.5 h-full absolute left-0 top-0 ${theme.dotClass}`} />

                      <div className="pl-1">
                        {/* Top Badges */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200">
                              Ward #{m.wardNumber}
                            </span>
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-semibold text-[11px] border border-indigo-200">
                              🏛️ Sansad {m.sansadNo}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${theme.badgeClass}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${theme.dotClass}`} />
                              {theme.shortLabel}
                            </span>
                            {m.designation !== "Ward Member" && (
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  m.designation === "Prodhan"
                                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                                    : "bg-blue-100 text-blue-900 border border-blue-300"
                                }`}
                              >
                                {m.designation === "Prodhan" ? "👑 Prodhan" : "🤝 Upa-Prodhan"}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Name & Bengalis */}
                        <div className="flex items-center gap-3 mb-3">
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base shrink-0 border-2 shadow-xs group-hover:scale-105 transition-transform ${theme.avatarBgClass} ${theme.avatarTextClass} ${theme.avatarBorderClass}`}
                          >
                            {m.name.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-bold text-sm text-slate-900 truncate group-hover:text-primary transition-colors">
                                {m.name}
                              </h4>
                              {/* Official Political Party Logo */}
                              <PartyOfficialLogo theme={theme} size="sm" />
                              {theme.code === partyTally.winningParty.code && (
                                <span
                                  className="text-[9px] bg-amber-100 text-amber-900 border border-amber-300 font-extrabold px-1 py-0.2 rounded inline-flex items-center gap-0.5"
                                  title="Ruling Board Member"
                                >
                                  🏆
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 font-bengali truncate">{m.nameBn}</p>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              📍 {m.address}
                            </p>
                          </div>
                        </div>

                        {/* Info Panel */}
                        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/70 text-xs space-y-1.5 mb-3">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-medium">🗳️ Polling Booth / Part:</span>
                            <span
                              className={`font-bold ${
                                m.isDualBooth ? "text-amber-800 font-extrabold" : "text-slate-900"
                              }`}
                            >
                              Part #{m.partNo}
                            </span>
                          </div>
                          {m.isDualBooth && (
                            <div className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 rounded px-1.5 py-0.5 font-semibold">
                              ⚡ Single ward encompassing 2 Polling Booths
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                            <span className="text-slate-500">🏷️ Caste Category:</span>
                            <span className="font-semibold text-slate-800">{m.caste}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500">📞 Phone:</span>
                            <span className="font-mono text-slate-800">{m.contact}</span>
                          </div>
                        </div>
                      </div>

                      {/* Footer View Profile Button */}
                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs pl-1">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                          <span className={`w-2 h-2 rounded-full ${theme.dotClass}`} />
                          {theme.shortLabel} · {theme.colorName}
                        </span>
                        <span className="text-primary font-bold text-xs flex items-center gap-1 group-hover:underline">
                          <span>Profile</span>
                          <ExternalLink size={12} />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: 33 POLLING BOOTHS SANSAD MAPPING TABLE                            */}
        {/* ========================================================================= */}
        {activeTab === "booths" && (
          <div className="space-y-4 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 flex items-start gap-3">
              <span className="text-base">ℹ️</span>
              <p>
                Complete authoritative mapping of all <strong>33 Polling Booths (Parts 21 to 53)</strong> across the <strong>30 Gram Sansads</strong>. Note that Sansads <strong>IX, X, and XVII</strong> are dual-booth constituencies mapped to their respective single elected representative.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100/90 text-slate-700 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-3 text-center">Booth #</th>
                      <th className="px-3 py-3 text-center">Part #</th>
                      <th className="px-3 py-3 text-center">Sansad</th>
                      <th className="px-3 py-3 text-center">Ward</th>
                      <th className="px-4 py-3">Polling Station / Booth Name</th>
                      <th className="px-4 py-3">Location / Village</th>
                      <th className="px-4 py-3">Elected Representative</th>
                      <th className="px-3 py-3 text-center">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBooths.map((b) => (
                      <tr key={b.boothNumber} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-3 text-center font-bold text-slate-800">
                          {b.boothNumber}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-mono font-bold">
                            Part #{b.partNo}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-indigo-700">
                          Sansad {b.sansadNo}
                        </td>
                        <td className="px-3 py-3 text-center font-semibold text-slate-700">
                          Ward #{b.wardNumber}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{b.boothName}</p>
                          <p className="text-[11px] text-slate-500 font-bengali">{b.boothNameBn}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-medium">
                          📍 {b.location}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          👤 {b.representativeName}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {b.isSharedSansad ? (
                            <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                              ⚡ Dual Booth
                            </span>
                          ) : (
                            <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              Single
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Associated Representatives Section: Panchayat Samiti Members */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs mb-8">
          <div className="flex items-center gap-2.5 mb-2">
            <Landmark className="text-emerald-700" size={20} />
            <h2 className="text-lg font-bold text-slate-900">
              🏛️ Associated Panchayat Samiti Representatives
            </h2>
          </div>
          <p className="text-xs text-slate-600 mb-5">
            Elected Panchayat Samiti Members representing the jurisdiction of Bagula II Gram Panchayat at the Hanskhali Panchayat Samiti tier.
          </p>

          <div className="grid sm:grid-cols-3 gap-4">
            {PANCHAYAT_SAMITI_REPRESENTATIVES.map((rep) => (
              <div
                key={rep.slNo}
                className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 hover:border-emerald-300 transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                    🏛️
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-sm text-slate-900 truncate">{rep.name}</h4>
                    <p className="text-xs text-slate-500 font-bengali">{rep.nameBn}</p>
                  </div>
                </div>
                <div className="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-200/60">
                  <p>
                    <span className="text-slate-500 font-medium">📍 Area:</span> {rep.address}
                  </p>
                  <p>
                    <span className="text-slate-500 font-medium">📜 Role:</span> {rep.designation}
                  </p>
                  {rep.contact && (
                    <p>
                      <span className="text-slate-500 font-medium">📞 Contact:</span> {rep.contact}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* REPRESENTATIVE PROFILE VIEWER MODAL (INTEGRATED FOR FUTURE WARISH LINKING) */}
      {/* ========================================================================= */}
      <Dialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
        {selectedMember && (() => {
          const modalPartyTheme = (selectedMember as any)?.partyTheme || getPartyColorConfig(selectedMember.partyCode || selectedMember.partyName);
          return (
            <DialogContent className="sm:max-w-xl p-0 overflow-hidden bg-white rounded-3xl border-slate-200">
              {/* Modal Header with Dynamic Party Gradient */}
              <div
                className="p-6 text-white relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${modalPartyTheme.hex}EE 0%, #0f172a 100%)`,
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border-2 border-white/30 text-white flex items-center justify-center font-extrabold text-2xl shadow-sm">
                      {selectedMember.designation === "Prodhan"
                        ? "👑"
                        : selectedMember.designation === "Upa-Prodhan"
                        ? "🤝"
                        : "👤"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            selectedMember.designation === "Prodhan"
                              ? "bg-amber-400 text-amber-950"
                              : selectedMember.designation === "Upa-Prodhan"
                              ? "bg-sky-300 text-sky-950"
                              : "bg-white/20 text-white"
                          }`}
                        >
                          {selectedMember.designation}
                        </span>
                        <span className="text-[10px] font-bold bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-white border border-white/25 flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${modalPartyTheme.dotClass}`} />
                          {modalPartyTheme.shortLabel} · {modalPartyTheme.colorName}
                        </span>
                        <span className="text-[10px] font-semibold bg-white/15 px-2 py-0.5 rounded-full text-white">
                          PGE-2023
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <DialogTitle className="text-xl font-extrabold tracking-tight text-white">
                          {selectedMember.name}
                        </DialogTitle>
                        <PartyOfficialLogo theme={modalPartyTheme} size="md" className="border-white/40 shadow-xs" />
                        {modalPartyTheme.code === partyTally.winningParty.code && (
                          <span className="bg-amber-400 text-amber-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow-xs">
                            🏆 WINNING PARTY MEMBER
                          </span>
                        )}
                      </div>
                      <DialogDescription className="text-xs text-white/90 font-bengali">
                        {selectedMember.nameBn}
                      </DialogDescription>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5 text-xs">
                {/* Political Affiliation Card (Super Admin Party & Color Scheme) */}
                <div className={`p-4 rounded-2xl border-2 ${modalPartyTheme.cardBorderClass} ${modalPartyTheme.lightBgClass} space-y-2`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PartyOfficialLogo theme={modalPartyTheme} size="md" />
                      <div>
                        <span className="font-bold text-slate-900 text-sm block">Official Political Party & Symbol</span>
                        <span className="text-[10px] text-slate-500 font-bengali">নির্বাচন প্রতীক: {modalPartyTheme.symbolBn} ({modalPartyTheme.symbol})</span>
                      </div>
                    </div>
                    <PartyLogoBadge
                      theme={modalPartyTheme}
                      isWinningParty={modalPartyTheme.code === partyTally.winningParty.code}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-slate-500 font-medium block">Party Affiliation:</span>
                      <span className="font-bold text-slate-900">{modalPartyTheme.fullName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">Assigned Profile Theme:</span>
                      <span className="font-bold text-slate-900 uppercase flex items-center gap-1.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/10 inline-block shadow-2xs"
                          style={{ backgroundColor: modalPartyTheme.hex }}
                        />
                        {modalPartyTheme.colorName} ({modalPartyTheme.hex})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Constituency & Polling Jurisdiction */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <MapPin size={15} className="text-emerald-700" />
                      <span>Constituency & Polling Jurisdiction</span>
                    </span>
                    <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 font-bold">
                      Ward #{selectedMember.wardNumber}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-slate-500 font-medium block">🏛️ Gram Sansad:</span>
                      <span className="font-bold text-slate-900 text-sm">
                        Sansad {selectedMember.sansadNo}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">🗳️ Polling Booth Part(s):</span>
                      <span className="font-bold text-slate-900 text-sm">
                        Part #{selectedMember.partNo}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">🏷️ Caste Category:</span>
                      <span className="font-semibold text-slate-900">{selectedMember.caste}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">📍 Address / Village:</span>
                      <span className="font-semibold text-slate-900">{selectedMember.address}</span>
                    </div>
                  </div>

                  {selectedMember.isDualBooth && (
                    <div className="mt-2 p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-semibold flex items-center gap-2">
                      <span>⚡ Dual-Booth Sansad:</span>
                      <span className="font-normal">
                        This Sansad encompasses two polling stations (Booths #{selectedMember.partNo}) under this single representative.
                      </span>
                    </div>
                  )}
                </div>

                {/* Official Contact Details */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
                    <Phone size={15} className="text-emerald-700" />
                    <span>Official Communication</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div className="flex items-center gap-2 text-slate-800 font-mono">
                      <Phone size={13} className="text-slate-400 shrink-0" />
                      <span>{selectedMember.contact}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-800 font-mono">
                      <Mail size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{selectedMember.email}</span>
                    </div>
                  </div>
                </div>

                {/* Future Warish Application Auto-Linking Banner */}
                <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold">
                    <Sparkles size={14} className="text-indigo-600" />
                    <span>🔗 Warish Application Auto-Linking Integration</span>
                  </div>
                  <p className="text-indigo-800 leading-relaxed text-[11px]">
                    When citizens or Data Entry Operators select <strong>Sansad {selectedMember.sansadNo} (Ward {selectedMember.wardNumber})</strong> during Warish Certificate application entries, the record will automatically link to <strong>{selectedMember.name}</strong>’s jurisdictional profile for review and local verification.
                  </p>
                </div>

                {/* Status PGE-2023 */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-slate-600 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span>🏛️ <strong>Gram Panchayat:</strong> Bagula II, Hanskhali, Nadia</span>
                  </div>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    <span>Registered PGE-2023</span>
                  </span>
                </div>
              </div>
            </DialogContent>
          );
        })()}
      </Dialog>
    </div>
  );
}
