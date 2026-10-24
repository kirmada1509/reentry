import { useEffect, useState } from "react";
import { browser } from "wxt/browser";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@reentry/components/ui/alert";
import { Button } from "@reentry/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@reentry/components/ui/card";
import { Label } from "@reentry/components/ui/label";
import { Textarea } from "@reentry/components/ui/textarea";
import type { PendingCapture } from "../../../src/features/capture/protocol";
import { sendMessage } from "../../lib/messages";

const errors: Record<string, string> = {
  "no-selection":
    "Select instruction text on the source page, then invoke ReEntry again. Nothing was captured.",
  unsupported:
    "ReEntry captures ordinary HTTP or HTTPS page text. Browser pages, PDFs, and text inside editable fields are not supported.",
  "too-large":
    "The selection or page metadata exceeds the capture limit. Select a shorter section; up to 20,000 characters are supported. Nothing was saved.",
  "storage-failed":
    "The capture could not be kept. Finish or discard pending captures below, then try again. Extension storage may be unavailable.",
  "capture-failed":
    "ReEntry could not read this page. Select text on an ordinary webpage and invoke the toolbar button or shortcut again.",
};

export default function CapturePage() {
  const [items, setItems] = useState<PendingCapture[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    new URL(location.href).searchParams.get("id"),
  );
  const [error, setError] = useState(
    () => errors[new URL(location.href).searchParams.get("error") ?? ""] ?? "",
  );
  const [message, setMessage] = useState("Loading pending captures…");
  const [busy, setBusy] = useState(false);
  const selected = items.find((item) => item.capture.id === selectedId);

  async function refresh() {
    const pending = await sendMessage("pending", undefined);
    setItems(pending);
  }

  useEffect(() => {
    void sendMessage("pending", undefined)
      .then((pending) => {
        setItems(pending);
        setMessage(
          pending.length
            ? "Review before sending. Captures expire after 24 hours."
            : "No pending captures. Select instructions on a page, then choose ReEntry in the toolbar.",
        );
      })
      .catch(() =>
        setError(
          "Pending captures could not be loaded. Reload this preview to try again.",
        ),
      );
  }, []);

  async function confirm(id: string) {
    setBusy(true);
    setError("");
    try {
      await sendMessage("confirm", { id });
      await refresh();
      setMessage(
        "Opened ReEntry. This capture stays here until your task is saved. If the app is unavailable, start it and choose Open ReEntry again.",
      );
    } catch {
      setError(
        "Could not open ReEntry. The capture may have expired or storage may be unavailable. Reload to check pending captures.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function discard(id: string) {
    setBusy(true);
    try {
      await sendMessage("discard", { id });
      await refresh();
      setSelectedId(null);
      setMessage("Capture discarded. No task was created by this action.");
    } catch {
      setError("Could not discard the capture. Reload and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="wrap-anywhere container mx-auto max-w-2xl p-6 grid gap-6">
      <header className="grid gap-2">
        <h1>ReEntry · Review capture</h1>
        <p>
          Only the selected text and its source are captured. Confirming here
          opens the app; saving a task is a separate step.
        </p>
      </header>
      <p role="status" aria-live="polite">
        {message}
      </p>
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Capture needs attention</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {selected && (
        <Card>
          <CardHeader>
            <CardTitle>{selected.capture.title}</CardTitle>
            <CardDescription>
              Captured {new Date(selected.capture.capturedAt).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {selected.check && (
              <Alert>
                <AlertTitle>
                  Check instructions for: {selected.check.goal}
                </AlertTitle>
                <AlertDescription>
                  This recapture is bound to the task that opened the source
                  tab. It will compare with that task’s saved source, not create
                  a new task.
                </AlertDescription>
              </Alert>
            )}
            <p>
              Section:{" "}
              {selected.capture.section?.label ??
                "Unidentified selection — confirm the section in ReEntry"}
            </p>
            {selected.check && (
              <>
                <Label htmlFor="expected-source">
                  Saved source for this task
                </Label>
                <Textarea
                  id="expected-source"
                  readOnly
                  value={selected.check.sourceUrl}
                  rows={2}
                />
              </>
            )}
            <Label htmlFor="capture-source">Source URL</Label>
            <Textarea
              id="capture-source"
              readOnly
              value={selected.capture.url}
              rows={2}
            />
            <Label htmlFor="capture-text">
              Selected instructions · exact captured text
            </Label>
            <Textarea
              id="capture-text"
              readOnly
              value={selected.capture.text}
              rows={9}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={busy}
                onClick={() => void confirm(selected.capture.id)}
              >
                {selected.status === "confirmed"
                  ? "Open ReEntry again"
                  : selected.check
                    ? "Confirm recapture for this task"
                    : "Confirm capture and open ReEntry"}
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void discard(selected.capture.id)}
              >
                Discard capture
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <section className="grid gap-4" aria-labelledby="pending-heading">
        <h2 id="pending-heading">Pending captures ({items.length}/10)</h2>
        {items.map((item) => (
          <Card key={item.capture.id}>
            <CardHeader>
              <CardTitle>{item.capture.title}</CardTitle>
              <CardDescription>
                {item.check ? `Task: ${item.check.goal}. ` : ""}
                {item.status === "confirmed"
                  ? "Waiting for task save"
                  : "Waiting for your review"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => setSelectedId(item.capture.id)}
              >
                Review capture
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void discard(item.capture.id)}
              >
                Discard
              </Button>
            </CardContent>
          </Card>
        ))}
        <Button
          variant="outline"
          disabled={busy}
          onClick={() =>
            void refresh().catch(() =>
              setError("Could not refresh pending captures."),
            )
          }
        >
          Refresh pending captures
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            void browser.tabs.create({
              url: `${__REENTRY_APP_ORIGIN__}/checkpoints`,
            })
          }
        >
          Open ReEntry library
        </Button>
      </section>
    </main>
  );
}
