import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Award,
  SlidersHorizontal,
  Search,
  Filter,
  ArrowLeft,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  UserCheck,
  UserX,
  FileText,
  Plus,
  Minus,
  Sparkles,
  Info,
  Clock,
  Layers,
  Database,
  Check,
  Calendar,
  Settings2,
  Building2,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CERTIFICATE_OPTIONS,
  CertificateType,
  DeoConfig,
  fetchFullDeoDirectory,
  saveDeoConfig,
  getGlobalQuotaPolicy,
  saveGlobalQuotaPolicy,
  GlobalQuotaPolicy,
} from "@/lib/userQuotasAndLimits";
import { useAuthz } from "@/lib/permissions";
import { logActivity } from "@/lib/activityLogger";

export default function AdminDeoQuotas() {
  const navigate = useNavigate();
  const authz = useAuthz();

  const [deos, setDeos] = useState<DeoConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [policy, setPolicy] = useState<GlobalQuotaPolicy>(getGlobalQuotaPolicy());
  const [savingPolicy, setSavingPolicy] = useState(false);

  // Load all DEO configs and directory
  const loadData = useCallback(async () => {
    try {
      const list = await fetchFullDeoDirectory();
      setDeos(list);
    } catch (e: any) {
      toast.error("Failed to load DEO accounts: " + (e.message || "Unknown error"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    toast.success("DEO accounts and quotas refreshed from database.");
  };

  // Adjust daily limit
  const handleAdjustDailyLimit = (userId: string, delta: number) => {
    setDeos((prev) =>
      prev.map((d) => {
        if (d.userId !== userId) return d;
        const current = d.dailyApplicationLimit || d.dailyLimit || 25;
        const next = Math.max(1, Math.min(200, current + delta));
        return { ...d, dailyApplicationLimit: next, dailyLimit: next };
      })
    );
  };

  // Set explicit limit
  const handleSetDailyLimit = (userId: string, value: number) => {
    const val = Math.max(1, Math.min(200, value || 1));
    setDeos((prev) =>
      prev.map((d) => (d.userId === userId ? { ...d, dailyApplicationLimit: val, dailyLimit: val } : d))
    );
  };

  // Preset tier assignment
  const handleApplyTierPreset = (
    userId: string,
    tier: 1 | 2 | 3
  ) => {
    setDeos((prev) =>
      prev.map((d) => {
        if (d.userId !== userId) return d;
        let allowed: CertificateType[] = ["warish"];
        if (tier === 2) allowed = ["warish", "dependent"];
        if (tier === 3) allowed = ["warish", "dependent", "linkage"];
        return {
          ...d,
          allowedCertificates: allowed,
          tier,
        };
      })
    );
    const tierName = tier === 1 ? "Tier 1 (Warish Only)" : tier === 2 ? "Tier 2 (Warish + Dependent)" : "Tier 3 (All 3 Certificates)";
    toast.info(`Configured ${tierName}. Click "Save & Enforce" to commit.`);
  };

  // Toggle individual certificate type
  const handleToggleCertificate = (userId: string, cert: CertificateType) => {
    setDeos((prev) =>
      prev.map((d) => {
        if (d.userId !== userId) return d;
        const isPermitted = d.allowedCertificates.includes(cert);
        let nextAllowed: CertificateType[];
        if (isPermitted) {
          if (d.allowedCertificates.length === 1) {
            toast.warning("A DEO must have permission for at least 1 certificate type.");
            return d;
          }
          nextAllowed = d.allowedCertificates.filter((c) => c !== cert);
        } else {
          nextAllowed = [...d.allowedCertificates, cert];
        }
        const nextTier = nextAllowed.length >= 3 ? 3 : nextAllowed.length === 2 ? 2 : 1;
        return { ...d, allowedCertificates: nextAllowed, tier: nextTier };
      })
    );
  };

  // Toggle birth digitization
  const handleToggleBirthDigitization = (userId: string) => {
    setDeos((prev) =>
      prev.map((d) =>
        d.userId === userId ? { ...d, allowBirthDigitization: !d.allowBirthDigitization } : d
      )
    );
  };

  // Change account status
  const handleStatusChange = (userId: string, status: "active" | "quota_paused" | "suspended") => {
    setDeos((prev) =>
      prev.map((d) => (d.userId === userId ? { ...d, status } : d))
    );
  };

  // Change notes
  const handleNotesChange = (userId: string, notes: string) => {
    setDeos((prev) =>
      prev.map((d) => (d.userId === userId ? { ...d, notes } : d))
    );
  };

  // Save single DEO config
  const handleSaveConfig = async (deo: DeoConfig) => {
    setSavingId(deo.userId);
    try {
      const res = await saveDeoConfig(deo, authz.email || "super_admin");
      if (res.success) {
        toast.success(
          `Successfully saved permissions for ${deo.displayName}: Tier ${deo.allowedCertificates.length} (${deo.allowedCertificates.join(", ").toUpperCase()}) · Daily Quota: ${deo.dailyApplicationLimit}/day.`
        );
      } else {
        toast.error(res.message || "Failed to save DEO permissions");
      }
    } catch (e: any) {
      toast.error(e.message || "Error saving DEO configuration");
    } finally {
      setSavingId(null);
    }
  };

  // Batch operations
  const handleBatchAllTier3 = () => {
    setDeos((prev) =>
      prev.map((d) => ({
        ...d,
        allowedCertificates: ["warish", "dependent", "linkage"],
        tier: 3,
      }))
    );
    toast.info("All DEO accounts set to Tier 3 (Full Access). Click 'Save & Enforce' on individual accounts or commit.");
  };

  const handleBatchAllTier1 = () => {
    setDeos((prev) =>
      prev.map((d) => ({
        ...d,
        allowedCertificates: ["warish"],
        tier: 1,
      }))
    );
    toast.info("All DEO accounts restricted to Tier 1 (Warish Only). Click 'Save & Enforce' to commit.");
  };

  const handleResetTodayCounters = () => {
    setDeos((prev) => prev.map((d) => ({ ...d, todayCount: 0 })));
    toast.success("Today's draft counters reset for all DEO accounts.");
  };

  // Save global policy
  const handleSavePolicy = async () => {
    setSavingPolicy(true);
    try {
      await saveGlobalQuotaPolicy(policy);
      toast.success("Gram Panchayat global quota policies saved successfully.");
    } catch (e: any) {
      toast.error("Failed to save policy: " + e.message);
    } finally {
      setSavingPolicy(false);
    }
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = deos.length;
    const tier1 = deos.filter((d) => d.allowedCertificates.length === 1).length;
    const tier2 = deos.filter((d) => d.allowedCertificates.length === 2).length;
    const tier3 = deos.filter((d) => d.allowedCertificates.length >= 3).length;
    const active = deos.filter((d) => d.status === "active").length;
    const paused = deos.filter((d) => d.status === "quota_paused").length;
    const suspended = deos.filter((d) => d.status === "suspended").length;
    const totalDailyQuota = deos.reduce((sum, d) => sum + (d.dailyApplicationLimit || d.dailyLimit || 25), 0);
    const totalTodayCreated = deos.reduce((sum, d) => sum + (d.todayCount || 0), 0);

    return { total, tier1, tier2, tier3, active, paused, suspended, totalDailyQuota, totalTodayCreated };
  }, [deos]);

  // Filtered DEO list
  const filteredDeos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return deos.filter((d) => {
      // Search
      if (q) {
        const matchesName = d.displayName.toLowerCase().includes(q);
        const matchesEmail = d.email.toLowerCase().includes(q);
        const matchesEmpId = d.employeeId?.toLowerCase().includes(q) || false;
        if (!matchesName && !matchesEmail && !matchesEmpId) return false;
      }
      // Tier filter
      if (tierFilter !== "all") {
        const targetTier = parseInt(tierFilter, 10);
        const currentTier = d.allowedCertificates.length >= 3 ? 3 : d.allowedCertificates.length === 2 ? 2 : 1;
        if (currentTier !== targetTier) return false;
      }
      // Status filter
      if (statusFilter !== "all" && d.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [deos, searchQuery, tierFilter, statusFilter]);

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 pb-16">
      {/* TOP BANNER / HEADER */}
      <div className="border-b border-border/40 bg-card/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button asChild variant="ghost" size="sm" className="h-8 px-2 gap-1.5 text-muted-foreground hover:text-foreground">
                <Link to="/admin/dashboard">
                  <ArrowLeft size={16} />
                  <span className="hidden sm:inline text-xs font-medium">Dashboard</span>
                </Link>
              </Button>
              <div className="h-4 w-px bg-border/60" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚖️</span>
                  <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                    DEO Quotas &amp; 1/2/3 Certificate Tiers
                  </h1>
                  <Badge variant="outline" className="text-[10px] font-semibold bg-primary/10 text-primary border-primary/20">
                    GP Official Control
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Bagula II Gram Panchayat · Review active DEO accounts, set 1/2/3 certificate tiers, and allocate daily draft limits
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium gap-1.5 shadow-xs"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
                <span>Refresh Data</span>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-8 text-xs font-medium gap-1.5 shadow-xs">
                <Link to="/admin/manage">
                  <Building2 size={13} />
                  <span>Office Accounts</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* KPI SUMMARY CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="p-3.5 border-border/60 shadow-xs bg-card">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Total DEOs</span>
              <UserCheck size={14} className="text-primary" />
            </div>
            <div className="text-2xl font-black text-foreground">{stats.total}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">
              {stats.active} Active · {stats.paused} Paused
            </div>
          </Card>

          <Card className="p-3.5 border-border/60 shadow-xs bg-blue-50/40 dark:bg-blue-950/20 border-blue-200/50">
            <div className="flex items-center justify-between text-blue-700 dark:text-blue-300 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Tier 1 (1 Cert)</span>
              <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200">T1</span>
            </div>
            <div className="text-2xl font-black text-blue-900 dark:text-blue-100">{stats.tier1}</div>
            <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5 font-medium">
              Warish Certificate Only
            </div>
          </Card>

          <Card className="p-3.5 border-border/60 shadow-xs bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/50">
            <div className="flex items-center justify-between text-amber-700 dark:text-amber-300 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Tier 2 (2 Certs)</span>
              <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200">T2</span>
            </div>
            <div className="text-2xl font-black text-amber-900 dark:text-amber-100">{stats.tier2}</div>
            <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
              Warish + Dependent
            </div>
          </Card>

          <Card className="p-3.5 border-border/60 shadow-xs bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/50">
            <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Tier 3 (All 3)</span>
              <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-200">T3</span>
            </div>
            <div className="text-2xl font-black text-emerald-900 dark:text-emerald-100">{stats.tier3}</div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
              Full Scope (All Types)
            </div>
          </Card>

          <Card className="p-3.5 border-border/60 shadow-xs bg-card">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">GP Daily Cap</span>
              <Clock size={14} className="text-amber-600" />
            </div>
            <div className="text-2xl font-black text-foreground">{stats.totalDailyQuota}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">
              Drafts / day system cap
            </div>
          </Card>

          <Card className="p-3.5 border-border/60 shadow-xs bg-card">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Today's Drafts</span>
              <FileText size={14} className="text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-foreground">{stats.totalTodayCreated}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">
              Created today across GP
            </div>
          </Card>
        </div>

        {/* BATCH ACTION CONTROLS & NOTICE */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-primary" />
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wide">
                Regulatory Framework &amp; Tier Policy (Rule 12/13 RBD &amp; West Bengal SOP)
              </h2>
            </div>
            <p className="text-xs text-muted-foreground max-w-3xl leading-relaxed">
              Super Admin and Reviewing Authority strictly govern which certificates each Data Entry Operator can initiate.
              <strong> Tier 1</strong> operators can only process Warish (Inheritance) certificates.
              <strong> Tier 2</strong> unlocks Dependent certificates for welfare benefits.
              <strong> Tier 3</strong> unlocks the Linkage certificate required for voter revision and citizenship verification.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs font-semibold border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
              onClick={handleBatchAllTier3}
            >
              <Sparkles size={12} className="mr-1 text-emerald-600" />
              Unlock Tier 3 for All
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs font-semibold border-blue-500/40 text-blue-700 dark:text-blue-300 hover:bg-blue-500/10"
              onClick={handleBatchAllTier1}
            >
              <Lock size={12} className="mr-1 text-blue-600" />
              Lock All to Tier 1
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs font-semibold text-muted-foreground hover:text-foreground"
              onClick={handleResetTodayCounters}
            >
              <RotateCcwIcon size={12} className="mr-1" />
              Reset Daily Counters
            </Button>
          </div>
        </div>

        {/* SEARCH AND FILTER BAR */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/60 shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by DEO name, email, or employee ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Tier:</span>
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger className="h-8 text-xs w-[130px]">
                  <SelectValue placeholder="All Tiers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="1">Tier 1 (1 Cert)</SelectItem>
                  <SelectItem value="2">Tier 2 (2 Certs)</SelectItem>
                  <SelectItem value="3">Tier 3 (All 3)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Status:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs w-[130px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="quota_paused">Quota Paused</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* DEO CARDS GRID */}
        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground bg-card rounded-xl border border-border/40">
            <RefreshCw size={24} className="animate-spin mx-auto text-primary mb-2" />
            Loading DEO accounts and quota configurations...
          </div>
        ) : filteredDeos.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground bg-card rounded-xl border border-border/40 space-y-3">
            <Info size={28} className="mx-auto text-muted-foreground/60" />
            <p className="font-semibold text-foreground">No DEO accounts matched the current filters.</p>
            <p className="text-xs max-w-sm mx-auto">Try clearing your search query or adjusting the tier and status filters above.</p>
            <Button size="sm" variant="outline" onClick={() => { setSearchQuery(""); setTierFilter("all"); setStatusFilter("all"); }}>
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDeos.map((deo) => {
              const effectiveTier = deo.allowedCertificates.length >= 3 ? 3 : deo.allowedCertificates.length === 2 ? 2 : 1;
              const dailyLimit = deo.dailyApplicationLimit || deo.dailyLimit || 25;
              const isSaving = savingId === deo.userId;
              const usagePercent = Math.min(100, Math.round(((deo.todayCount || 0) / dailyLimit) * 100));

              return (
                <Card
                  key={deo.userId}
                  className={`border transition-all duration-200 shadow-xs ${
                    deo.status === "suspended"
                      ? "border-rose-300 bg-rose-50/30 dark:bg-rose-950/10"
                      : deo.status === "quota_paused"
                      ? "border-amber-300 bg-amber-50/20 dark:bg-amber-950/10"
                      : "border-border/70 hover:border-primary/40 bg-card"
                  }`}
                >
                  <CardContent className="p-4 sm:p-5 space-y-4">
                    {/* CARD HEADER ROW */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          effectiveTier === 3
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-300/50"
                            : effectiveTier === 2
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-300/50"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-300/50"
                        }`}>
                          T{effectiveTier}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-bold text-foreground">{deo.displayName}</h3>
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-semibold capitalize ${
                                deo.status === "active"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300"
                                  : deo.status === "quota_paused"
                                  ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300"
                                  : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300"
                              }`}
                            >
                              {deo.status === "active" ? "● Active" : deo.status === "quota_paused" ? "⏸ Quota Paused" : "✕ Suspended"}
                            </Badge>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                              {deo.employeeId ? `ID: ${deo.employeeId}` : "Designated DEO"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {deo.email} · Registered Data Entry Operator (Bagula II GP)
                          </p>
                        </div>
                      </div>

                      {/* TIER PRESET QUICK SWITCHER */}
                      <div className="flex items-center gap-1.5 self-start sm:self-auto bg-muted/40 p-1 rounded-lg border border-border/50">
                        <span className="text-[10px] font-bold text-muted-foreground px-1.5 uppercase">Tier Presets:</span>
                        <Button
                          size="sm"
                          variant={effectiveTier === 1 ? "default" : "ghost"}
                          className={`h-7 px-2 text-[11px] font-bold rounded ${effectiveTier === 1 ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
                          onClick={() => handleApplyTierPreset(deo.userId, 1)}
                        >
                          T1: 1 Cert
                        </Button>
                        <Button
                          size="sm"
                          variant={effectiveTier === 2 ? "default" : "ghost"}
                          className={`h-7 px-2 text-[11px] font-bold rounded ${effectiveTier === 2 ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}`}
                          onClick={() => handleApplyTierPreset(deo.userId, 2)}
                        >
                          T2: 2 Certs
                        </Button>
                        <Button
                          size="sm"
                          variant={effectiveTier === 3 ? "default" : "ghost"}
                          className={`h-7 px-2 text-[11px] font-bold rounded ${effectiveTier === 3 ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                          onClick={() => handleApplyTierPreset(deo.userId, 3)}
                        >
                          T3: All 3
                        </Button>
                      </div>
                    </div>

                    {/* CERTIFICATE TYPES PERMISSION CARDS */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                          <Layers size={13} className="text-primary" />
                          <span>Authorized Certificate Types ({deo.allowedCertificates.length} of 3 Allowed)</span>
                        </label>
                        <span className="text-[11px] text-muted-foreground">
                          Click any card to grant or revoke creation permission
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                        {CERTIFICATE_OPTIONS.map((opt) => {
                          const isPermitted = deo.allowedCertificates.includes(opt.id);
                          return (
                            <div
                              key={opt.id}
                              onClick={() => handleToggleCertificate(deo.userId, opt.id)}
                              className={`p-3 rounded-xl border cursor-pointer select-none transition-all duration-150 flex flex-col justify-between ${
                                isPermitted
                                  ? "border-primary/50 bg-primary/5 shadow-xs"
                                  : "border-border/60 bg-muted/20 opacity-70 hover:opacity-100"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-1.5">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-4 h-4 rounded flex items-center justify-center text-white text-[10px] ${
                                      isPermitted ? "bg-primary" : "border border-muted-foreground/40 bg-background"
                                    }`}
                                  >
                                    {isPermitted && <Check size={12} />}
                                  </div>
                                  <span className="text-xs font-bold text-foreground">{opt.label}</span>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] font-bold uppercase tracking-wider ${
                                    isPermitted
                                      ? "bg-primary/10 text-primary border-primary/30"
                                      : "bg-slate-100 dark:bg-slate-800 text-muted-foreground"
                                  }`}
                                >
                                  {isPermitted ? "PERMITTED" : "LOCKED"}
                                </Badge>
                              </div>
                              <p className="text-[10px] font-semibold text-primary/80 dark:text-primary-foreground/70">
                                {opt.bnLabel}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                                {opt.desc}
                              </p>
                            </div>
                          );
                        })}
                      </div>

                      {/* BIRTH DIGITIZATION TOGGLE */}
                      <div className="pt-2 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-border/40">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`birth-digi-${deo.userId}`}
                            checked={deo.allowBirthDigitization}
                            onChange={() => handleToggleBirthDigitization(deo.userId)}
                            className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                          />
                          <label htmlFor={`birth-digi-${deo.userId}`} className="text-xs font-medium text-foreground cursor-pointer">
                            Allow <strong>Case-I Birth Certificate Digitization</strong> Pre-Verification entry
                          </label>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          Legacy pre-2016 manual register search &amp; verification
                        </span>
                      </div>
                    </div>

                    {/* QUOTA CONTROLS & STATUS */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-3 border-t border-border/40 items-center">
                      {/* DAILY LIMIT CONTROLS */}
                      <div className="lg:col-span-5 space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground block">
                          Daily Draft Application Limit:
                        </label>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0 text-xs font-bold"
                            onClick={() => handleAdjustDailyLimit(deo.userId, -5)}
                            disabled={dailyLimit <= 5}
                          >
                            -5
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0 text-xs font-bold"
                            onClick={() => handleAdjustDailyLimit(deo.userId, -1)}
                            disabled={dailyLimit <= 1}
                          >
                            -1
                          </Button>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min={1}
                              max={200}
                              value={dailyLimit}
                              onChange={(e) => handleSetDailyLimit(deo.userId, Number(e.target.value))}
                              className="w-16 h-7 text-xs font-black text-center"
                            />
                            <span className="text-xs font-medium text-muted-foreground">/ day</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0 text-xs font-bold"
                            onClick={() => handleAdjustDailyLimit(deo.userId, 1)}
                          >
                            +1
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0 text-xs font-bold"
                            onClick={() => handleAdjustDailyLimit(deo.userId, 5)}
                          >
                            +5
                          </Button>
                        </div>
                      </div>

                      {/* TODAY USAGE PROGRESS */}
                      <div className="lg:col-span-4 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground font-medium">Today's Drafts Created:</span>
                          <span className="font-mono font-bold text-foreground">
                            {deo.todayCount || 0} / {dailyLimit}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              usagePercent >= 100
                                ? "bg-rose-500"
                                : usagePercent >= 75
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(100, usagePercent)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{usagePercent}% Quota Utilized</span>
                          <span>Lifetime Cap: {deo.totalApplicationLimit === -1 ? "Unlimited" : deo.totalApplicationLimit}</span>
                        </div>
                      </div>

                      {/* ACCOUNT STATUS SELECTOR & SAVE BUTTON */}
                      <div className="lg:col-span-3 flex items-center justify-end gap-2">
                        <Select
                          value={deo.status}
                          onValueChange={(val) => handleStatusChange(deo.userId, val as any)}
                        >
                          <SelectTrigger className="h-8 text-xs w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="quota_paused">Pause Quota</SelectItem>
                            <SelectItem value="suspended">Suspend</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          size="sm"
                          className="h-8 text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs shrink-0"
                          disabled={isSaving}
                          onClick={() => handleSaveConfig(deo)}
                        >
                          {isSaving ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : (
                            <Save size={12} />
                          )}
                          <span>Save &amp; Enforce</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* SYSTEM-WIDE GLOBAL QUOTA DEFAULTS */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Settings2 className="text-primary" size={16} />
                  <span>Gram Panchayat System-Wide Default Quotas</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Default limits automatically assigned when creating or registering new citizen accounts and DEO operators.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs font-bold gap-1.5"
                disabled={savingPolicy}
                onClick={handleSavePolicy}
              >
                {savingPolicy ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                <span>Save Default Policy</span>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground block">
                Default DEO Daily Application Quota
              </label>
              <p className="text-[11px] text-muted-foreground mb-1">
                Standard baseline quota for newly onboarded Data Entry Operators.
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
                  className="w-28 h-8 text-xs font-bold"
                />
                <span className="text-xs text-muted-foreground">Drafts / Day</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground block">
                Default Citizen Active Draft Limit
              </label>
              <p className="text-[11px] text-muted-foreground mb-1">
                Maximum pending applications a citizen can submit before GP approval.
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
                  className="w-28 h-8 text-xs font-bold"
                />
                <span className="text-xs text-muted-foreground">Active Drafts</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground block">
                Cyber Cafe Daily Rate Cap
              </label>
              <p className="text-[11px] text-muted-foreground mb-1">
                Default submission ceiling for local CSC Cyber Cafe nodes.
              </p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={5}
                  max={100}
                  value={policy.defaultCyberCafeLimit}
                  onChange={(e) =>
                    setPolicy({ ...policy, defaultCyberCafeLimit: Number(e.target.value) || 20 })
                  }
                  className="w-28 h-8 text-xs font-bold"
                />
                <span className="text-xs text-muted-foreground">Files / Day</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function RotateCcwIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}
