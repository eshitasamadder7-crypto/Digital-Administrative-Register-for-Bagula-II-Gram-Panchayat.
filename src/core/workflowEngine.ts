import { canTransition, type AppStatus } from "./appState";

/** Lightweight placeholder. Existing certificate pages continue to use their own status columns. */
export const workflowEngine = {
  canTransition,
  next(from: AppStatus, candidates: AppStatus[]): AppStatus | null {
    return candidates.find((c) => canTransition(from, c)) ?? null;
  },
};