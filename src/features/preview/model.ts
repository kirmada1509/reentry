import { z } from "zod";
import { useSyncExternalStore } from "react";

export const scenarios = {
  changed: "Changed instructions",
  active: "Active task",
  waiting: "Interrupted / waiting",
  candidate: "Possible task",
  completed: "Completion observed",
  empty: "First visit",
  observing: "Observing, no clear task",
  unavailable: "Model unavailable",
  offline: "App disconnected",
  paused: "Paused",
  denied: "Site access denied",
  snoozed: "Reminder snoozed",
} as const;
const stateSchema = z.object({
  scenario: z.enum(
    Object.keys(scenarios) as [
      keyof typeof scenarios,
      ...(keyof typeof scenarios)[],
    ],
  ),
  title: z.string().trim().min(1).max(180),
  research: z.boolean(),
});
type PreviewState = z.infer<typeof stateSchema> & {
  view: "home" | "companion" | "detail";
  storage: "saved" | "tab-only";
};
const initial: PreviewState = {
  scenario: "changed",
  title: "Finish your Northstar application",
  research: false,
  view: "home",
  storage: "saved",
};
const key = "reentry.fictional-preview.v1";
let state = initial;
let hydrated = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!hydrated) {
    hydrated = true;
    queueMicrotask(() => {
      try {
        const saved: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
        const parsed = stateSchema.safeParse(saved);
        if (parsed.success) state = { ...state, ...parsed.data };
      } catch {
        state = { ...state, storage: "tab-only" };
      }
      const view = new URLSearchParams(location.search).get("view");
      if (view === "companion" || view === "detail") state = { ...state, view };
      emit();
    });
  }
  return () => {
    listeners.delete(listener);
  };
}
export function usePreview() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => initial,
  );
}
export function changePreview(
  patch: Partial<
    Pick<PreviewState, "scenario" | "title" | "research" | "view">
  >,
) {
  const next = { ...state, ...patch };
  const parsed = stateSchema.parse(next);
  try {
    localStorage.setItem(key, JSON.stringify(parsed));
    next.storage = "saved";
  } catch {
    next.storage = "tab-only";
  }
  state = next;
  emit();
}
export function resetPreview() {
  changePreview({ ...initial, view: state.view });
}
export function previewCopy(scenario: keyof typeof scenarios) {
  const completed = scenario === "completed";
  const changed = scenario === "changed";
  return {
    status: scenarios[scenario],
    completed,
    changed,
    next: completed
      ? "Your fictional application is submitted. You can leave it here."
      : changed
        ? "Add the additional referee, then review your application."
        : "Finish your statement, then review your application.",
    progress: completed
      ? "A matching submission confirmation was observed in this example."
      : "Your draft and sample transcript are saved in this example.",
    finish: "A submission confirmation for this application is visible.",
  };
}
