import { cloneElement, useCallback, useEffect, useState } from "react";
import { browser } from "wxt/browser";
import TypographyH1 from "@reentry/components/typography-h1";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@reentry/components/ui/alert";
import { Badge } from "@reentry/components/ui/badge";
import { Button } from "@reentry/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@reentry/components/ui/card";
import { Checkbox } from "@reentry/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@reentry/components/ui/collapsible";
import { Input } from "@reentry/components/ui/input";
import { Label } from "@reentry/components/ui/label";
import {
  companionStatusSchema,
  scopeSchema,
} from "@reentry/features/observation/protocol";
import type {
  CompanionStatus,
  ObservationScope,
} from "@reentry/features/observation/protocol";
import { TaskFeed } from "@reentry/features/agent/task-feed";
import { agentViewSchema } from "@reentry/features/agent/schema";
import type { AgentView, AgentAction } from "@reentry/features/agent/schema";
import { sendMessage } from "../../lib/messages";

const problems = {
  none: "",
  offline:
    "The local app is unavailable. Updates remain queued until it reconnects.",
  revoked:
    "This connection was disconnected or replaced. Connect again from the app.",
  storage:
    "Browser storage failed. Recent changes may not have been saved. Free storage and retry.",
  capacity:
    "The pending queue is full. Some updates could not be saved; review the page after reconnecting.",
  permission: "Site access was removed. Choose the site again before resuming.",
  reader:
    "A page could not be read safely. Large pages, embedded frames and some layouts are unsupported.",
};
export default function CompanionPage() {
  const [tasks, setTasks] = useState<AgentView | null>(null);
  const [status, setStatus] = useState<CompanionStatus | null>(null);
  const [origin, setOrigin] = useState("");
  const [allSites, setAllSites] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const status = companionStatusSchema.parse(
        await sendMessage("agentStatus", undefined),
      );
      setStatus(status);
      if (status.paired)
        setTasks(
          agentViewSchema.parse(await sendMessage("agentTasks", undefined)),
        );
      setConnectionError("");
    } catch {
      setConnectionError(
        "Could not refresh ReEntry. Check the local app and extension, then retry. Last shown tasks may be out of date.",
      );
    }
  }, []);
  useEffect(() => {
    void Promise.resolve().then(refresh);
    void browser.tabs
      .query({ active: true, lastFocusedWindow: true })
      .then(([tab]) => {
        if (
          tab?.url &&
          /^https?:/.test(tab.url) &&
          new URL(tab.url).origin !== __REENTRY_APP_ORIGIN__
        )
          setOrigin(new URL(tab.url).origin);
      });
    const interval = setInterval(() => {
      void refresh();
    }, 5000);
    return () => clearInterval(interval);
  }, [refresh]);
  async function taskAction(action: AgentAction) {
    setBusy(true);
    setError("");
    try {
      setTasks(
        agentViewSchema.parse(await sendMessage("agentTaskChange", action)),
      );
    } catch (e) {
      setError(
        "Could not save. The task or session may have changed; your input is still here. Refresh and review.",
      );
      throw e;
    } finally {
      setBusy(false);
    }
  }
  async function connect() {
    setBusy(true);
    setError("");
    try {
      setStatus(
        companionStatusSchema.parse(await sendMessage("agentPair", undefined)),
      );
    } catch {
      setError(
        "Could not pair. Open the local app and choose Connect browser again; pairing links expire after two minutes.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function configure(scope: ObservationScope, paused: boolean) {
    setBusy(true);
    setError("");
    try {
      setStatus(
        companionStatusSchema.parse(
          await sendMessage("agentConfigure", { scope, paused }),
        ),
      );
      setSettingsOpen(false);
    } catch {
      setError(
        "Observation remains paused. Check site access and the local app, then retry.",
      );
      await refresh();
    } finally {
      setBusy(false);
    }
  }
  async function enable() {
    setError("");
    const parsed = scopeSchema.safeParse({
      allSites,
      origins: allSites ? [] : [origin.trim()],
      policy: "local-observation-v1",
    });
    if (!parsed.success || origin.trim() === __REENTRY_APP_ORIGIN__) {
      setError(
        "Enter a site origin such as https://example.com, without a path. ReEntry cannot observe itself.",
      );
      return;
    }
    if (!consent) {
      setError("Review and allow local observation first.");
      return;
    }
    const patterns = parsed.data.allSites
      ? ["http://*/*", "https://*/*"]
      : parsed.data.origins.map(
          (value) => `${new URL(value).protocol}//${new URL(value).hostname}/*`,
        );
    // Keep the native permission request directly in this click's user gesture.
    try {
      const granted = await browser.permissions.request({ origins: patterns });
      if (!granted) {
        setError(
          "Site access was declined. Nothing will be observed on this site.",
        );
        return;
      }
      await configure(parsed.data, false);
    } catch {
      setError(
        "Chrome could not grant site access. Open the companion as a tab and retry.",
      );
    }
  }
  const label = !status
    ? "Connecting"
    : !status.paired
      ? "Not connected"
      : status.session?.paused
        ? "Paused"
        : status.problem === "offline"
          ? "App unavailable"
          : status.pending
            ? "Catching up"
            : status.session
              ? "Observing"
              : "Choose a site";
  return (
    <div data-reentry-preview className="min-h-screen">
      <main className="mx-auto flex max-w-xl flex-col gap-5 p-5 wrap-anywhere">
        <header className="flex flex-col gap-3">
          {cloneElement(TypographyH1(), {}, "Here with you.")}
          <div role="status" aria-live="polite">
            <Badge variant="secondary">{label}</Badge>
          </div>
        </header>
        {(error || connectionError || (status && problems[status.problem])) && (
          <Alert role="alert">
            <AlertTitle>Needs attention</AlertTitle>
            <AlertDescription>
              {error || connectionError || (status && problems[status.problem])}
            </AlertDescription>
          </Alert>
        )}
        {!status?.paired ? (
          <Card>
            <CardHeader>
              <CardTitle>Connect on your terms</CardTitle>
              <CardDescription>
                Pair this browser with your local ReEntry app. You’ll choose
                site access separately.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button
                disabled={busy || !status?.challengeReady}
                onClick={() => void connect()}
              >
                Connect to local app
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  void browser.tabs.create({
                    url: `${__REENTRY_APP_ORIGIN__}/observe`,
                  })
                }
              >
                Open ReEntry setup
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>
                  {status.session
                    ? "Your observation session"
                    : "Choose where to begin"}
                </CardTitle>
                <CardDescription>
                  No task form or text selection needed. Browse an enabled site
                  normally.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {status.session && (
                  <>
                    <p>
                      {status.session.scope.allSites
                        ? "All normal websites are enabled."
                        : `Enabled: ${status.session.scope.origins.join(", ")}`}
                    </p>
                    <Button
                      disabled={busy}
                      onClick={() =>
                        void configure(
                          status.session!.scope,
                          !status.session!.paused,
                        )
                      }
                    >
                      {status.session.paused
                        ? "Resume observation"
                        : "Pause observation"}
                    </Button>
                  </>
                )}
                <Collapsible
                  open={!status.session || settingsOpen}
                  onOpenChange={setSettingsOpen}
                >
                  <CollapsibleTrigger asChild>
                    <Button variant="outline">
                      {status.session
                        ? "Change site access"
                        : "Set up site access"}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="flex flex-col gap-4 pt-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="site-origin">Site address</Label>
                      <Input
                        id="site-origin"
                        placeholder="https://example.com"
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value)}
                        disabled={allSites || busy}
                        aria-invalid={Boolean(error)}
                      />
                    </div>
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="all-sites"
                        checked={allSites}
                        onCheckedChange={(value) => setAllSites(value === true)}
                        disabled={busy}
                      />
                      <Label htmlFor="all-sites">
                        Allow all normal websites instead
                      </Label>
                    </div>
                    <p>
                      Page text and filled/empty form status are saved only in
                      this browser and local app. Password/payment inputs,
                      hidden tokens and editable answers are excluded by the
                      reader; ordinary page text may still contain personal
                      information. Only enable sites you are comfortable
                      recording.
                    </p>
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="local-consent"
                        checked={consent}
                        onCheckedChange={(value) => setConsent(value === true)}
                        disabled={busy}
                      />
                      <Label htmlFor="local-consent">
                        Allow local observation on these sites. No AI provider
                        receives observations until you separately enable AI
                        processing.
                      </Label>
                    </div>
                    <Button
                      disabled={busy || !consent}
                      onClick={() => void enable()}
                    >
                      Enable observation
                    </Button>
                    <p>
                      Choosing new access replaces the previous session and
                      clears its pending queue. Pause works locally even when
                      the app is unavailable. Exact site ports are enforced by
                      ReEntry, even though Chrome’s permission dialog grants the
                      whole host.
                    </p>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
            <TaskFeed
              sessionId={status.session?.id ?? null}
              data={tasks}
              act={taskAction}
              busy={busy}
              canEnable={Boolean(status.session && !status.session.paused)}
            />
            <Card>
              <CardHeader>
                <CardTitle>Quietly keeping your place</CardTitle>
                <CardDescription>
                  Observed updates stay queued through local connection
                  interruptions.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p>{status.pending} updates waiting for the local app.</p>
                <p>
                  {status.lastDelivered
                    ? `Last delivered ${new Date(status.lastDelivered).toLocaleTimeString()}.`
                    : "No updates delivered yet."}
                </p>
                {status.dropped > 0 && (
                  <p role="status">
                    {status.dropped} pending updates expired, were replaced, or
                    could not be stored. Revisit important pages to capture
                    their current state.
                  </p>
                )}
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => void refresh()}
                >
                  Retry connection
                </Button>
              </CardContent>
            </Card>
          </>
        )}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost">Privacy and connection details</Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="flex flex-col gap-3 pt-3">
            <p>
              Close this companion or the app tab without stopping observation.
              Keep the local server running. Pending updates retry every minute
              and when you open this companion.
            </p>
            <p>
              Observations expire after 24 hours; the local app retains at most
              1,000. The extension queue holds up to 100 updates or 1 MB. Data
              is local, but it is not encrypted storage.
            </p>
            <p>
              Disconnect and clear from the app to revoke this browser and
              remove observed text. Removing Chrome site access stops local
              observation. Browser settings pages, embedded frames and ReEntry
              itself are excluded.
            </p>
            <Button
              variant="outline"
              onClick={() =>
                void browser.tabs.create({
                  url: `${__REENTRY_APP_ORIGIN__}/observe`,
                })
              }
            >
              Open observations in ReEntry
            </Button>
          </CollapsibleContent>
        </Collapsible>
      </main>
    </div>
  );
}
