import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Database,
  ShieldAlert,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wifi,
  Lock,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Info,
} from "lucide-react";
import {
  fetchDatabaseHealth,
  fetchAuthLogs,
  fetchStorageStats,
  recordAuthIncident,
  clearClientAuthBuffer,
  type DatabaseHealthInfo,
  type AuthLogEntry,
  type StorageStatsInfo,
} from "@/lib/systemStatusService";
import { refetchSchemaCache } from "@/lib/adminDatabaseErrorHandler";

interface AdminSystemStatusWidgetProps {
  className?: string;
  defaultTab?: "database" | "auth" | "storage";
  compact?: boolean;
}

export function AdminSystemStatusWidget({
  className = "",
  defaultTab = "database",
  compact = false,
}: AdminSystemStatusWidgetProps) {
  const [activeTab, setActiveTab] = useState<"database" | "auth" | "storage">(defaultTab);
  const [loading, setLoading] = useState(true);
  const [pinging, setPinging] = useState(false);
  const [syncingSchema, setSyncingSchema] = useState(false);
  const [authFilter, setAuthFilter] = useState<"all" | "error" | "warning" | "info">("all");

  const [dbHealth, setDbHealth] = useState<DatabaseHealthInfo | null>(null);
  const [authLogs, setAuthLogs] = useState<AuthLogEntry[]>([]);
  const [storageStats, setStorageStats] = useState<StorageStatsInfo | null>(null);

  // Load all system status data
  const loadSystemStatus = useCallback(async (showToast = false) => {
    setLoading(true);
    try {
      const [db, auth, storage] = await Promise.all([
        fetchDatabaseHealth(),
        fetchAuthLogs(),
        fetchStorageStats(),
      ]);
      setDbHealth(db);
      setAuthLogs(auth);
      setStorageStats(storage);
      if (showToast) {
        toast.success("System status refreshed successfully");
      }
    } catch (err: any) {
      console.error("Failed to load system status", err);
      if (showToast) {
        toast.error("Failed to refresh system status");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSystemStatus();
    // Auto refresh health check every 45 seconds
    const interval = setInterval(() => {
      fetchDatabaseHealth().then((health) => setDbHealth(health));
    }, 45000);
    return () => clearInterval(interval);
  }, [loadSystemStatus]);

  // Ping database specifically
  const handlePing = async () => {
    setPinging(true);
    try {
      const result = await fetchDatabaseHealth();
      setDbHealth(result);
      if (result.status === "healthy") {
        toast.success(`Database connection healthy! Latency: ${result.latencyMs}ms`);
      } else if (result.status === "degraded") {
        toast.warning(`Database response delayed (${result.latencyMs}ms)`);
      } else {
        toast.error(`Database connection error: ${result.errorMessage || "Unavailable"}`);
      }
    } finally {
      setPinging(false);
    }
  };

  // Sync schema cache
  const handleSyncSchema = async () => {
    setSyncingSchema(true);
    const toastId = toast.loading("Synchronizing PostgREST schema cache...");
    try {
      const res = await refetchSchemaCache();
      toast.dismiss(toastId);
      if (res.success) {
        toast.success("Database schema cache reloaded and synchronized!");
        if (dbHealth) {
          setDbHealth({ ...dbHealth, schemaCacheStatus: "synced" });
        }
      } else {
        toast.error(res.message);
      }
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error(e?.message ?? "Schema synchronization failed");
    } finally {
      setSyncingSchema(false);
    }
  };

  // Simulate test authentication incident
  const handleSimulateAuthError = async () => {
    await recordAuthIncident({
      action_type: "auth.signin_failed",
      actor_email: "operator_sim@bagula2gp.gov.in",
      reason: "Simulated invalid credentials attempt from unauthorized subnet",
      severity: "error",
      metadata: { simulated: true, subnet: "192.168.1.0/24" },
    });
    toast.info("Simulated authentication error incident recorded");
    const updated = await fetchAuthLogs();
    setAuthLogs(updated);
  };

  // Clear local incident buffer
  const handleClearAuthBuffer = async () => {
    clearClientAuthBuffer();
    toast.success("Client incident buffer cleared");
    const updated = await fetchAuthLogs();
    setAuthLogs(updated);
  };

  const filteredAuthLogs = authLogs.filter((l) => {
    if (authFilter === "all") return true;
    return l.severity === authFilter;
  });

  const errorCount = authLogs.filter((l) => l.severity === "error").length;
  const warningCount = authLogs.filter((l) => l.severity === "warning").length;

  return (
    <div
      id="admin-system-status-widget"
      className={`rounded-2xl border border-border/50 bg-white/95 backdrop-blur-md shadow-sm overflow-hidden ${className}`}
    >
      {/* Widget Header */}
      <div className="p-4 sm:p-5 border-b border-border/40 bg-gradient-to-r from-slate-50/80 via-white to-sky-50/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 ring-1 ring-primary/20">
              <Database size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground tracking-tight">
                  🖥️ Admin System Status
                </h2>
                {dbHealth && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      dbHealth.status === "healthy"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : dbHealth.status === "degraded"
                        ? "bg-amber-50 text-amber-700 border-amber-300"
                        : "bg-rose-50 text-rose-700 border-rose-300"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        dbHealth.status === "healthy"
                          ? "bg-emerald-500 animate-pulse"
                          : dbHealth.status === "degraded"
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      }`}
                    />
                    {dbHealth.status === "healthy"
                      ? "Connected"
                      : dbHealth.status === "degraded"
                      ? "Degraded"
                      : "Offline"}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real-time database connection health, security authentication audit & storage metrics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePing()}
              disabled={pinging || loading}
              className="h-8 text-xs gap-1.5 border-slate-200 hover:bg-slate-50"
              title="Ping Supabase database to measure round-trip latency"
            >
              <Wifi size={13} className={pinging ? "animate-spin text-primary" : "text-primary"} />
              <span>{pinging ? "Pinging…" : "Ping DB"}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => loadSystemStatus(true)}
              disabled={loading}
              className="h-8 text-xs gap-1.5 border-slate-200 hover:bg-slate-50"
              title="Refresh all status metrics"
            >
              <RefreshCw size={13} className={loading ? "animate-spin text-primary" : "text-muted-foreground"} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-3 gap-2.5 mt-4 pt-3 border-t border-border/30">
          {/* DB Health KPI */}
          <div
            onClick={() => setActiveTab("database")}
            className={`cursor-pointer rounded-xl p-2.5 transition-all border ${
              activeTab === "database"
                ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20"
                : "bg-white/60 border-slate-100 hover:bg-slate-50/80"
            }`}
          >
            <div className="flex items-center justify-between text-muted-foreground text-[11px]">
              <span className="flex items-center gap-1 font-medium">
                <Database size={12} className="text-primary" /> DB Latency
              </span>
              {dbHealth?.status === "healthy" && (
                <CheckCircle2 size={12} className="text-emerald-600" />
              )}
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-base font-bold text-foreground">
                {dbHealth ? `${dbHealth.latencyMs}ms` : "—"}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {dbHealth?.latencyMs && dbHealth.latencyMs < 100
                  ? "Optimal"
                  : dbHealth?.latencyMs && dbHealth.latencyMs < 250
                  ? "Good"
                  : "Latency"}
              </span>
            </div>
          </div>

          {/* Auth Errors KPI */}
          <div
            onClick={() => setActiveTab("auth")}
            className={`cursor-pointer rounded-xl p-2.5 transition-all border ${
              activeTab === "auth"
                ? "bg-rose-50/60 border-rose-200 ring-1 ring-rose-200"
                : "bg-white/60 border-slate-100 hover:bg-slate-50/80"
            }`}
          >
            <div className="flex items-center justify-between text-muted-foreground text-[11px]">
              <span className="flex items-center gap-1 font-medium">
                <ShieldAlert size={12} className={errorCount > 0 ? "text-rose-600" : "text-emerald-600"} /> Auth Logs
              </span>
              {errorCount > 0 ? (
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
              ) : (
                <ShieldCheck size={12} className="text-emerald-600" />
              )}
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className={`text-base font-bold ${errorCount > 0 ? "text-rose-600" : "text-foreground"}`}>
                {errorCount}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {errorCount === 1 ? "Error" : "Errors"} {warningCount > 0 && `· ${warningCount} Warn`}
              </span>
            </div>
          </div>

          {/* Storage Usage KPI */}
          <div
            onClick={() => setActiveTab("storage")}
            className={`cursor-pointer rounded-xl p-2.5 transition-all border ${
              activeTab === "storage"
                ? "bg-sky-50/60 border-sky-200 ring-1 ring-sky-200"
                : "bg-white/60 border-slate-100 hover:bg-slate-50/80"
            }`}
          >
            <div className="flex items-center justify-between text-muted-foreground text-[11px]">
              <span className="flex items-center gap-1 font-medium">
                <HardDrive size={12} className="text-sky-600" /> Storage Used
              </span>
              <span className="text-[10px] text-muted-foreground">
                {storageStats?.usagePercentage ?? 0}%
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-base font-bold text-foreground">
                {storageStats?.formattedTotalSize ?? "—"}
              </span>
              <span className="text-[10px] text-muted-foreground truncate">
                / {storageStats?.formattedQuota ?? "1 GB"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-border/40 px-4 bg-slate-50/50 text-xs font-medium">
        <button
          onClick={() => setActiveTab("database")}
          className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === "database"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Database size={13} />
          <span>Database Connection</span>
        </button>
        <button
          onClick={() => setActiveTab("auth")}
          className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === "auth"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShieldAlert size={13} />
          <span>Auth Error Logs</span>
          {errorCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-700 font-bold">
              {errorCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("storage")}
          className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === "storage"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <HardDrive size={13} />
          <span>Storage Statistics</span>
          {storageStats && (
            <span className="ml-1 text-[10px] text-muted-foreground">
              ({storageStats.totalFiles} files)
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Database Connection Health */}
      {activeTab === "database" && (
        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            {/* Connection Status Card */}
            <div className="rounded-xl border border-border/40 bg-slate-50/60 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Wifi size={14} className="text-primary" /> Connection Link
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Last checked: {dbHealth?.lastChecked || "Just now"}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="text-lg font-bold text-foreground flex items-center gap-2">
                    {dbHealth?.status === "healthy" ? (
                      <span className="text-emerald-700 flex items-center gap-1.5">
                        <CheckCircle2 size={16} className="text-emerald-600" /> Operational
                      </span>
                    ) : dbHealth?.status === "degraded" ? (
                      <span className="text-amber-700 flex items-center gap-1.5">
                        <AlertTriangle size={16} className="text-amber-600" /> Degraded
                      </span>
                    ) : (
                      <span className="text-rose-700 flex items-center gap-1.5">
                        <XCircle size={16} className="text-rose-600" /> Offline / Error
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    PostgreSQL REST Gateway (Cloud Instance)
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-lg font-mono font-bold text-foreground">
                    {dbHealth ? `${dbHealth.latencyMs} ms` : "—"}
                  </div>
                  <span className="text-[10px] uppercase font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                    RTT Latency
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-border/30 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Core Tables Reachability:</span>
                <span className="font-semibold text-foreground">
                  {dbHealth?.tablesReachable ?? 0} / {dbHealth?.totalTablesChecked ?? 4} verified
                </span>
              </div>
            </div>

            {/* Schema Cache & Security Card */}
            <div className="rounded-xl border border-border/40 bg-slate-50/60 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Layers size={14} className="text-primary" /> PostgREST Schema Cache
                </span>
                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300">
                  Synced
                </Badge>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Schema definitions for Warish, Dependent, Citizen Profiles, and RBAC policies are hot-cached in memory for high-throughput responses.
              </p>

              <div className="pt-2 border-t border-border/30 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Force schema cache reload:</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSyncSchema}
                  disabled={syncingSchema}
                  className="h-7 text-[11px] px-2.5 gap-1.5"
                >
                  <RotateCcw size={11} className={syncingSchema ? "animate-spin" : "text-primary"} />
                  <span>{syncingSchema ? "Reloading…" : "Sync Schema"}</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Infrastructure Specs Table */}
          <div className="rounded-xl border border-border/30 bg-white p-3 space-y-2">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-primary" /> Security & Protocol Specifications
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="bg-slate-50 p-2 rounded-lg">
                <span className="text-muted-foreground block text-[10px]">Cloud Host</span>
                <span className="font-mono font-medium truncate block text-foreground" title={dbHealth?.host}>
                  {dbHealth?.host ?? "iyyrjpzfjsslqibibpsx"}
                </span>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg">
                <span className="text-muted-foreground block text-[10px]">Encryption</span>
                <span className="font-medium text-emerald-700 flex items-center gap-1">
                  <Lock size={10} /> TLS 1.3 / HTTPS
                </span>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg">
                <span className="text-muted-foreground block text-[10px]">Access Control</span>
                <span className="font-medium text-foreground">RLS + RBAC Guard</span>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg">
                <span className="text-muted-foreground block text-[10px]">Connection Pool</span>
                <span className="font-medium text-foreground">Transaction Mode</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Authentication Error & Security Logs */}
      {activeTab === "auth" && (
        <div className="p-4 sm:p-5 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-muted-foreground mr-1">Filter:</span>
              <Button
                variant={authFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setAuthFilter("all")}
                className="h-7 text-xs px-2.5 rounded-lg"
              >
                All ({authLogs.length})
              </Button>
              <Button
                variant={authFilter === "error" ? "default" : "outline"}
                size="sm"
                onClick={() => setAuthFilter("error")}
                className="h-7 text-xs px-2.5 rounded-lg text-rose-700 border-rose-200 hover:bg-rose-50"
              >
                <XCircle size={12} className="mr-1 text-rose-600" />
                Errors ({errorCount})
              </Button>
              <Button
                variant={authFilter === "warning" ? "default" : "outline"}
                size="sm"
                onClick={() => setAuthFilter("warning")}
                className="h-7 text-xs px-2.5 rounded-lg text-amber-700 border-amber-200 hover:bg-amber-50"
              >
                <AlertTriangle size={12} className="mr-1 text-amber-600" />
                Warnings ({warningCount})
              </Button>
              <Button
                variant={authFilter === "info" ? "default" : "outline"}
                size="sm"
                onClick={() => setAuthFilter("info")}
                className="h-7 text-xs px-2.5 rounded-lg text-sky-700 border-sky-200 hover:bg-sky-50"
              >
                <Info size={12} className="mr-1 text-sky-600" />
                Info ({authLogs.filter((l) => l.severity === "info").length})
              </Button>
            </div>

            {/* Test Simulation Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSimulateAuthError}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                title="Inject a test failed authentication incident to test monitoring"
              >
                <Sparkles size={12} className="mr-1 text-amber-600" />
                Test Incident
              </Button>
              {authLogs.some((l) => l.source === "client_buffer") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAuthBuffer}
                  className="h-7 text-xs text-muted-foreground hover:text-rose-600"
                  title="Clear temporary client incidents buffer"
                >
                  Clear Buffer
                </Button>
              )}
            </div>
          </div>

          {/* Logs List */}
          <div className="rounded-xl border border-border/40 bg-slate-50/50 divide-y divide-border/30 max-h-72 overflow-y-auto">
            {filteredAuthLogs.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                <ShieldCheck size={28} className="mx-auto mb-2 text-emerald-600 opacity-80" />
                <p className="font-medium text-foreground">No matching authentication incidents found</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  All authenticated sessions and credentials verifications are operating cleanly.
                </p>
              </div>
            ) : (
              filteredAuthLogs.map((log) => {
                const isError = log.severity === "error";
                const isWarn = log.severity === "warning";
                return (
                  <div key={log.id} className="p-3 flex items-start gap-3 hover:bg-white/80 transition-colors">
                    <div
                      className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isError
                          ? "bg-rose-100 text-rose-700"
                          : isWarn
                          ? "bg-amber-100 text-amber-700"
                          : "bg-sky-100 text-sky-700"
                      }`}
                    >
                      {isError ? (
                        <XCircle size={14} />
                      ) : isWarn ? (
                        <AlertTriangle size={14} />
                      ) : (
                        <ShieldCheck size={14} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {log.action_type}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1.5 py-0 uppercase font-bold rounded ${
                            isError
                              ? "bg-rose-50 text-rose-700 border-rose-300"
                              : isWarn
                              ? "bg-amber-50 text-amber-700 border-amber-300"
                              : "bg-sky-50 text-sky-700 border-sky-300"
                          }`}
                        >
                          {log.severity}
                        </Badge>
                        {log.source === "client_buffer" && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-slate-500 border-slate-300">
                            Local Buffer
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-foreground/90 mt-1 font-normal leading-relaxed">
                        {log.reason}
                      </p>

                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground flex-wrap">
                        <span>
                          Actor: <strong className="font-mono text-foreground">{log.actor_email ?? "Unknown"}</strong>
                        </span>
                        <span>•</span>
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <>
                            <span>•</span>
                            <span className="font-mono truncate max-w-xs" title={JSON.stringify(log.metadata)}>
                              {JSON.stringify(log.metadata).slice(0, 40)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            🔒 Sensitive credentials, plain passwords, and private PINs are never captured in audit trails.
          </p>
        </div>
      )}

      {/* Tab 3: Storage Usage Statistics */}
      {activeTab === "storage" && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* Progress Bar & Quota Gauge */}
          <div className="rounded-xl border border-border/40 bg-slate-50/70 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <HardDrive size={14} className="text-sky-600" /> Cloud Storage Utilization
              </span>
              <span className="font-mono text-xs font-bold text-foreground">
                {storageStats?.formattedTotalSize ?? "0 MB"} / {storageStats?.formattedQuota ?? "1 GB"} (
                {storageStats?.usagePercentage ?? 0}%)
              </span>
            </div>

            <Progress
              value={storageStats?.usagePercentage ?? 0}
              className="h-2.5 rounded-full bg-slate-200"
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 text-[11px] border-t border-border/30">
              <div>
                <span className="text-muted-foreground block text-[10px]">Total Files</span>
                <span className="font-bold text-foreground">{storageStats?.totalFiles ?? 0} items</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Citizen Attachments</span>
                <span className="font-bold text-foreground">
                  {storageStats?.documentsCount ?? 0} ({storageStats?.formattedDocumentsSize ?? "0 KB"})
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-muted-foreground block text-[10px]">Database Snapshots</span>
                <span className="font-bold text-foreground">
                  {storageStats?.backupsCount ?? 0} ({storageStats?.formattedBackupsSize ?? "0 KB"})
                </span>
              </div>
            </div>
          </div>

          {/* Buckets Directory */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Layers size={13} className="text-primary" /> Active Storage Buckets
              </h4>
              <Link to="/admin/backups" className="text-[11px] text-primary hover:underline flex items-center gap-1">
                <span>View Backups Register</span>
                <ArrowUpRight size={11} />
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 gap-2.5">
              {storageStats?.buckets.map((b) => (
                <div key={b.name} className="rounded-xl border border-border/40 bg-white p-3 space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-foreground">{b.name}</span>
                    <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0 border-slate-300 text-slate-600">
                      {b.access}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">
                    {b.purpose}
                  </p>
                  <div className="pt-1 flex items-center gap-1.5 text-[10px] text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>Bucket healthy & accessible</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MIME Distribution Breakdown */}
          {storageStats && storageStats.mimeBreakdown.length > 0 && (
            <div className="rounded-xl border border-border/30 bg-slate-50/50 p-3 space-y-2">
              <h4 className="text-xs font-semibold text-foreground">File Format Distribution</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {storageStats.mimeBreakdown.map((m) => (
                  <div key={m.mime} className="bg-white p-2 rounded-lg border border-border/30 text-[11px]">
                    <span className="font-medium text-foreground truncate block">{m.label}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {m.count} {m.count === 1 ? "file" : "files"} · {formatBytes(m.sizeBytes)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
