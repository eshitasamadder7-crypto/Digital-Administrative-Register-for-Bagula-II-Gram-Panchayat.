import React, { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Search,
  Pin,
  Calendar,
  Download,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Tag,
} from "lucide-react";
import {
  getActiveNotices,
  Notice,
  NoticeCategory,
} from "@/services/noticeService";

export function CitizenNoticeBoard() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);

  const categories = [
    { id: "all", label: "All Notices" },
    { id: "birth_death", label: "Birth & Death" },
    { id: "meetings", label: "Meetings & Sabha" },
    { id: "tax", label: "Property Tax" },
    { id: "schemes", label: "Schemes & NREGA" },
    { id: "tenders", label: "Tenders & Quotations" },
    { id: "general", label: "General Orders" },
  ];

  const loadNotices = useCallback(async () => {
    setLoading(true);
    try {
      const items = await getActiveNotices(selectedCategory === "all" ? undefined : selectedCategory);
      setNotices(items);
    } catch (err) {
      console.error("Failed to load notices:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  const filteredNotices = notices.filter((n) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      n.title.toLowerCase().includes(q) ||
      (n.notice_no && n.notice_no.toLowerCase().includes(q)) ||
      n.content.toLowerCase().includes(q) ||
      n.category.toLowerCase().includes(q)
    );
  });

  const pinnedNotices = filteredNotices.filter((n) => n.is_pinned);
  const regularNotices = filteredNotices.filter((n) => !n.is_pinned);

  const formatNoticeDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return isoStr;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
            <AlertCircle size={11} />
            <span>URGENT</span>
          </span>
        );
      case "high":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <span>HIGH PRIORITY</span>
          </span>
        );
      default:
        return null;
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "birth_death":
        return "Birth & Death";
      case "meetings":
        return "Meeting / Sansad";
      case "tax":
        return "Property Tax";
      case "schemes":
        return "Welfare Scheme";
      case "tenders":
        return "Tender Notice";
      default:
        return "Public Notice";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with live count & refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell size={22} className="text-primary" />
            <span>Notices & Official Announcements</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Official government gazette, meeting resolutions, public orders, and deadline circulars from Bagula II GP.
          </p>
        </div>

        <button
          type="button"
          onClick={loadNotices}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/80 hover:bg-white text-muted-foreground hover:text-foreground border border-border/50 rounded-xl transition-all shrink-0 self-start sm:self-auto"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          <span>Refresh Notices</span>
        </button>
      </div>

      {/* Search & Categories */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            aria-label="Search official notices"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notices by keyword, memo number, or subject..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/90 border border-border/60 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-muted-foreground/60"
          />
        </div>

        {/* Categories horizontal scroll */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                  : "bg-white/70 hover:bg-white text-muted-foreground hover:text-foreground border border-border/40"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pinned & Urgent Notices Section */}
      {pinnedNotices.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
            <Pin size={13} />
            <span>Pinned Announcements</span>
          </div>

          <div className="grid gap-3">
            {pinnedNotices.map((notice) => (
              <div
                key={notice.id}
                className="rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-primary/5 border border-amber-400/40 p-5 shadow-sm space-y-3 relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                        <Pin size={10} />
                        PINNED
                      </span>
                      {getPriorityBadge(notice.priority)}
                      <span className="text-[10px] font-medium text-muted-foreground bg-white/80 px-2 py-0.5 rounded-full border border-border/40">
                        {getCategoryLabel(notice.category)}
                      </span>
                      {notice.notice_no && (
                        <span className="text-[10px] font-mono font-medium text-muted-foreground">
                          Memo: {notice.notice_no}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-foreground leading-snug">
                      {notice.title}
                    </h3>
                  </div>

                  <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1 shrink-0">
                    <Calendar size={12} />
                    {formatNoticeDate(notice.published_at)}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground/90 leading-relaxed line-clamp-3">
                  {notice.content}
                </p>

                <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[11px] text-muted-foreground">
                    Issued by: <strong className="text-foreground">{notice.created_by_name || "Gram Panchayat Office"}</strong>
                  </span>

                  <button
                    type="button"
                    onClick={() => setSelectedNotice(notice)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <span>Read Full Circular</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regular Notices List */}
      <div className="space-y-3">
        {pinnedNotices.length > 0 && regularNotices.length > 0 && (
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider pt-2">
            <FileText size={13} />
            <span>Recent Official Notices</span>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-white/60 border border-border/40 p-8 text-center space-y-2">
            <RefreshCw size={24} className="animate-spin text-primary mx-auto" />
            <p className="text-xs text-muted-foreground">Fetching official notices from Gram Panchayat servers...</p>
          </div>
        ) : filteredNotices.length === 0 ? (
          <div className="rounded-2xl bg-white/60 border border-border/40 p-8 text-center space-y-2">
            <Bell size={32} className="text-muted-foreground/30 mx-auto" />
            <p className="text-sm font-semibold text-foreground">No notices found</p>
            <p className="text-xs text-muted-foreground">
              No active announcements match your search or filter criteria. Check back soon.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {regularNotices.map((notice) => (
              <div
                key={notice.id}
                className="rounded-2xl bg-white/80 backdrop-blur-sm border border-border/50 hover:border-border/80 shadow-sm p-4 sm:p-5 transition-all space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getPriorityBadge(notice.priority)}
                      <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        {getCategoryLabel(notice.category)}
                      </span>
                      {notice.notice_no && (
                        <span className="text-[10px] font-mono text-muted-foreground">
                          Memo: {notice.notice_no}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm sm:text-base font-semibold text-foreground leading-snug">
                      {notice.title}
                    </h3>
                  </div>

                  <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1 shrink-0">
                    <Calendar size={12} />
                    {formatNoticeDate(notice.published_at)}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2">
                  {notice.content}
                </p>

                <div className="pt-1 flex items-center justify-between gap-2 flex-wrap border-t border-border/30">
                  <span className="text-[11px] text-muted-foreground">
                    Issued by: {notice.created_by_name || "Gram Panchayat Office"}
                  </span>

                  <button
                    type="button"
                    onClick={() => setSelectedNotice(notice)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <span>Read Details</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full Notice Modal / Circular Viewer */}
      {selectedNotice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedNotice(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-border p-6 sm:p-8 space-y-6 text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Official Letterhead Header */}
            <div className="border-b-2 border-primary/30 pb-4 text-center space-y-1">
              <span className="text-2xl">🏛️</span>
              <h3 className="text-base sm:text-lg font-bold uppercase tracking-wide text-primary">
                Bagula II Gram Panchayat
              </h3>
              <p className="text-xs text-muted-foreground">
                Vill: Stationpara, P.O.: Bagula, P.S.: Hanskhali, Dist: Nadia, PIN: 741502, West Bengal
              </p>
              <p className="text-[11px] font-semibold text-primary/80">
                GOVERNMENT OF WEST BENGAL • DEPARTMENT OF PANCHAYATS & RURAL DEVELOPMENT
              </p>
            </div>

            {/* Memo & Meta Details */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs gap-2 bg-muted/30 p-3 rounded-xl">
              <div>
                <strong>Notice Memo No:</strong> {selectedNotice.notice_no || "B-II/GP/GEN/2026/OFFICIAL"}
              </div>
              <div>
                <strong>Date of Issue:</strong> {formatNoticeDate(selectedNotice.published_at)}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {getPriorityBadge(selectedNotice.priority)}
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">
                  {getCategoryLabel(selectedNotice.category)}
                </span>
                {selectedNotice.is_pinned && (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                    PINNED NOTICE
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground leading-snug">
                {selectedNotice.title}
              </h2>
            </div>

            {/* Body */}
            <div className="space-y-3 text-sm text-foreground/90 leading-relaxed whitespace-pre-line border-y border-border/40 py-4">
              {selectedNotice.content}
            </div>

            {/* Sign-off / Authority Footer */}
            <div className="flex items-end justify-between pt-2">
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>Audience: <strong>{selectedNotice.target_audience.toUpperCase()}</strong></p>
                <p>Public Facilitation Desk, Bagula II GP</p>
              </div>

              <div className="text-right text-xs">
                <p className="font-bold text-foreground">{selectedNotice.created_by_name || "Executive Authority"}</p>
                <p className="text-muted-foreground">Bagula II Gram Panchayat</p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition-colors"
              >
                Print Notice
              </button>
              <button
                type="button"
                onClick={() => setSelectedNotice(null)}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
