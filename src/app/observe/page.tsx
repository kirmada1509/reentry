"use client";

import Link from "next/link";
import { cloneElement, useCallback, useEffect, useState } from "react";
import TypographyH1 from "@/components/typography-h1";
import TypographyLead from "@/components/typography-lead";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  agentBridge,
  createObservationChallenge,
  loadObservationDashboard,
  observationWeb,
} from "@/features/observation/client";
import type { ObservationDashboard } from "@/features/observation/protocol";

export default function ObservePage() {
  const [data, setData] = useState<ObservationDashboard | null>(null);
  const [error, setError] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [recent, setRecent] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const loaded = await loadObservationDashboard();
      setData(loaded);
      setConnectionError("");
      setRecent(
        Boolean(
          loaded.lastSeen && Date.now() - Date.parse(loaded.lastSeen) < 90_000,
        ),
      );
    } catch {
      setConnectionError(
        "The local app is unavailable. Your last displayed observations may be out of date.",
      );
    }
  }, []);
  useEffect(() => {
    void Promise.resolve().then(refresh);
    const timer = setInterval(() => {
      void refresh();
    }, 5000);
    return () => clearInterval(timer);
  }, [refresh]);
  async function run(operation: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await operation();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setBusy(false);
    }
  }
  const state = !data
    ? "Loading"
    : !data.paired
      ? "Not connected"
      : data.session?.paused
        ? "Paused"
        : !data.session
          ? "Choose a site"
          : !recent
            ? "Connection unavailable"
            : "Browser connected · site access enabled";
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6 wrap-anywhere">
      <nav className="flex flex-wrap gap-2" aria-label="ReEntry">
        <Button variant="ghost" asChild>
          <Link href="/">Saved checkpoints</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/preview">Design preview</Link>
        </Button>
      </nav>
      <header className="flex flex-col gap-2">
        {cloneElement(TypographyH1(), {}, "A little less to remember.")}
        {cloneElement(
          TypographyLead(),
          {},
          "Let ReEntry notice where you are, on the sites you choose.",
        )}
        <div role="status" aria-live="polite">
          <Badge variant="secondary">{state}</Badge>
        </div>
      </header>
      {(error || connectionError) && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Needs attention</AlertTitle>
          <AlertDescription>{error || connectionError}</AlertDescription>
        </Alert>
      )}
      {message && (
        <Alert role="status">
          <AlertTitle>Connection update</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Browser companion</CardTitle>
          <CardDescription>
            Automatic page observation is ready to try. Understanding tasks and
            choosing completion checkpoints comes in the next phase.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p>
            Only enabled sites are read. Page text and whether ordinary form
            fields are filled stay on this computer for up to 24 hours, with a
            maximum of 1,000 updates. No model receives these observations in
            this phase.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  if (data?.paired)
                    await agentBridge({ version: 1, type: "agent.open" });
                  else
                    await agentBridge({
                      version: 1,
                      type: "agent.pair",
                      challenge: await createObservationChallenge(),
                    });
                  setMessage(
                    "Continue in the extension companion. Connect, then choose which sites ReEntry can observe.",
                  );
                })
              }
            >
              {data?.paired ? "Open companion" : "Connect browser"}
            </Button>
            {data?.session && !data.session.paused && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await observationWeb("pause");
                    await agentBridge({ version: 1, type: "agent.sync" }).catch(
                      () => undefined,
                    );
                    setMessage(
                      "Delivery is paused. Open the companion to resume; a disconnected browser reconciles on its next connection.",
                    );
                  })
                }
              >
                Pause observation
              </Button>
            )}
          </div>
          {data?.session && (
            <p>
              Site access:{" "}
              {data.session.scope.allSites
                ? "All normal websites"
                : data.session.scope.origins.join(", ")}
              . You can change this in the companion.
            </p>
          )}
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost">What is read and how to open it</Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="flex flex-col gap-3 pt-3">
              <p>
                Passwords, payment inputs, hidden tokens, editable answers and
                private-marked regions are excluded by the reader. Ordinary page
                text can still contain personal information; choose sites
                carefully. Frames, browser settings pages and the ReEntry app
                are excluded.
              </p>
              <p>
                Load extension/.output/chrome-mv3 in Chrome’s Extensions page
                after starting the app. Use Command+Shift+U on Mac or
                Ctrl+Shift+U to open the native side panel. Chrome may let you
                change shortcuts. The toolbar capture action still works.
              </p>
              <p>
                Closing this app tab does not stop observations. The local
                server must keep running. During an outage, the extension
                buffers up to 100 updates or 1 MB and retries when reconnected.
                Replacing the pairing disconnects the previous browser profile.
              </p>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
      <section className="flex flex-col gap-4" aria-label="Recent observations">
        <Card>
          <CardHeader>
            <CardTitle>Recently noticed</CardTitle>
            <CardDescription>
              Observed page evidence, without AI conclusions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              {data?.observations.length
                ? `${data.observations.length} recent updates shown.`
                : "Nothing observed yet. Enable a site in the companion, then browse it normally."}
            </p>
            {data?.paired && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await agentBridge({
                      version: 1,
                      type: "agent.pair",
                      challenge: await createObservationChallenge(),
                    });
                    setMessage(
                      "Connect again in the companion. This replaces the previous browser pairing.",
                    );
                  })
                }
              >
                Reconnect browser
              </Button>
            )}
          </CardContent>
        </Card>
        {data?.observations.map((event) => (
          <Card key={event.eventId}>
            <CardHeader>
              <CardTitle>{event.page.title || "Untitled page"}</CardTitle>
              <CardDescription>
                {event.page.origin} ·{" "}
                {new Date(event.observedAt).toLocaleTimeString()} ·{" "}
                {event.reason === "submit-attempt"
                  ? "Submission attempted; success is unverified"
                  : event.reason.replaceAll("-", " ")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="outline">Inspect observed evidence</Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="flex flex-col gap-3 pt-3">
                  <p>{event.page.content}</p>
                  {event.page.fields.map((field, i) => (
                    <p key={i}>
                      {field.label}: {field.present ? "filled" : "empty"}
                    </p>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        ))}
      </section>
      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" disabled={busy || !data?.paired}>
            Disconnect and clear observations
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect this browser?</DialogTitle>
            <DialogDescription>
              This stops delivery and removes observed page text from the local
              app. Saved manual checkpoints stay available. Queued events from
              the revoked connection cannot recreate this data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Keep connection</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await observationWeb("clear");
                  await agentBridge({ version: 1, type: "agent.sync" }).catch(
                    () => undefined,
                  );
                  setClearOpen(false);
                  setMessage("Disconnected. Observed page data was cleared.");
                })
              }
            >
              Disconnect and clear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
