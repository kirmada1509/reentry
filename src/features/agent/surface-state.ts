import type { AgentView } from "./schema";

/** Ignore late reads after a user change; coalesce polling rather than racing it. */
export class SurfaceRequests {
  private version = 0;
  private reading: number | null = null;
  private changing: number | null = null;
  private closed = false;
  open() {
    this.closed = false;
  }
  close() {
    this.closed = true;
    this.version++;
    this.reading = null;
    this.changing = null;
  }
  read() {
    if (this.closed || this.reading !== null || this.changing !== null)
      return null;
    this.reading = ++this.version;
    return this.reading;
  }
  change() {
    if (this.closed || this.changing !== null) return null;
    this.changing = ++this.version;
    return this.changing;
  }
  current(ticket: number) {
    return !this.closed && ticket === this.version;
  }
  finishRead(ticket: number) {
    if (this.reading === ticket) this.reading = null;
    return this.current(ticket);
  }
  finishChange(ticket: number) {
    if (this.changing === ticket) this.changing = null;
  }
}

/** Presentation can wait for focus to leave; deletion/revocation never waits. */
export class TaskPresentation {
  private latest: AgentView | null = null;
  private displayed: AgentView | null = null;
  receive(incoming: AgentView, focused: boolean, force = false) {
    this.latest = incoming;
    if (!focused || force || !this.displayed) {
      this.displayed = incoming;
      return { view: incoming, pending: false };
    }
    const surviving = new Set(incoming.tasks.map((t) => t.id));
    const tasks = this.displayed.tasks.filter((t) => surviving.has(t.id));
    const items = this.displayed.recovery.items.filter((r) =>
      surviving.has(r.taskId),
    );
    const pending =
      JSON.stringify(tasks) !== JSON.stringify(incoming.tasks) ||
      JSON.stringify(items) !== JSON.stringify(incoming.recovery.items);
    this.displayed = {
      ...incoming,
      tasks,
      recovery: { ...incoming.recovery, items },
    };
    return { view: this.displayed, pending };
  }
  release() {
    this.displayed = this.latest;
    return { view: this.latest, pending: false };
  }
  clear() {
    this.latest = null;
    this.displayed = null;
    return { view: null, pending: false };
  }
}
