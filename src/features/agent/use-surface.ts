"use client";
import { useCallback, useEffect, useState } from "react";
import type { AgentView } from "./schema";
import { SurfaceRequests, TaskPresentation } from "./surface-state";

export function focusedTask() {
  if (!document.hasFocus() || document.visibilityState !== "visible")
    return null;
  return (
    document.activeElement?.closest("[data-task-card],[data-task-owner]") ??
    null
  );
}
export function useAgentSurface() {
  const [requests] = useState(() => new SurfaceRequests());
  const [presentation] = useState(() => new TaskPresentation());
  const [state, setState] = useState<{
    view: AgentView | null;
    pending: boolean;
  }>({ view: null, pending: false });
  useEffect(() => {
    requests.open();
    return () => requests.close();
  }, [requests]);
  const accept = useCallback(
    (view: AgentView, force = false) => {
      setState(presentation.receive(view, Boolean(focusedTask()), force));
    },
    [presentation],
  );
  const clear = useCallback(
    () => setState(presentation.clear()),
    [presentation],
  );
  const release = useCallback(() => {
    queueMicrotask(() => {
      if (!focusedTask()) setState(presentation.release());
    });
  }, [presentation]);
  useEffect(() => {
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", release);
    return () => {
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", release);
    };
  }, [release]);
  return {
    data: state.view,
    pending: state.pending,
    accept,
    clear,
    release,
    requests,
  };
}
