import { toast } from "sonner";

export type NotificationLevel = "success" | "error" | "warning" | "info";

export interface NotificationEntry {
  id: string;
  level: NotificationLevel;
  title: string;
  description?: string;
  createdAt: number;
  read: boolean;
}

const STORAGE_KEY = "bgl.notifications.v1";
const MAX_ENTRIES = 50;

type Listener = (items: NotificationEntry[]) => void;
const listeners = new Set<Listener>();

function load(): NotificationEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let items: NotificationEntry[] = load();

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore quota errors
  }
}

function emit() {
  persist();
  listeners.forEach((fn) => fn(items));
}

function push(level: NotificationLevel, title: string, description?: string) {
  const entry: NotificationEntry = {
    id: `n_${Date.now()}_${crypto.randomUUID()}`,
    level,
    title,
    description,
    createdAt: Date.now(),
    read: false,
  };
  items = [entry, ...items].slice(0, MAX_ENTRIES);
  emit();
  const opts = description ? { description } : undefined;
  if (level === "success") toast.success(title, opts);
  else if (level === "error") toast.error(title, opts);
  else if (level === "warning") toast.warning(title, opts);
  else toast(title, opts);
  return entry;
}

export const notificationEngine = {
  info: (title: string, description?: string) => push("info", title, description),
  success: (title: string, description?: string) => push("success", title, description),
  warning: (title: string, description?: string) => push("warning", title, description),
  error: (title: string, description?: string) => push("error", title, description),
  list: () => items.slice(),
  unreadCount: () => items.filter((i) => !i.read).length,
  markAllRead: () => {
    items = items.map((i) => ({ ...i, read: true }));
    emit();
  },
  markRead: (id: string) => {
    items = items.map((i) => (i.id === id ? { ...i, read: true } : i));
    emit();
  },
  clear: () => {
    items = [];
    emit();
  },
  subscribe(fn: Listener) {
    listeners.add(fn);
    fn(items);
    return () => {
      listeners.delete(fn);
    };
  },
};