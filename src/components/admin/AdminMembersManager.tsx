import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Edit3,
  Search,
  CheckCircle2,
  ShieldCheck,
  Flag,
  Vote,
  Save,
  X,
  ExternalLink,
  ArrowUpDown,
  Filter,
  Image as ImageIcon,
} from "lucide-react";
import {
  type ElectedMember,
  type MasterParty,
  type MasterBooth,
  useAllElectedMembersAdmin,
  useMasterParties,
  useMasterBooths,
  saveElectedMember,
  updateElectedMemberParty,
  getPartyColorConfig,
  PARTY_THEMES,
  PARTY_OPTIONS,
} from "@/lib/membersMasterData";
import { useAuthz } from "@/lib/permissions";
import { VILLAGES } from "@/lib/masterData";
import { supabase } from "@/integrations/supabase/client";
import { PartyOfficialLogo, PartyLogoBadge } from "@/components/PartyOfficialLogo";

export function AdminMembersManager() {
  const { members, loading: membersLoading, refresh: refreshMembers } = useAllElectedMembersAdmin();
  const { parties, loading: partiesLoading, refresh: refreshParties } = useMasterParties();
  const { booths, loading: boothsLoading } = useMasterBooths();

  const authz = useAuthz();
  const isSuperAdmin = authz.isSuperAdmin || (authz.email && authz.email.toLowerCase().includes("bagula2nogp111"));
  const [quickUpdatingWard, setQuickUpdatingWard] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterParty, setFilterParty] = useState<string>("all");
  const [filterWard, setFilterWard] = useState<string>("all");
  const [activeSubTab, setActiveSubTab] = useState<"members" | "parties" | "booths">("members");

  // Edit Member Modal
  const [editingMember, setEditingMember] = useState<Partial<ElectedMember> | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit Party Modal
  const [partyModalOpen, setPartyModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Partial<MasterParty> | null>(null);

  // Dependent Booths for selected Ward in modal
  const modalWardNumber = editingMember?.ward_number ?? 1;
  const availableBoothsForModal = useMemo(() => {
    return booths.filter((b) => b.ward_number === Number(modalWardNumber));
  }, [booths, modalWardNumber]);

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (filterParty !== "all" && m.party_name !== filterParty && m.party_code !== filterParty) {
        return false;
      }
      if (filterWard !== "all" && m.ward_number !== Number(filterWard)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          (m.name_bn && m.name_bn.toLowerCase().includes(q)) ||
          (m.village && m.village.toLowerCase().includes(q)) ||
          (m.designation && m.designation.toLowerCase().includes(q)) ||
          `ward ${m.ward_number}`.includes(q)
        );
      }
      return true;
    });
  }, [members, filterParty, filterWard, searchQuery]);

  const handleOpenEdit = (member: ElectedMember) => {
    setEditingMember({ ...member });
    setModalOpen(true);
  };

  const handleOpenNew = () => {
    const nextWard = members.length > 0 ? Math.max(...members.map((m) => m.ward_number)) + 1 : 1;
    setEditingMember({
      ward_number: nextWard <= 30 ? nextWard : 1,
      name: "",
      name_bn: "",
      designation: "Ward Member",
      village: VILLAGES[0],
      booth_number: undefined,
      party_id: parties[0]?.id ?? null,
      party_name: parties[0]?.party_name ?? "All India Trinamool Congress",
      party_logo_url: parties[0]?.party_logo_url ?? "",
      phone: "",
      email: "",
      photo_url: "",
      display_order: nextWard,
      is_active: true,
    });
    setModalOpen(true);
  };

  const handleSaveMember = async () => {
    if (!editingMember) return;
    if (!editingMember.name?.trim()) {
      toast.error("Please enter the representative's name");
      return;
    }
    if (!editingMember.ward_number || editingMember.ward_number < 1) {
      toast.error("Valid Ward number is required");
      return;
    }

    setSaving(true);
    try {
      // Resolve selected party details
      let partyName = editingMember.party_name;
      let partyLogo = editingMember.party_logo_url;
      if (editingMember.party_id) {
        const p = parties.find((item) => item.id === editingMember.party_id);
        if (p) {
          partyName = p.party_name;
          partyLogo = p.party_logo_url;
        }
      }

      const res = await saveElectedMember(editingMember.id ?? null, {
        ...editingMember,
        party_name: partyName,
        party_logo_url: partyLogo,
      });

      if (res.success) {
        toast.success(`Elected Member for Ward ${editingMember.ward_number} saved successfully!`);
        setModalOpen(false);
        await refreshMembers();
      } else {
        toast.error(res.error || "Failed to save member");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to save member");
    } finally {
      setSaving(false);
    }
  };

  const handlePartyChange = (partyIdOrCode: string) => {
    const p = parties.find((item) => item.id === partyIdOrCode || item.party_code === partyIdOrCode);
    const theme = getPartyColorConfig(p ? p.party_code : partyIdOrCode);
    setEditingMember((prev) => (prev ? {
      ...prev,
      party_id: p?.id ?? prev.party_id,
      party_code: theme.code,
      party_name: p?.party_name ?? theme.fullName,
      party_logo_url: p?.party_logo_url ?? theme.logoUrl,
      color_code: theme.hex,
    } : null));
  };

  const handleQuickPartyChange = async (member: ElectedMember, newPartyCode: string) => {
    setQuickUpdatingWard(member.ward_number);
    try {
      const res = await updateElectedMemberParty(member.id, member.ward_number, newPartyCode);
      if (res.success) {
        toast.success(
          `Ward #${member.ward_number} (${member.name}) party updated to ${res.theme?.label || newPartyCode}! Profile color set to ${res.theme?.colorName.toUpperCase()}.`
        );
        await refreshMembers();
      } else {
        toast.error(res.error || "Failed to update member party");
      }
    } finally {
      setQuickUpdatingWard(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub tabs: Members vs Parties vs Booths */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border/40">
          <Button
            size="sm"
            variant={activeSubTab === "members" ? "default" : "ghost"}
            onClick={() => setActiveSubTab("members")}
            className="rounded-lg text-xs font-medium"
          >
            <Users size={14} className="mr-1.5" />
            Elected Ward Members (30 Wards)
          </Button>
          <Button
            size="sm"
            variant={activeSubTab === "parties" ? "default" : "ghost"}
            onClick={() => setActiveSubTab("parties")}
            className="rounded-lg text-xs font-medium"
          >
            <Flag size={14} className="mr-1.5" />
            Political Parties & Logos
          </Button>
          <Button
            size="sm"
            variant={activeSubTab === "booths" ? "default" : "ghost"}
            onClick={() => setActiveSubTab("booths")}
            className="rounded-lg text-xs font-medium"
          >
            <Vote size={14} className="mr-1.5" />
            Polling Booths Directory
          </Button>
        </div>

        {activeSubTab === "members" && (
          <Button size="sm" onClick={handleOpenNew} className="text-xs rounded-xl shadow-xs">
            <Plus size={14} className="mr-1" /> Add Elected Member
          </Button>
        )}
      </div>

      {/* =================================================================== */}
      {/* TAB 1: ELECTED MEMBERS LIST                                         */}
      {/* =================================================================== */}
      {activeSubTab === "members" && (
        <div className="space-y-4">
          {/* Super Admin Party & Color Governance Notice */}
          <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-emerald-50 border border-amber-200/90 rounded-2xl p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                  👑
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-amber-950">
                      Super Admin: Member Political Party & Profile Color Control
                    </h4>
                    {isSuperAdmin && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200 text-amber-900 border border-amber-300">
                        SUPER ADMIN ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-amber-900/80 mt-0.5">
                    Authorized Super Admin (<span className="font-mono text-xs font-semibold">bagula2nogp111@gmail.com</span>) can change member political party affiliation. Representative profile cards automatically adopt the designated party color scheme:
                  </p>
                  <div className="flex items-center gap-2 flex-wrap mt-2 text-[11px] font-bold">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-orange-100 text-orange-950 border border-orange-300 shadow-2xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500 ring-1 ring-black/20"></span>
                      BJP = Saffron (#EA580C)
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-2xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-1 ring-black/20"></span>
                      TMC = Green (#16A34A)
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-100 text-blue-950 border border-blue-300 shadow-2xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-1 ring-black/20"></span>
                      CONG. = Blue (#2563EB)
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-100 text-rose-950 border border-rose-300 shadow-2xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600 ring-1 ring-black/20"></span>
                      CPIM = Red (#DC2626)
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-900 border border-slate-300 shadow-2xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-500 ring-1 ring-black/20"></span>
                      IND = Slate (#475569)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/90 backdrop-blur-md p-3.5 rounded-2xl border border-border/50 shadow-xs">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
              <Input
                placeholder="Search by member name, ward, village, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterParty}
                onChange={(e) => setFilterParty(e.target.value)}
                className="h-9 px-3 text-xs bg-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              >
                <option value="all">All Political Parties</option>
                <option value="BJP">🟠 Bharatiya Janata Party (BJP - Saffron)</option>
                <option value="All India Trinamool Congress">🟢 Trinamool Congress (TMC - Green)</option>
                <option value="Indian National Congress">🔵 Indian National Congress (CONG - Blue)</option>
                <option value="Communist Party of India (Marxist)">🔴 CPI(M) (Red)</option>
                <option value="Independent">⚪ Independent (IND - Slate)</option>
              </select>

              <select
                value={filterWard}
                onChange={(e) => setFilterWard(e.target.value)}
                className="h-9 px-3 text-xs bg-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Wards (1-30)</option>
                {Array.from({ length: 30 }, (_, i) => i + 1).map((w) => (
                  <option key={w} value={w}>
                    Ward {w}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Members Table */}
          <div className="rounded-2xl border border-border/50 bg-white/90 backdrop-blur-sm overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/70 text-muted-foreground uppercase font-semibold text-[10px] tracking-wider border-b border-border/60">
                  <tr>
                    <th className="px-4 py-3 text-center">Ward</th>
                    <th className="px-4 py-3">Member Name & Profile</th>
                    <th className="px-4 py-3">Village / Area</th>
                    <th className="px-4 py-3">Assigned Booth</th>
                    <th className="px-4 py-3">Political Party & Color</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {membersLoading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        Loading authoritative elected members...
                      </td>
                    </tr>
                  ) : filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        No members found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((m) => {
                      const theme = m.party_theme || getPartyColorConfig(m.party_code || m.party_name);
                      const isUpdating = quickUpdatingWard === m.ward_number;

                      return (
                        <tr key={m.id} className="hover:bg-primary/5 transition-colors">
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs">
                              {m.ward_number}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              {/* Member Avatar with dynamic party border and ring */}
                              {m.photo_url ? (
                                <img
                                  src={m.photo_url}
                                  alt={m.name}
                                  className={`w-9 h-9 rounded-full object-cover border-2 shadow-xs shrink-0 ${theme.avatarBorderClass}`}
                                />
                              ) : (
                                <div
                                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border-2 shadow-xs shrink-0 ${theme.avatarBgClass} ${theme.avatarTextClass} ${theme.avatarBorderClass}`}
                                >
                                  {m.name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="font-bold text-foreground">{m.name}</p>
                                  <PartyOfficialLogo theme={theme} size="xs" />
                                </div>
                                {m.name_bn && <p className="text-[11px] text-muted-foreground font-bengali">{m.name_bn}</p>}
                                <span
                                  className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5 ${
                                    m.designation === "Prodhan"
                                      ? "bg-amber-100 text-amber-800"
                                      : m.designation === "Upa-Prodhan"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {m.designation}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {m.village || "—"}
                          </td>
                          <td className="px-4 py-3">
                            {m.booth_number ? (
                              <div>
                                <span className="font-semibold text-foreground">Booth #{m.booth_number}</span>
                                {m.booth_name && (
                                  <p className="text-[10px] text-muted-foreground truncate max-w-[200px]" title={m.booth_name}>
                                    {m.booth_name}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic">Unassigned</span>
                            )}
                          </td>
                          {/* Political Party with Live Color Badge & Super Admin Dropdown */}
                          <td className="px-4 py-3">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <PartyLogoBadge theme={theme} />
                                <span className="text-[10px] font-semibold text-muted-foreground">
                                  ({theme.colorName})
                                </span>
                              </div>

                              {/* Super Admin Quick Party Switcher */}
                              <div className="flex items-center gap-1.5">
                                <select
                                  value={theme.code}
                                  disabled={isUpdating}
                                  onChange={(e) => handleQuickPartyChange(m, e.target.value)}
                                  className="h-6 text-[11px] bg-background border border-input rounded-md px-1.5 font-medium cursor-pointer hover:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                  title="Super Admin: Click to change party affiliation and profile color"
                                >
                                  <option value="BJP">🟠 BJP (Saffron)</option>
                                  <option value="AITC">🟢 TMC (Green)</option>
                                  <option value="INC">🔵 CONG. (Blue)</option>
                                  <option value="CPIM">🔴 CPIM (Red)</option>
                                  <option value="IND">⚪ IND (Slate)</option>
                                </select>
                                {isUpdating && (
                                  <span className="text-[10px] text-amber-600 font-semibold animate-pulse">Saving…</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {m.is_active ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                Active
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenEdit(m)}
                              className="h-7 px-2.5 text-[11px] rounded-lg"
                            >
                              <Edit3 size={12} className="mr-1" /> Edit
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: POLITICAL PARTIES DIRECTORY                                  */}
      {/* =================================================================== */}
      {activeSubTab === "parties" && (
        <div className="space-y-4">
          <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-border/50 shadow-xs">
            <h3 className="text-sm font-bold text-foreground">Authoritative Political Parties & Registered Symbols</h3>
            <p className="text-xs text-muted-foreground">
              Parties and official logos are centrally linked to elected members so party assets are never duplicated across individuals.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {parties.map((p) => (
              <div key={p.id} className="rounded-2xl border border-border/50 bg-white p-4 space-y-3 shadow-xs">
                <div className="flex items-center gap-3">
                  {p.party_logo_url ? (
                    <img
                      src={p.party_logo_url}
                      alt={p.party_name}
                      className="w-12 h-12 object-contain rounded-xl border p-1 bg-white"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-lg">
                      🚩
                    </div>
                  )}
                  <div>
                    <span className="font-bold text-sm text-foreground">{p.party_code}</span>
                    <p className="text-xs text-muted-foreground">{p.party_name}</p>
                    {p.party_name_bn && <p className="text-[11px] text-muted-foreground font-bengali">{p.party_name_bn}</p>}
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground space-y-1 border-t pt-2">
                  <p>Symbol: <span className="font-medium text-foreground">{p.symbol_name || "Registered Flag"}</span></p>
                  <p>Color: <span className="font-mono text-xs">{p.color_code || "#15803d"}</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: POLLING BOOTHS DIRECTORY                                     */}
      {/* =================================================================== */}
      {activeSubTab === "booths" && (
        <div className="space-y-4">
          <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-border/50 shadow-xs">
            <h3 className="text-sm font-bold text-foreground">Polling Booths of Bagula II Gram Panchayat</h3>
            <p className="text-xs text-muted-foreground">
              Booths are strictly partitioned by Ward (District → Block → GP → Ward → Booth). A member can only be associated with booths in their designated ward.
            </p>
          </div>

          <div className="rounded-2xl border border-border/50 bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto max-h-[480px]">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/70 text-muted-foreground uppercase font-semibold text-[10px] tracking-wider sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-center">Booth #</th>
                    <th className="px-4 py-3 text-center">Ward #</th>
                    <th className="px-4 py-3">Booth Name & Location</th>
                    <th className="px-4 py-3">Village</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {booths.map((b) => (
                    <tr key={b.id} className="hover:bg-primary/5">
                      <td className="px-4 py-2.5 font-bold text-center text-primary">{b.booth_number}</td>
                      <td className="px-4 py-2.5 text-center font-semibold">Ward {b.ward_number}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-foreground">{b.booth_name}</p>
                        {b.booth_name_bn && <p className="text-[11px] text-muted-foreground font-bengali">{b.booth_name_bn}</p>}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{b.village_name || "—"}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: ADD / EDIT MEMBER                                            */}
      {/* =================================================================== */}
      {modalOpen && editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-border max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {editingMember.id ? `Edit Member — Ward ${editingMember.ward_number}` : "Add Elected Representative"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  District: Nadia · Block: Hanskhali · GP: Bagula II
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setModalOpen(false)}>
                <X size={16} />
              </Button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <Label htmlFor="mem-ward" className="text-xs font-semibold">
                  Ward Number (1-30) *
                </Label>
                <select
                  id="mem-ward"
                  value={editingMember.ward_number ?? 1}
                  onChange={(e) => {
                    const wn = Number(e.target.value);
                    setEditingMember({
                      ...editingMember,
                      ward_number: wn,
                      // Clear booth if not valid for new ward
                      booth_number: undefined,
                      booth_id: null,
                    });
                  }}
                  className="w-full h-9 px-3 text-xs bg-background border border-input rounded-xl font-bold text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {Array.from({ length: 30 }, (_, i) => i + 1).map((w) => (
                    <option key={w} value={w}>
                      Ward #{w}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="mem-role" className="text-xs font-semibold">
                  Designation / Role *
                </Label>
                <select
                  id="mem-role"
                  value={editingMember.designation ?? "Ward Member"}
                  onChange={(e) => setEditingMember({ ...editingMember, designation: e.target.value })}
                  className="w-full h-9 px-3 text-xs bg-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Ward Member">Ward Member</option>
                  <option value="Prodhan">Prodhan (Pradhan)</option>
                  <option value="Upa-Prodhan">Upa-Prodhan (Upa-Pradhan)</option>
                  <option value="Karmadhyaksha">Karmadhyaksha</option>
                  <option value="Sansad Sadasya">Sansad Sadasya</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="mem-name" className="text-xs font-semibold">
                  Full Name (English) *
                </Label>
                <Input
                  id="mem-name"
                  placeholder="e.g. SUSMITA BISWAS BARMAN"
                  value={editingMember.name ?? ""}
                  onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value.toUpperCase() })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="mem-name-bn" className="text-xs font-semibold">
                  Full Name (বাংলা)
                </Label>
                <Input
                  id="mem-name-bn"
                  placeholder="বাংলায় নাম"
                  value={editingMember.name_bn ?? ""}
                  onChange={(e) => setEditingMember({ ...editingMember, name_bn: e.target.value })}
                  className="h-9 text-xs font-bengali"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="mem-village" className="text-xs font-semibold">
                  Village / Jurisdiction
                </Label>
                <select
                  id="mem-village"
                  value={editingMember.village ?? VILLAGES[0]}
                  onChange={(e) => setEditingMember({ ...editingMember, village: e.target.value })}
                  className="w-full h-9 px-3 text-xs bg-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {VILLAGES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              {/* DEPENDENT DROPDOWN: Ward -> Booth */}
              <div className="space-y-1">
                <Label htmlFor="mem-booth" className="text-xs font-semibold flex items-center justify-between">
                  <span>Assigned Polling Booth</span>
                  <span className="text-[10px] text-primary">Filtered to Ward {modalWardNumber}</span>
                </Label>
                <select
                  id="mem-booth"
                  value={editingMember.booth_number ?? ""}
                  onChange={(e) => {
                    const bn = e.target.value ? Number(e.target.value) : undefined;
                    const matched = availableBoothsForModal.find((b) => b.booth_number === bn);
                    setEditingMember({
                      ...editingMember,
                      booth_number: bn,
                      booth_id: matched?.id ?? null,
                    });
                  }}
                  className="w-full h-9 px-3 text-xs bg-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">-- Select Valid Booth for Ward {modalWardNumber} --</option>
                  {availableBoothsForModal.map((b) => (
                    <option key={b.id} value={b.booth_number}>
                      Booth #{b.booth_number} — {b.booth_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Super Admin Party selection with visual color options & live preview */}
              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground">
                    Political Party Affiliation & Profile Color Scheme *
                  </Label>
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    👑 Super Admin Governed
                  </span>
                </div>

                {/* 5 Quick Select Party Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {PARTY_OPTIONS.map((opt) => {
                    const currentCode = editingMember.party_code || (editingMember.party_name?.includes("Bharatiya") ? "BJP" : editingMember.party_name?.includes("Trinamool") ? "AITC" : editingMember.party_name?.includes("Congress") ? "INC" : editingMember.party_name?.includes("Marxist") ? "CPIM" : "IND");
                    const isSelected = currentCode === opt.code;

                    return (
                      <button
                        key={opt.code}
                        type="button"
                        onClick={() => handlePartyChange(opt.code)}
                        className={`p-2.5 rounded-xl border-2 text-left transition flex flex-col justify-between gap-1.5 cursor-pointer ${
                          isSelected
                            ? `${opt.theme.cardBorderClass} ${opt.theme.badgeClass} ring-2 ring-primary/20 shadow-xs scale-[1.02]`
                            : "border-border/60 hover:border-border bg-card/60"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className={`w-3 h-3 rounded-full ${opt.theme.dotClass} shrink-0 ring-1 ring-black/20`} />
                          <span className="text-[10px] font-extrabold uppercase">{opt.code}</span>
                        </div>
                        <div>
                          <p className="font-bold text-xs leading-tight text-foreground">{opt.shortLabel}</p>
                          <p className="text-[10px] font-semibold opacity-90">{opt.colorName}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Dropdown fallback & Party Symbol */}
                <div className="flex items-center gap-2 pt-1">
                  <select
                    id="mem-party"
                    value={editingMember.party_id ?? ""}
                    onChange={(e) => handlePartyChange(e.target.value)}
                    className="flex-1 h-9 px-3 text-xs bg-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  >
                    {parties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.party_code} — {p.party_name}
                      </option>
                    ))}
                  </select>
                  {editingMember.party_logo_url && (
                    <img
                      src={editingMember.party_logo_url}
                      alt="Party Symbol"
                      className="w-9 h-9 object-contain rounded-lg border p-1 bg-white shrink-0 shadow-2xs"
                    />
                  )}
                </div>

                {/* Live Profile Card Preview in selected party color */}
                {(() => {
                  const previewTheme = getPartyColorConfig(editingMember.party_code || editingMember.party_name || "AITC");
                  return (
                    <div className={`p-3 rounded-xl border-2 ${previewTheme.cardBorderClass} ${previewTheme.badgeClass} transition-all flex items-center justify-between gap-3 shadow-xs`}>
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm border-2 shadow-xs ${previewTheme.avatarBorderClass} ${previewTheme.avatarBgClass} ${previewTheme.avatarTextClass}`}
                        >
                          {editingMember.photo_url ? (
                            <img src={editingMember.photo_url} alt="" className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            editingMember.name?.charAt(0) || "M"
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${previewTheme.dotClass}`} />
                            <span className="font-bold text-xs text-foreground">
                              {editingMember.name || "Member Name Preview"}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/5 font-semibold">
                              Ward #{editingMember.ward_number ?? 1}
                            </span>
                          </div>
                          <p className="text-[11px] opacity-90 mt-0.5">
                            {previewTheme.fullName} ({previewTheme.shortLabel})
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md bg-white/90 border border-black/10 shadow-2xs">
                          <span className={`w-2 h-2 rounded-full ${previewTheme.dotClass}`} />
                          Profile Color: {previewTheme.colorName.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="mem-photo" className="text-xs font-semibold">
                  Member Photo URL (Optional)
                </Label>
                <Input
                  id="mem-photo"
                  placeholder="https://... photo url"
                  value={editingMember.photo_url ?? ""}
                  onChange={(e) => setEditingMember({ ...editingMember, photo_url: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="mem-phone" className="text-xs font-semibold">
                  Contact Mobile Number
                </Label>
                <Input
                  id="mem-phone"
                  placeholder="10-digit mobile"
                  value={editingMember.phone ?? ""}
                  onChange={(e) => setEditingMember({ ...editingMember, phone: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="mem-order" className="text-xs font-semibold">
                  Display Order
                </Label>
                <Input
                  id="mem-order"
                  type="number"
                  value={editingMember.display_order ?? editingMember.ward_number ?? 1}
                  onChange={(e) => setEditingMember({ ...editingMember, display_order: Number(e.target.value) })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t">
              <div className="flex items-center gap-2">
                <Switch
                  checked={editingMember.is_active ?? true}
                  onCheckedChange={(checked) => setEditingMember({ ...editingMember, is_active: checked })}
                  id="mem-status"
                />
                <Label htmlFor="mem-status" className="text-xs font-medium cursor-pointer">
                  {editingMember.is_active ? "Member is Active" : "Member is Inactive"}
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setModalOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveMember} disabled={saving} className="text-xs">
                  <Save size={13} className="mr-1.5" />
                  {saving ? "Saving…" : "Save Member"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
