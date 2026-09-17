import { useCallback, useEffect, useRef, useState } from "react";

export type AutoSaveState = "idle" | "saving" | "saved" | "error";

/**
 * Debounced auto-save. Persists whenever `value` changes and on unmount,
 * so a DEO can never lose typed data by navigating away or reloading.
 */
export function useAutoSave<T>(
  value: T,
  save: (value: T) => Promise<void>,
  { enabled = true, delay = 1500 }: { enabled?: boolean; delay?: number } = {},
) {
  const [state, setState] = useState<AutoSaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const latest = useRef(value);
  const saveRef = useRef(save);
  const firstRun = useRef(true);

  const hasUnsavedChanges = useRef(false);
  const isSaving = useRef(false);
  const pendingSave = useRef(false);

  // Track if the component is mounted to prevent setState on unmounted components
  const isMounted = useRef(true);

  latest.current = value;
  saveRef.current = save;

  const performSave = useCallback(async () => {
    if (isSaving.current) {
      pendingSave.current = true;
      return;
    }

    isSaving.current = true;
    if (isMounted.current) {
      setState("saving");
    }

    try {
      do {
        pendingSave.current = false;
        const dataToSave = latest.current;

        await saveRef.current(dataToSave);

        // If data didn't change while we were saving, clear the unsaved flag
        if (latest.current === dataToSave) {
          hasUnsavedChanges.current = false;
        }
      } while (pendingSave.current);

      if (isMounted.current) {
        setState("saved");
        setLastSavedAt(new Date());
      }
    } catch {
      if (isMounted.current) {
        setState("error");
      }
    } finally {
      isSaving.current = false;
    }
  }, []);

  const flush = useCallback(async () => {
    await performSave();
  }, [performSave]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }

    hasUnsavedChanges.current = true;

    const t = setTimeout(() => {
      void flush();
    }, delay);

    return () => clearTimeout(t);
  }, [value, enabled, delay, flush]);

  useEffect(() => {
    return () => {
      // Async requests initiated in a cleanup function can successfully reach the
      // server before the tab is closed, or run fully if it's just a SPA navigation.
      if (hasUnsavedChanges.current && enabled) {
        void flush();
      }
    };
  }, [enabled, flush]);

  return { state, lastSavedAt, flush };
}
