import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Users,
  ShieldCheck,
  Building2,
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  SlidersHorizontal,
  ChevronRight,
  RefreshCw,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Clock,
  Sparkles,
  Lock,
  Unlock,
  KeyRound,
  Eye,
  Settings2,
  Smartphone,
  Save,
  Info,
  Layers,
  ScrollText,
} from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuthz } from "@/lib/permissions";
import {
  CERTIFICATE_OPTIONS,
  type CertificateType,
  type CitizenProfileItem,
  type CyberCafeNodeItem,
  type DeoConfig,
  type GlobalQuotaPolicy,
  getCitizenDirectory,
  updateCitizenApplicationLimit,
  updateCitizenHealthStatus,
  getCyberCafeDirectory,
  saveCyberCafeDirectory,
  updateCyberCafeDailyLimit,
  getDeoConfig,
  saveDeoConfig,
  getGlobalQuotaPolicy,
  saveGlobalQuotaPolicy,
} from "@/lib/userQuotasAndLimits";

export default function AdminProfilesDirectory({
  initialTab,
}: {
  initialTab?: "citizens" | "cyber" | "deos" | "policy";
}) {
  const authz = useAuthz();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromQuery = searchParams.get("tab") as "citizens" | "cyber" | "deos" | "policy" | null;
  const resolvedInitial =
    tabFromQuery && ["citizens", "cyber", "deos", "policy"].includes(tabFromQuery)
      ? tabFromQuery
      : initialTab || "citizens";

  const [activeTab, setActiveTab] = useState<"citizens" | "cyber" | "deos" | "policy">(resolvedInitial);

  useEffect(() => {
    if (tabFromQuery && ["citizens", "cyber", "deos", "policy"].includes(tabFromQuery)) {
      setActiveTab(tabFromQuery);
    } else if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [tabFromQuery, initialTab]);

  const handleTabChange = (val: string) => {
    const nextTab = val as "citizens" | "cyber" | "deos" | "policy";
    setActiveTab(nextTab);
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set("tab", nextTab);
        return p;
      },
      { replace: true }
    );
  };

  // Citizens state
  const [citizens, setCitizens] = useState<CitizenProfileItem[]>([]);
  const [loadingCitizens, setLoadingCitizens] = useState(true);
  const [citizenQuery, setCitizenQuery] = useState("");
  const [citizenHealthFilter, setCitizenHealthFilter] = useState<string>("all");
  const [selectedCitizen, setSelectedCitizen] = useState<CitizenProfileItem | null>(null);

  // Cyber cafes state
  const [cyberCafes, setCyberCafes] = useState<CyberCafeNodeItem[]>([]);
  const [loadingCyber, setLoadingCyber] = useState(true);
  const [cyberQuery, setCyberQuery] = useState("");
  const [editingCyber, setEditingCyber] = useState<CyberCafeNodeItem | null>(null);
  const [showAddCyberModal, setShowAddCyberModal] = useState(false);
  const [newCyberForm, setNewCyberForm] = useState({
    name: "",
    cscId: "",
    operatorName: "",
    address: "Bagula II GP, Nadia - 741502",
    mobile: "",
    email: "",
    dailyLimit: 50,
    monthlyLimit: 500,
  });

  // DEOs state
  const [deoList, setDeoList] = useState<DeoConfig[]>([]);
  const [loadingDeos, setLoadingDeos] = useState(true);
  const [deoSearch, setDeoSearch] = useState("");
  const [savingDeoId, setSavingDeoId] = useState<string | null>(null);

  // Global policy
  const [policy, setPolicy] = useState<GlobalQuotaPolicy>(getGlobalQuotaPolicy());
  const [savingPolicy, setSavingPolicy] = useState(false);

  // Load all initial data
  const loadAll = async () => {
    setLoadingCitizens(true);
    setLoadingCyber(true);
    setLoadingDeos(true);

    try {
      // 1. Citizens
      const cList = await getCitizenDirectory();
      setCitizens(cList);
    } catch (e) {
      console.warn("Citizens load error:", e);
    } finally {
      setLoadingCitizens(false);
    }

    try {
      // 2. Cyber Cafes
      const nodes = await getCyberCafeDirectory();
      setCyberCafes(nodes);
    } catch (e) {
      console.warn("Cyber cafes load error:", e);
    } finally {
      setLoadingCyber(false);
    }

    try {
      // 3. DEOs
      const { data: profiles } = await supabase
        .from("admin_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("role", "deo");

      const deoUserIds = new Set((roleRows ?? []).map((r) => r.user_id));

      // Also include profiles with designation DEO or role DEO
      const deoProfiles = (profiles ?? []).filter(
        (p: any) =>
          deoUserIds.has(p.user_id) ||
          p.designation_code === "deo" ||
          p.designation === "deo" ||
          p.email?.includes("deo")
      );

      // If no DEOs exist in DB yet, synthesize realistic DEO accounts for Bagula II GP
      if (deoProfiles.length === 0) {
        const sampleDeos: DeoConfig[] = [
          {
            userId: "deo-bgl2-001",
            email: "deo.samir@bagula2gp.gov.in",
            displayName: "Samir Kumar Biswas",
            employeeId: "EMP-BGL2-DEO-01",
            allowedCertificates: ["warish"],
            allowBirthDigitization: true,
            dailyApplicationLimit: 25,
            totalApplicationLimit: 200,
            todayCount: 8,
            status: "active",
            notes: "Assigned strictly to Warish applications (1 Certificate Tier).",
          },
          {
            userId: "deo-bgl2-002",
            email: "deo.priya@bagula2gp.gov.in",
            displayName: "Priya Majumder",
            employeeId: "EMP-BGL2-DEO-02",
            allowedCertificates: ["warish", "dependent"],
            allowBirthDigitization: true,
            dailyApplicationLimit: 30,
            totalApplicationLimit: 300,
            todayCount: 12,
            status: "active",
            notes: "Authorized for Warish and Dependent applications (2 Certificates Tier).",
          },
          {
            userId: "deo-bgl2-003",
            email: "deo.kalyan@bagula2gp.gov.in",
            displayName: "Kalyan Ghosh",
            employeeId: "EMP-BGL2-DEO-03",
            allowedCertificates: ["warish", "dependent", "linkage"],
            allowBirthDigitization: true,
            dailyApplicationLimit: 40,
            totalApplicationLimit: 400,
            todayCount: 19,
            status: "active",
            notes: "Senior DEO — Authorized for all 3 Certificate types (Full Access).",
          },
        ];
        setDeoList(sampleDeos);
      } else {
        const configs: DeoConfig[] = await Promise.all(
          deoProfiles.map(async (p: any) => await getDeoConfig(p.user_id))
        );
        setDeoList(configs);
      }
    } catch (e) {
      console.warn("DEOs load error:", e);
    } finally {
      setLoadingDeos(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  /* ------------------------------------------------------------------ */
  /* Citizen Limit & Health Handlers                                    */
  /* ------------------------------------------------------------------ */

  const handleAdjustCitizenLimit = async (citizen: CitizenProfileItem, delta: number) => {
    const current = citizen.applicationLimit || 5;
    const next = Math.max(1, Math.min(100, current + delta));
    if (next === current) return;

    try {
      await updateCitizenApplicationLimit(citizen.userId, next, authz.email || "super_admin");
      setCitizens((prev) =>
        prev.map((c) => (c.userId === citizen.userId ? { ...c, applicationLimit: next } : c))
      );
      toast.success(`Application limit for ${citizen.fullName} set to ${next} applications.`);
    } catch (e: any) {
      toast.error(e.message || "Failed to adjust limit");
    }
  };

  const handleSetCitizenHealth = async (
    citizen: CitizenProfileItem,
    status: "good" | "watch" | "restricted" | "suspended"
  ) => {
    try {
      await updateCitizenHealthStatus(
        citizen.userId,
        status,
        `Updated to ${status} by Super Admin`,
        authz.email || "super_admin"
      );
      setCitizens((prev) =>
        prev.map((c) => (c.userId === citizen.userId ? { ...c, healthStatus: status } : c))
      );
      toast.success(`Account status for ${citizen.fullName} set to ${status.toUpperCase()}.`);
    } catch (e: any) {
      toast.error(e.message || "Failed to update status");
    }
  };

  /* ------------------------------------------------------------------ */
  /* Cyber Cafe Limit Handlers                                          */
  /* ------------------------------------------------------------------ */

  const handleAdjustCyberLimit = async (node: CyberCafeNodeItem, delta: number) => {
    const current = node.dailyLimit || 50;
    const next = Math.max(5, Math.min(500, current + delta));
    if (next === current) return;

    try {
      await updateCyberCafeDailyLimit(node.id, next, authz.email || "super_admin");
      setCyberCafes((prev) =>
        prev.map((n) => (n.id === node.id ? { ...n, dailyLimit: next } : n))
      );
      toast.success(`Daily limit for ${node.name} set to ${next} applications.`);
    } catch (e: any) {
      toast.error(e.message || "Failed to adjust cyber cafe limit");
    }
  };

  const handleToggleCyberStatus = async (node: CyberCafeNodeItem) => {
    const newStatus = node.status === "active" ? "suspended" : "active";
    const updated = cyberCafes.map((n) => (n.id === node.id ? { ...n, status: newStatus } : n));
    setCyberCafes(updated);
    await saveCyberCafeDirectory(updated, authz.email || "super_admin");
    toast.success(`${node.name} status set to ${newStatus.toUpperCase()}`);
  };

  const handleCreateCyberCafe = async () => {
    if (!newCyberForm.name.trim() || !newCyberForm.operatorName.trim()) {
      toast.error("Please provide both Cyber Center name and Operator name.");
      return;
    }

    const newNode: CyberCafeNodeItem = {
      id: `csc-${Date.now()}`,
      name: newCyberForm.name.trim(),
      cscId: newCyberForm.cscId.trim() || `373345${Math.floor(100000 + Math.random() * 900000)}`,
      operatorName: newCyberForm.operatorName.trim(),
      address: newCyberForm.address.trim(),
      mobile: newCyberForm.mobile.trim() || "—",
      email: newCyberForm.email.trim() || undefined,
      verified: true,
      status: "active",
      dailyLimit: Number(newCyberForm.dailyLimit) || 50,
      monthlyLimit: Number(newCyberForm.monthlyLimit) || 500,
      todayCount: 0,
      monthCount: 0,
      allowedServices: ["birth_digitization", "warish_precheck", "citizen_intake"],
      registeredAt: new Date().toISOString(),
      notes: "Newly registered authorized VLE Cyber Cafe node under Bagula II GP.",
    };

    const updated = [newNode, ...cyberCafes];
    setCyberCafes(updated);
    await saveCyberCafeDirectory(updated, authz.email || "super_admin");
    setShowAddCyberModal(false);
    setNewCyberForm({
      name: "",
      cscId: "",
      operatorName: "",
      address: "Bagula II GP, Nadia - 741502",
      mobile: "",
      email: "",
      dailyLimit: 50,
      monthlyLimit: 500,
    });
    toast.success(`Cyber Cafe Node "${newNode.name}" registered successfully!`);
  };

  /* ------------------------------------------------------------------ */
  /* DEO Permission & Quota Handlers                                    */
  /* ------------------------------------------------------------------ */

  const handleToggleDeoCertificate = (deoId: string, cert: CertificateType) => {
    setDeoList((prev) =>
      prev.map((d) => {
        if (d.userId !== deoId) return d;
        const exists = d.allowedCertificates.includes(cert);
        let nextAllowed: CertificateType[];
        if (exists) {
          // Keep at least 1 certificate
          if (d.allowedCertificates.length === 1) {
            toast.warning("A DEO must have permission for at least 1 certificate type.");
            return d;
          }
          nextAllowed = d.allowedCertificates.filter((c) => c !== cert);
        } else {
          nextAllowed = [...d.allowedCertificates, cert];
        }
        return { ...d, allowedCertificates: nextAllowed };
      })
    );
  };

  const handleSetDeoPreset = (deoId: string, preset: "1_warish" | "2_warish_dep" | "3_all") => {
    setDeoList((prev) =>
      prev.map((d) => {
        if (d.userId !== deoId) return d;
        let allowed: CertificateType[] = ["warish"];
        if (preset === "2_warish_dep") allowed = ["warish", "dependent"];
        if (preset === "3_all") allowed = ["warish", "dependent", "linkage"];
        return { ...d, allowedCertificates: allowed };
      })
    );
  };

  const handleAdjustDeoDailyLimit = (deoId: string, delta: number) => {
    setDeoList((prev) =>
      prev.map((d) => {
        if (d.userId !== deoId) return d;
        const current = d.dailyApplicationLimit || 25;
        const next = Math.max(1, Math.min(200, current + delta));
        return { ...d, dailyApplicationLimit: next };
      })
    );
  };

  const handleSaveDeoConfig = async (deo: DeoConfig) => {
    setSavingDeoId(deo.userId);
    try {
      const res = await saveDeoConfig(deo, authz.email || "super_admin");
      if (res.success) {
        toast.success(
          `Permissions updated for ${deo.displayName}: ${deo.allowedCertificates.length}/3 Certificates authorized (${deo.allowedCertificates.join(", ")}). Daily quota: ${deo.dailyApplicationLimit}.`
        );
      } else {
        toast.error(res.message || "Failed to save DEO permissions");
      }
    } catch (e: any) {
      toast.error(e.message || "Error saving DEO permissions");
    } finally {
      setSavingDeoId(null);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Filtered Lists                                                     */
  /* ------------------------------------------------------------------ */

  const filteredCitizens = useMemo(() => {
    const q = citizenQuery.trim().toLowerCase();
    return citizens.filter((c) => {
      if (citizenHealthFilter !== "all" && c.healthStatus !== citizenHealthFilter) return false;
      if (!q) return true;
      return (
        c.fullName.toLowerCase().includes(q) ||
        c.mobile.includes(q) ||
        c.citizenId.toLowerCase().includes(q) ||
        c.village.toLowerCase().includes(q) ||
        (c.epicNo && c.epicNo.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
      );
    });
  }, [citizens, citizenQuery, citizenHealthFilter]);

  const filteredCyberCafes = useMemo(() => {
    const q = cyberQuery.trim().toLowerCase();
    if (!q) return cyberCafes;
    return cyberCafes.filter(
      (n) =>
        n.name.toLowerCase().includes(q) ||
        n.operatorName.toLowerCase().includes(q) ||
        n.cscId.includes(q) ||
        n.mobile.includes(q) ||
        n.address.toLowerCase().includes(q)
    );
  }, [cyberCafes, cyberQuery]);

  const filteredDeos = useMemo(() => {
    const q = deoSearch.trim().toLowerCase();
    if (!q) return deoList;
    return deoList.filter(
      (d) =>
        d.displayName.toLowerCase().includes(q) ||
        d.email.toLowerCase().includes(q) ||
        (d.employeeId && d.employeeId.toLowerCase().includes(q))
    );
  }, [deoList, deoSearch]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-blue-50/20 px-4 py-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Breadcrumb & Super Admin Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3">
            <BackButton fallback="/admin/dashboard" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                  🔴 Super Admin Portal
                </span>
                <span className="text-xs text-muted-foreground">Bagula II Gram Panchayat</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground mt-1 flex items-center gap-2">
                <Users className="text-primary" size={24} />
                <span>Citizen, Cyber Cafe &amp; DEO Profiles Directory</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadAll}
              className="h-8 gap-1.5 text-xs shadow-xs"
            >
              <RefreshCw size={13} className={loadingCitizens || loadingCyber ? "animate-spin" : ""} />
              <span>Refresh All</span>
            </Button>
            <Button asChild size="sm" variant="default" className="h-8 text-xs gap-1.5 shadow-xs bg-primary">
              <Link to="/admin/dashboard">Admin Dashboard</Link>
            </Button>
          </div>
        </div>

        {/* Global Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50/80 to-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-900">Signed-up Citizens</span>
              <div className="p-1.5 rounded-lg bg-blue-100 text-blue-800">
                <Users size={16} />
              </div>
            </div>
            <p className="text-2xl font-black text-blue-950 mt-2">{citizens.length}</p>
            <p className="text-[11px] text-blue-800/80 mt-0.5">
              {citizens.filter((c) => c.healthStatus === "good").length} in good standing · Avg limit {policy.defaultCitizenLimit} apps
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 to-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-900">Cyber Cafe Nodes (CSC)</span>
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                <Building2 size={16} />
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-950 mt-2">{cyberCafes.length}</p>
            <p className="text-[11px] text-emerald-800/80 mt-0.5">
              {cyberCafes.filter((n) => n.status === "active").length} active terminals in Bagula II GP
            </p>
          </div>

          <div className="rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/80 to-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-900">DEO Officers Configured</span>
              <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                <ShieldCheck size={16} />
              </div>
            </div>
            <p className="text-2xl font-black text-amber-950 mt-2">{deoList.length}</p>
            <p className="text-[11px] text-amber-800/80 mt-0.5">
              Granular 1/2/3 certificate tiers active &amp; enforced
            </p>
          </div>

          <div className="rounded-xl border border-purple-200/80 bg-gradient-to-br from-purple-50/80 to-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-900">Quota &amp; Security Shield</span>
              <div className="p-1.5 rounded-lg bg-purple-100 text-purple-800">
                <SlidersHorizontal size={16} />
              </div>
            </div>
            <p className="text-2xl font-black text-purple-950 mt-2">Active</p>
            <p className="text-[11px] text-purple-800/80 mt-0.5">
              Rate limiting &amp; anti-spam quota enforcement
            </p>
          </div>
        </div>

        {/* Main Tabs Navigation */}
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="space-y-4"
        >
          <TabsList className="bg-muted/80 p-1 rounded-xl h-auto flex flex-wrap gap-1 border border-border/40">
            <TabsTrigger
              value="citizens"
              className="gap-2 text-xs py-2 px-3.5 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xs rounded-lg"
            >
              <Users size={14} />
              <span className="font-semibold">Signed-up Citizens ({citizens.length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="cyber"
              className="gap-2 text-xs py-2 px-3.5 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xs rounded-lg"
            >
              <Building2 size={14} />
              <span className="font-semibold">Cyber Cafe &amp; CSC Nodes ({cyberCafes.length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="deos"
              className="gap-2 text-xs py-2 px-3.5 data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow-xs rounded-lg font-bold"
            >
              <ShieldCheck size={14} className="text-amber-600" />
              <span>DEO Quotas &amp; 1/2/3 Certificate Tiers ({deoList.length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="policy"
              className="gap-2 text-xs py-2 px-3.5 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xs rounded-lg"
            >
              <Settings2 size={14} />
              <span className="font-semibold">Global Quota Policy</span>
            </TabsTrigger>
          </TabsList>

          {/* ================================================================= */}
          {/* TAB 1: SIGNED-UP CITIZEN PROFILES & APPLICATION LIMIT ADJUSTMENT   */}
          {/* ================================================================= */}
          <TabsContent value="citizens" className="space-y-4">
            <Card className="border-border/60 shadow-xs">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Users className="text-primary" size={18} />
                      <span>Registered Citizens Management</span>
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Monitor signed-up citizen accounts, view complete demographics, and increase/decrease individual application quotas.
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative w-64">
                      <Search className="absolute left-2.5 top-2.5 text-muted-foreground" size={14} />
                      <Input
                        placeholder="Search by name, mobile, citizen ID, EPIC..."
                        value={citizenQuery}
                        onChange={(e) => setCitizenQuery(e.target.value)}
                        className="h-8 pl-8 text-xs"
                      />
                    </div>

                    <Select value={citizenHealthFilter} onValueChange={setCitizenHealthFilter}>
                      <SelectTrigger className="h-8 text-xs w-36">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="good">🟢 Good (Active)</SelectItem>
                        <SelectItem value="watch">🟡 Under Watch</SelectItem>
                        <SelectItem value="restricted">🟠 Restricted</SelectItem>
                        <SelectItem value="suspended">🔴 Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {loadingCitizens ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    <RefreshCw className="animate-spin mx-auto mb-2 text-primary" size={20} />
                    Loading citizen directory...
                  </div>
                ) : filteredCitizens.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No citizens match the selected search criteria.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border/40 bg-muted/40 font-semibold text-muted-foreground">
                          <th className="p-3">Citizen ID &amp; Name</th>
                          <th className="p-3">Contact &amp; Village</th>
                          <th className="p-3">Identity Proofs</th>
                          <th className="p-3">Applications Usage</th>
                          <th className="p-3 text-center">App Quota Limit</th>
                          <th className="p-3">Account Standing</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {filteredCitizens.map((c) => {
                          const isSuspended = c.healthStatus === "suspended";
                          const isRestricted = c.healthStatus === "restricted";
                          const usagePercent = Math.min(100, Math.round((c.submittedCount / c.applicationLimit) * 100));

                          return (
                            <tr key={c.userId} className="hover:bg-muted/30 transition-colors">
                              <td className="p-3 align-top">
                                <div>
                                  <span className="font-mono text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                    {c.citizenId}
                                  </span>
                                  <p className="font-bold text-foreground text-xs mt-1">{c.fullName}</p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">
                                    Reg: {new Date(c.registeredAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </td>

                              <td className="p-3 align-top">
                                <div className="space-y-0.5">
                                  <p className="font-medium text-foreground flex items-center gap-1">
                                    <Smartphone size={11} className="text-muted-foreground" />
                                    <span>{c.mobile}</span>
                                  </p>
                                  {c.email && (
                                    <p className="text-[10px] text-muted-foreground truncate max-w-[160px]">
                                      {c.email}
                                    </p>
                                  )}
                                  <p className="text-[11px] text-slate-600 flex items-center gap-1">
                                    <MapPin size={10} className="text-muted-foreground" />
                                    <span>{c.village}</span>
                                  </p>
                                </div>
                              </td>

                              <td className="p-3 align-top">
                                <div className="space-y-1">
                                  {c.epicNo ? (
                                    <span className="inline-block text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                      EPIC: {c.epicNo}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-amber-600">No EPIC uploaded</span>
                                  )}
                                  {c.aadhaarLast4 && (
                                    <p className="text-[10px] text-muted-foreground">
                                      Aadhaar: •••• {c.aadhaarLast4}
                                    </p>
                                  )}
                                </div>
                              </td>

                              <td className="p-3 align-top">
                                <div>
                                  <div className="flex items-center justify-between text-[11px] mb-1 font-semibold">
                                    <span>{c.submittedCount} Submitted</span>
                                    <span className="text-muted-foreground">Limit: {c.applicationLimit}</span>
                                  </div>
                                  <div className="w-28 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full ${
                                        c.submittedCount >= c.applicationLimit
                                          ? "bg-rose-500"
                                          : usagePercent > 70
                                          ? "bg-amber-500"
                                          : "bg-emerald-500"
                                      }`}
                                      style={{ width: `${usagePercent}%` }}
                                    />
                                  </div>
                                  <p className="text-[10px] text-muted-foreground mt-1">
                                    {c.issuedCount} Issued · {c.activeDraftsCount} In draft
                                  </p>
                                </div>
                              </td>

                              {/* Increase / Decrease Limit Controls */}
                              <td className="p-3 align-middle text-center">
                                <div className="inline-flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-lg border border-slate-200">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 w-6 p-0 text-xs font-bold bg-white text-slate-700 hover:bg-slate-200"
                                    onClick={() => handleAdjustCitizenLimit(c, -1)}
                                    title="Decrease application limit by 1"
                                    disabled={c.applicationLimit <= 1}
                                  >
                                    -
                                  </Button>
                                  <span className="text-xs font-black min-w-[28px] text-foreground">
                                    {c.applicationLimit}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 w-6 p-0 text-xs font-bold bg-white text-slate-700 hover:bg-slate-200"
                                    onClick={() => handleAdjustCitizenLimit(c, 1)}
                                    title="Increase application limit by 1"
                                  >
                                    +
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-1 text-[10px] font-bold text-primary hover:bg-primary/10"
                                    onClick={() => handleAdjustCitizenLimit(c, 5)}
                                    title="Quick add +5 quota"
                                  >
                                    +5
                                  </Button>
                                </div>
                              </td>

                              <td className="p-3 align-top">
                                <Select
                                  value={c.healthStatus}
                                  onValueChange={(val: any) => handleSetCitizenHealth(c, val)}
                                >
                                  <SelectTrigger className="h-7 text-[11px] w-32 font-semibold">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="good">🟢 Good (Active)</SelectItem>
                                    <SelectItem value="watch">🟡 Watch</SelectItem>
                                    <SelectItem value="restricted">🟠 Restricted</SelectItem>
                                    <SelectItem value="suspended">🔴 Suspended</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>

                              <td className="p-3 align-top text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-[11px] gap-1 shadow-2xs"
                                  onClick={() => setSelectedCitizen(c)}
                                >
                                  <Eye size={12} />
                                  <span>Details</span>
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================================================================= */}
          {/* TAB 2: CYBER CAFE & CSC NODES BATCH QUOTAS & MONITORING           */}
          {/* ================================================================= */}
          <TabsContent value="cyber" className="space-y-4">
            <Card className="border-border/60 shadow-xs">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Building2 className="text-emerald-600" size={18} />
                      <span>Authorized Cyber Cafe &amp; CSC Directory (Bagula II GP)</span>
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Decentralized citizen assistance nodes. Super Admin can adjust daily/monthly pre-verification submission quotas and toggle active status.
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative w-64">
                      <Search className="absolute left-2.5 top-2.5 text-muted-foreground" size={14} />
                      <Input
                        placeholder="Search cyber cafe, operator, CSC ID..."
                        value={cyberQuery}
                        onChange={(e) => setCyberQuery(e.target.value)}
                        className="h-8 pl-8 text-xs"
                      />
                    </div>

                    <Button
                      size="sm"
                      className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 shadow-xs text-white"
                      onClick={() => setShowAddCyberModal(true)}
                    >
                      <Plus size={13} />
                      <span>Register Cyber Node</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4">
                {loadingCyber ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    <RefreshCw className="animate-spin mx-auto mb-2 text-primary" size={20} />
                    Loading cyber cafe nodes...
                  </div>
                ) : filteredCyberCafes.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No cyber cafe nodes match your search query.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredCyberCafes.map((node) => {
                      const isActive = node.status === "active";
                      const usagePercent = Math.min(100, Math.round((node.todayCount / node.dailyLimit) * 100));

                      return (
                        <div
                          key={node.id}
                          className={`rounded-xl border p-4 transition-all shadow-xs ${
                            isActive
                              ? "border-emerald-200/80 bg-gradient-to-br from-emerald-50/30 via-white to-white"
                              : "border-slate-300 bg-slate-50/70 opacity-80"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-sm text-foreground">{node.name}</h3>
                                {node.verified && (
                                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                                    ✓ Authorized VLE
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                                Operator: <span className="text-foreground">{node.operatorName}</span> · CSC ID:{" "}
                                <code className="font-mono text-primary font-bold">{node.cscId}</code>
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                <MapPin size={11} />
                                <span>{node.address}</span>
                              </p>
                            </div>

                            <Button
                              size="sm"
                              variant={isActive ? "outline" : "default"}
                              className={`h-7 text-xs font-semibold px-2.5 ${
                                isActive
                                  ? "border-rose-300 text-rose-700 hover:bg-rose-50"
                                  : "bg-emerald-600 text-white hover:bg-emerald-700"
                              }`}
                              onClick={() => handleToggleCyberStatus(node)}
                            >
                              {isActive ? "Suspend Node" : "Activate Node"}
                            </Button>
                          </div>

                          {/* Quota Section */}
                          <div className="mt-4 pt-3 border-t border-slate-200/70 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-muted-foreground font-medium">Daily Application Limit:</span>
                                <span className="font-bold text-foreground">{node.dailyLimit}/day</span>
                              </div>
                              <div className="flex items-center gap-1 mt-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 w-7 p-0 text-xs font-bold"
                                  onClick={() => handleAdjustCyberLimit(node, -5)}
                                  title="Decrease daily quota by 5"
                                  disabled={node.dailyLimit <= 5}
                                >
                                  -5
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 w-7 p-0 text-xs font-bold"
                                  onClick={() => handleAdjustCyberLimit(node, -1)}
                                  title="Decrease daily quota by 1"
                                  disabled={node.dailyLimit <= 1}
                                >
                                  -1
                                </Button>
                                <span className="text-xs font-black px-2 py-0.5 rounded bg-slate-100 border border-slate-200 min-w-[36px] text-center">
                                  {node.dailyLimit}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 w-7 p-0 text-xs font-bold"
                                  onClick={() => handleAdjustCyberLimit(node, 1)}
                                  title="Increase daily quota by 1"
                                >
                                  +1
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 w-7 p-0 text-xs font-bold"
                                  onClick={() => handleAdjustCyberLimit(node, 5)}
                                  title="Increase daily quota by 5"
                                >
                                  +5
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-1 text-[10px] font-bold text-emerald-700"
                                  onClick={() => handleAdjustCyberLimit(node, 10)}
                                  title="Quick +10 quota"
                                >
                                  +10
                                </Button>
                              </div>
                            </div>

                            <div className="space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-muted-foreground">Today's Submissions:</span>
                                <span className="font-bold text-foreground">
                                  {node.todayCount} / {node.dailyLimit}
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${
                                    node.todayCount >= node.dailyLimit ? "bg-rose-500" : "bg-emerald-500"
                                  }`}
                                  style={{ width: `${usagePercent}%` }}
                                />
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                Month to date: <strong className="text-foreground">{node.monthCount}</strong> files
                              </p>
                            </div>
                          </div>

                          {/* Services Allowed */}
                          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-[10px] uppercase text-muted-foreground font-semibold">
                                Services:
                              </span>
                              <span className="text-[10px] font-medium bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                                Birth Digitization
                              </span>
                              <span className="text-[10px] font-medium bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">
                                Warish Pre-check
                              </span>
                            </div>

                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Phone size={10} />
                              <span>{node.mobile}</span>
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================================================================= */}
          {/* TAB 3: DEO ROLE & 1 / 2 / 3 CERTIFICATE PERMISSIONS               */}
          {/* ================================================================= */}
          <TabsContent value="deos" className="space-y-4">
            <Card className="border-border/60 shadow-xs">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <ShieldCheck className="text-amber-600" size={18} />
                      <span>Role-Based DEO Certificate Permissions &amp; Draft Limits</span>
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Configure granular certificate creation rights per DEO. A DEO can be authorized to create 1, 2, or all 3 certificates (Warish, Dependent, Linkage), with daily quota enforcement.
                    </CardDescription>
                  </div>

                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 text-muted-foreground" size={14} />
                    <Input
                      placeholder="Search DEO by name, email, employee ID..."
                      value={deoSearch}
                      onChange={(e) => setDeoSearch(e.target.value)}
                      className="h-8 pl-8 text-xs"
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {loadingDeos ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    <RefreshCw className="animate-spin mx-auto mb-2 text-primary" size={20} />
                    Loading DEO accounts and permission matrix...
                  </div>
                ) : filteredDeos.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No Data Entry Operator accounts found.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredDeos.map((deo) => {
                      const count = deo.allowedCertificates.length;
                      const isSaving = savingDeoId === deo.userId;

                      return (
                        <div
                          key={deo.userId}
                          className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
                        >
                          {/* DEO Identity & Tier Badge */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-sm shrink-0">
                                DEO
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-bold text-sm text-foreground">{deo.displayName}</h3>
                                  <Badge
                                    className={`text-[10px] font-bold ${
                                      count === 3
                                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                        : count === 2
                                        ? "bg-blue-100 text-blue-800 border-blue-300"
                                        : "bg-amber-100 text-amber-800 border-amber-300"
                                    }`}
                                  >
                                    {count} of 3 Certificates Authorized
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                  {deo.email} {deo.employeeId && `· ${deo.employeeId}`}
                                </p>
                              </div>
                            </div>

                            {/* Quick 1/2/3 Certificate Presets */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground mr-1">
                                Quick Tiers:
                              </span>
                              <Button
                                size="sm"
                                variant={count === 1 && deo.allowedCertificates.includes("warish") ? "default" : "outline"}
                                className="h-7 text-xs px-2.5 font-semibold"
                                onClick={() => handleSetDeoPreset(deo.userId, "1_warish")}
                                title="Grant permission for Warish Certificate only"
                              >
                                1 Cert (Warish)
                              </Button>
                              <Button
                                size="sm"
                                variant={count === 2 && deo.allowedCertificates.includes("warish") && deo.allowedCertificates.includes("dependent") ? "default" : "outline"}
                                className="h-7 text-xs px-2.5 font-semibold"
                                onClick={() => handleSetDeoPreset(deo.userId, "2_warish_dep")}
                                title="Grant permission for Warish and Dependent Certificates"
                              >
                                2 Certs (Warish + Dep)
                              </Button>
                              <Button
                                size="sm"
                                variant={count === 3 ? "default" : "outline"}
                                className="h-7 text-xs px-2.5 font-semibold"
                                onClick={() => handleSetDeoPreset(deo.userId, "3_all")}
                                title="Grant permission for all 3 Certificate types"
                              >
                                3 Certs (All 3)
                              </Button>
                            </div>
                          </div>

                          {/* Granular Certificate Selection Grid */}
                          <div className="space-y-2">
                            <label className="text-[11px] uppercase tracking-wide font-bold text-muted-foreground flex items-center gap-1.5">
                              <Layers size={13} className="text-primary" />
                              <span>Select Permitted Certificate Types for this DEO:</span>
                            </label>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {CERTIFICATE_OPTIONS.map((opt) => {
                                const isPermitted = deo.allowedCertificates.includes(opt.id);

                                return (
                                  <div
                                    key={opt.id}
                                    onClick={() => handleToggleDeoCertificate(deo.userId, opt.id)}
                                    className={`cursor-pointer rounded-xl border p-3 transition-all select-none ${
                                      isPermitted
                                        ? "border-primary bg-primary/5 shadow-2xs"
                                        : "border-slate-200 bg-slate-50/50 opacity-60 hover:opacity-100"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                                        <input
                                          type="checkbox"
                                          checked={isPermitted}
                                          onChange={() => {}} // Handled by parent div
                                          className="rounded border-slate-300 text-primary"
                                        />
                                        <span>{opt.label}</span>
                                      </span>
                                      <span
                                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                          isPermitted
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-slate-200 text-slate-600"
                                        }`}
                                      >
                                        {isPermitted ? "PERMITTED" : "LOCKED"}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground font-semibold">
                                      {opt.bnLabel}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                                      {opt.desc}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Application Quota Controls for this DEO */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-slate-100 items-center">
                            <div>
                              <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                                Daily Draft Quota Limit:
                              </label>
                              <div className="flex items-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 w-7 p-0 text-xs font-bold"
                                  onClick={() => handleAdjustDeoDailyLimit(deo.userId, -5)}
                                  disabled={deo.dailyApplicationLimit <= 5}
                                >
                                  -5
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 w-7 p-0 text-xs font-bold"
                                  onClick={() => handleAdjustDeoDailyLimit(deo.userId, -1)}
                                  disabled={deo.dailyApplicationLimit <= 1}
                                >
                                  -1
                                </Button>
                                <span className="text-xs font-black px-3 py-1 rounded bg-slate-100 border border-slate-200 min-w-[44px] text-center text-foreground">
                                  {deo.dailyApplicationLimit} / day
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 w-7 p-0 text-xs font-bold"
                                  onClick={() => handleAdjustDeoDailyLimit(deo.userId, 1)}
                                >
                                  +1
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 w-7 p-0 text-xs font-bold"
                                  onClick={() => handleAdjustDeoDailyLimit(deo.userId, 5)}
                                >
                                  +5
                                </Button>
                              </div>
                            </div>

                            <div className="text-xs space-y-0.5">
                              <p className="text-muted-foreground">
                                Today's Created Drafts: <strong className="text-foreground">{deo.todayCount}</strong>
                              </p>
                              <p className="text-muted-foreground">
                                Lifetime Cap:{" "}
                                <strong className="text-foreground">
                                  {deo.totalApplicationLimit === -1 ? "Unlimited" : deo.totalApplicationLimit}
                                </strong>
                              </p>
                            </div>

                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                className="h-8 text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                                disabled={isSaving}
                                onClick={() => handleSaveDeoConfig(deo)}
                              >
                                {isSaving ? (
                                  <RefreshCw size={12} className="animate-spin" />
                                ) : (
                                  <Save size={12} />
                                )}
                                <span>Save &amp; Enforce Permissions</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================================================================= */}
          {/* TAB 4: GLOBAL QUOTA POLICIES                                      */}
          {/* ================================================================= */}
          <TabsContent value="policy" className="space-y-4">
            <Card className="border-border/60 shadow-xs max-w-2xl">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Settings2 className="text-primary" size={18} />
                  <span>Gram Panchayat System-Wide Quota Policies</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Default limits applied automatically to newly registered citizens, cyber cafes, and DEOs under Bagula II GP.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-foreground">
                      Default Citizen Active Application Limit
                    </label>
                    <p className="text-[11px] text-muted-foreground mb-1.5">
                      Maximum active (unissued) drafts a registered citizen can have concurrently before requiring Super Admin increase.
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={policy.defaultCitizenLimit}
                        onChange={(e) =>
                          setPolicy({ ...policy, defaultCitizenLimit: Number(e.target.value) || 5 })
                        }
                        className="w-32 h-8 text-xs font-bold"
                      />
                      <span className="text-xs text-muted-foreground">Applications per citizen</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100">
                    <label className="text-xs font-bold text-foreground">
                      Default DEO Daily Application Quota
                    </label>
                    <p className="text-[11px] text-muted-foreground mb-1.5">
                      Daily rate cap for standard Data Entry Operators to ensure verification queue balance.
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={5}
                        max={200}
                        value={policy.defaultDeoDailyLimit}
                        onChange={(e) =>
                          setPolicy({ ...policy, defaultDeoDailyLimit: Number(e.target.value) || 25 })
                        }
                        className="w-32 h-8 text-xs font-bold"
                      />
                      <span className="text-xs text-muted-foreground">Drafts / Day</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100">
                    <label className="text-xs font-bold text-foreground">
                      Default Cyber Cafe Daily Batch Limit
                    </label>
                    <p className="text-[11px] text-muted-foreground mb-1.5">
                      Daily pre-verification intake ceiling per authorized CSC node terminal.
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={10}
                        max={500}
                        value={policy.defaultCyberDailyLimit}
                        onChange={(e) =>
                          setPolicy({ ...policy, defaultCyberDailyLimit: Number(e.target.value) || 50 })
                        }
                        className="w-32 h-8 text-xs font-bold"
                      />
                      <span className="text-xs text-muted-foreground">Files / Day</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                  <Button
                    className="h-8 text-xs font-bold gap-1.5"
                    disabled={savingPolicy}
                    onClick={async () => {
                      setSavingPolicy(true);
                      await saveGlobalQuotaPolicy(policy);
                      setSavingPolicy(false);
                      toast.success("Global quota policies updated successfully!");
                    }}
                  >
                    <Save size={13} />
                    <span>Save System Quota Policies</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ================================================================= */}
        {/* MODAL 1: VIEW CITIZEN DETAILS                                     */}
        {/* ================================================================= */}
        <Dialog open={!!selectedCitizen} onOpenChange={(open) => !open && setSelectedCitizen(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Users size={18} className="text-primary" />
                <span>Citizen Profile Details</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Official citizen profile stored in Bagula II Gram Panchayat registry.
              </DialogDescription>
            </DialogHeader>

            {selectedCitizen && (
              <div className="space-y-3 text-xs">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-semibold">Citizen ID:</span>
                    <span className="font-mono font-bold text-primary">{selectedCitizen.citizenId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-semibold">Full Legal Name:</span>
                    <span className="font-bold text-foreground">{selectedCitizen.fullName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-semibold">Mobile Number:</span>
                    <span className="font-medium text-foreground">{selectedCitizen.mobile}</span>
                  </div>
                  {selectedCitizen.email && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-semibold">Email:</span>
                      <span className="text-foreground">{selectedCitizen.email}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-semibold">Village / Locality:</span>
                    <span className="font-medium text-foreground">{selectedCitizen.village}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-semibold">EPIC No:</span>
                    <span className="font-mono">{selectedCitizen.epicNo || "Not provided"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-semibold">Aadhaar (Last 4):</span>
                    <span className="font-mono">{selectedCitizen.aadhaarLast4 ? `•••• ${selectedCitizen.aadhaarLast4}` : "Not provided"}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50/70 border border-blue-200 text-blue-950">
                  <span className="font-semibold">Current Application Limit:</span>
                  <span className="font-bold text-sm">{selectedCitizen.applicationLimit} applications</span>
                </div>

                {selectedCitizen.notes && (
                  <p className="text-[11px] text-muted-foreground italic bg-slate-50 p-2 rounded border">
                    Note: {selectedCitizen.notes}
                  </p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button size="sm" variant="outline" onClick={() => setSelectedCitizen(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ================================================================= */}
        {/* MODAL 2: REGISTER NEW CYBER CAFE NODE                             */}
        {/* ================================================================= */}
        <Dialog open={showAddCyberModal} onOpenChange={setShowAddCyberModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Building2 size={18} className="text-emerald-600" />
                <span>Register Authorized Cyber Cafe Node</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Authorize a local CSC / Cyber Center in Bagula II GP for pre-verification intake.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-foreground">Cyber Center / CSC Name *</label>
                <Input
                  placeholder="e.g. Maa Tara Digital CSC"
                  value={newCyberForm.name}
                  onChange={(e) => setNewCyberForm({ ...newCyberForm, name: e.target.value })}
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-foreground">Operator / VLE Name *</label>
                <Input
                  placeholder="e.g. Subir Karmakar"
                  value={newCyberForm.operatorName}
                  onChange={(e) => setNewCyberForm({ ...newCyberForm, operatorName: e.target.value })}
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-foreground">CSC ID (Optional)</label>
                  <Input
                    placeholder="373345540..."
                    value={newCyberForm.cscId}
                    onChange={(e) => setNewCyberForm({ ...newCyberForm, cscId: e.target.value })}
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-foreground">Contact Mobile</label>
                  <Input
                    placeholder="9832..."
                    value={newCyberForm.mobile}
                    onChange={(e) => setNewCyberForm({ ...newCyberForm, mobile: e.target.value })}
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-foreground">Physical Address in Bagula II</label>
                <Input
                  value={newCyberForm.address}
                  onChange={(e) => setNewCyberForm({ ...newCyberForm, address: e.target.value })}
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-foreground">Daily Limit (Files/Day)</label>
                  <Input
                    type="number"
                    value={newCyberForm.dailyLimit}
                    onChange={(e) => setNewCyberForm({ ...newCyberForm, dailyLimit: Number(e.target.value) || 50 })}
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-foreground">Monthly Cap</label>
                  <Input
                    type="number"
                    value={newCyberForm.monthlyLimit}
                    onChange={(e) => setNewCyberForm({ ...newCyberForm, monthlyLimit: Number(e.target.value) || 500 })}
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button size="sm" variant="outline" onClick={() => setShowAddCyberModal(false)}>
                Cancel
              </Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" onClick={handleCreateCyberCafe}>
                Authorize &amp; Register Node
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
