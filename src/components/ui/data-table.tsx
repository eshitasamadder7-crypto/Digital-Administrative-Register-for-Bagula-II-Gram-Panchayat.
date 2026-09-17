import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown, Search, ChevronLeft, ChevronRight, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DataColumn<T> {
  key: string;
  header: ReactNode;
  accessor: (row: T) => unknown;
  cell?: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
}

export interface DataFilter {
  key: string;
  label: string;
  options: { label: string; value: string }[];
}

interface DataTableProps<T> {
  data: T[];
  columns: DataColumn<T>[];
  rowKey: (row: T) => string;
  searchPlaceholder?: string;
  searchable?: (row: T) => string;
  pageSize?: number;
  filters?: DataFilter[];
  filterValue?: (row: T, key: string) => string;
  actions?: (row: T) => ReactNode;
  emptyState?: ReactNode;
  loading?: boolean;
  maxHeight?: string;
}

type SortState = { key: string; dir: "asc" | "desc" } | null;

export function DataTable<T>({
  data,
  columns,
  rowKey,
  searchPlaceholder = "Search…",
  searchable,
  pageSize = 10,
  filters,
  filterValue,
  actions,
  emptyState,
  loading,
  maxHeight = "60vh",
}: DataTableProps<T>) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(1);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let out = data;
    if (q && searchable) {
      const needle = q.toLowerCase();
      out = out.filter((r) => searchable(r).toLowerCase().includes(needle));
    }
    if (filters && filterValue) {
      for (const [k, v] of Object.entries(activeFilters)) {
        if (!v) continue;
        out = out.filter((r) => filterValue(r, k) === v);
      }
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col) {
        const dir = sort.dir === "asc" ? 1 : -1;
        out = [...out].sort((a, b) => {
          const av = col.accessor(a);
          const bv = col.accessor(b);
          if (av == null && bv == null) return 0;
          if (av == null) return 1;
          if (bv == null) return -1;
          if (av < bv) return -1 * dir;
          if (av > bv) return 1 * dir;
          return 0;
        });
      }
    }
    return out;
  }, [data, q, sort, activeFilters, columns, filters, filterValue, searchable]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (key: string) => {
    setSort((s) =>
      s?.key !== key ? { key, dir: "asc" } : s.dir === "asc" ? { key, dir: "desc" } : null,
    );
    setPage(1);
  };

  const hasFilters = filters && filters.length > 0;
  const activeCount = Object.values(activeFilters).filter(Boolean).length;

  return (
    <div className="rounded-2xl border border-border/40 bg-white/80 backdrop-blur-sm overflow-hidden shadow-sm">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 border-b border-border/40 bg-muted/30">
        {searchable && (
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder={searchPlaceholder}
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-border/50 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        )}
        {hasFilters && (
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-border/50 hover:bg-muted transition",
              activeCount > 0 && "border-primary/40 text-primary bg-primary/5",
            )}
          >
            <Filter size={13} /> Filters{activeCount > 0 && ` (${activeCount})`}
          </button>
        )}
        <div className="ml-auto text-[11px] text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "row" : "rows"}
        </div>
      </div>

      {hasFilters && showFilters && (
        <div className="flex flex-wrap gap-3 px-3 py-2.5 border-b border-border/40 bg-muted/10">
          {filters!.map((f) => (
            <label key={f.key} className="text-xs flex items-center gap-1.5">
              <span className="text-muted-foreground">{f.label}:</span>
              <select
                value={activeFilters[f.key] ?? ""}
                onChange={(e) => { setActiveFilters((s) => ({ ...s, [f.key]: e.target.value })); setPage(1); }}
                className="px-2 py-1 rounded border border-border/50 bg-background text-xs"
              >
                <option value="">All</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
          ))}
          {activeCount > 0 && (
            <button
              onClick={() => setActiveFilters({})}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>
      )}

      <div className="overflow-auto" style={{ maxHeight }}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/70 backdrop-blur-sm">
            <tr>
              {columns.map((c) => {
                const isSorted = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    className={cn(
                      "text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground px-3 py-2 border-b border-border/40",
                      c.headerClassName,
                    )}
                  >
                    {c.sortable ? (
                      <button
                        onClick={() => toggleSort(c.key)}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        {c.header}
                        {!isSorted && <ChevronsUpDown size={12} className="opacity-50" />}
                        {isSorted && sort!.dir === "asc" && <ChevronUp size={12} />}
                        {isSorted && sort!.dir === "desc" && <ChevronDown size={12} />}
                      </button>
                    ) : c.header}
                  </th>
                );
              })}
              {actions && (
                <th className="text-right font-semibold text-xs uppercase tracking-wide text-muted-foreground px-3 py-2 border-b border-border/40">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length + (actions ? 1 : 0)} className="px-3 py-10 text-center text-xs text-muted-foreground">Loading…</td></tr>
            ) : pageRows.length === 0 ? (
              <tr><td colSpan={columns.length + (actions ? 1 : 0)} className="px-3 py-10 text-center text-xs text-muted-foreground">{emptyState ?? "No records found."}</td></tr>
            ) : (
              pageRows.map((r) => (
                <tr key={rowKey(r)} className="hover:bg-muted/30 transition-colors border-b border-border/20 last:border-0">
                  {columns.map((c) => (
                    <td key={c.key} className={cn("px-3 py-2.5 align-top", c.className)}>
                      {c.cell ? c.cell(r) : (c.accessor(r) as ReactNode)}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex gap-1.5 flex-wrap justify-end">{actions(r)}</div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > pageSize && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-border/40 bg-muted/20 text-xs">
          <span className="text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded hover:bg-muted disabled:opacity-40"
              aria-label="Previous page"
            ><ChevronLeft size={14} /></button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded hover:bg-muted disabled:opacity-40"
              aria-label="Next page"
            ><ChevronRight size={14} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;