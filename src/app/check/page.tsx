"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { idSchema } from "@/features/capture/protocol";
import type { Capture } from "@/features/capture/protocol";
import type { SavedTask } from "@/features/tasks/schema";
import { taskDatabase } from "@/features/tasks/storage";
import {
  checkMessages,
  reasonMessages,
  textChanges,
} from "@/features/sources/compare";
import {
  acknowledgeRecapture,
  closeSourceCheck,
  persistRecapture,
  receiveRecapture,
  refreshSourceCheck,
  startSourceCheck,
} from "@/features/sources/operations";
import type { SourceCheck } from "@/features/sources/schema";
import { getTask, latestCheck } from "@/features/sources/storage";

export default function CheckPage() {
  const [task, setTask] = useState<SavedTask | null>(null);
  const [check, setCheck] = useState<SourceCheck | undefined>();
  const [capture, setCapture] = useState<Capture | null>(null);
  const [sameSection, setSameSection] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const busyRef = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const params = new URL(location.href).searchParams;
        const taskId = idSchema.parse(params.get("task"));
        const saved = await getTask(taskDatabase(), taskId);
        if (!active) return;
        setTask(saved);
        const checkId = params.get("check");
        const captureId = params.get("capture");
        if (captureId || checkId) {
          const received = await receiveRecapture(
            taskDatabase(),
            taskId,
            idSchema.parse(checkId),
            idSchema.parse(captureId),
          );
          if (!active) return;
          setCheck(received.check);
          if (received.saved) {
            const ack = await acknowledgeRecapture(received.check);
            if (!active) return;
            if (ack) history.replaceState(null, "", `/check?task=${taskId}`);
            setMessage(
              ack
                ? "This comparison is already saved. No duplicate was created."
                : "Comparison is saved; acknowledgement is still pending. Refresh to retry.",
            );
          } else {
            setCapture(received.capture);
            setMessage(
              "Review the saved and new captures for this task before saving the comparison.",
            );
          }
        } else {
          const previous = await latestCheck(taskDatabase(), taskId);
          if (active) setCheck(previous);
        }
      } catch {
        if (active)
          setError(
            "Could not open this source check. Check that the task and capture belong together and still exist in this browser. Reopen the capture from its extension preview, or return to the library.",
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!check || check.status !== "awaiting" || capture || busyRef.current)
      return;
    try {
      const updated = await refreshSourceCheck(taskDatabase(), check);
      setCheck((current) => (current?.id === updated.id ? updated : current));
    } catch {
      setError(
        "Could not save the check status on this browser. No comparison has been verified.",
      );
    }
  }, [check, capture]);

  useEffect(() => {
    if (check?.status !== "awaiting" || capture) return;
    const timer = setInterval(() => void refresh(), 2000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [check?.status, capture, refresh]);

  async function start() {
    if (!task || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      setCapture(null);
      setSameSection(false);
      const started = await startSourceCheck(taskDatabase(), task.id);
      setCheck(started);
      history.replaceState(null, "", `/check?task=${task.id}`);
      setMessage(
        started.status === "awaiting"
          ? "The source opened for this task. Select the same instruction section, invoke ReEntry, then confirm the named task in the extension preview."
          : "The check could not be started. Your saved context is intact.",
      );
    } catch {
      setError(
        "Could not start the check. Your saved context has not changed. Check browser storage and the extension connection.",
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function save() {
    if (!check || !capture || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await persistRecapture(
        taskDatabase(),
        check.context,
        capture,
        sameSection,
      );
      const ack = await acknowledgeRecapture(result);
      setCheck(result);
      setCapture(null);
      if (ack) history.replaceState(null, "", `/check?task=${result.taskId}`);
      setMessage(
        ack
          ? "Comparison saved. Your confirmed progress and saved next action have not changed."
          : "Comparison saved. Acknowledgement is pending; refresh to retry without duplicating the comparison.",
      );
      resultRef.current?.focus();
    } catch {
      setError(
        "Could not save this comparison. It may be closed, belong to another task, or browser storage may be unavailable. The new capture has not been acknowledged.",
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function close(reason: "cancelled" | "source-unavailable") {
    if (!check || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const closed = await closeSourceCheck(taskDatabase(), check, reason);
      setCheck(closed);
      setCapture(null);
      history.replaceState(null, "", `/check?task=${closed.taskId}`);
      setMessage(
        "Check closed. Your saved instructions, confirmed progress and next action are unchanged.",
      );
    } catch {
      setError(
        "Could not save the closed check. Retry before starting another check.",
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const before = check?.before ?? task?.source;
  const after = capture ?? check?.after;
  const changes =
    check?.status === "changed" && !capture && after && before
      ? textChanges(before.text, after.text)
      : undefined;

  return (
    <main className="container mx-auto max-w-2xl grid gap-6 p-6">
      <header className="grid gap-2">
        <h1>ReEntry · Check instructions</h1>
        <p>
          Compare a fresh selection with the instructions saved in your
          checkpoint. This checks captured text, not the whole website or the
          meaning of a requirement.
        </p>
        <Button asChild variant="outline">
          <Link href="/">Return to saved tasks</Link>
        </Button>
      </header>
      <p role="status" aria-live="polite">
        {loading ? "Opening saved context…" : message}
      </p>
      {error && (
        <Alert
          ref={errorRef}
          tabIndex={-1}
          variant="destructive"
          role="alert"
          aria-labelledby="check-error"
        >
          <AlertTitle id="check-error">Source check needs attention</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {task && (
        <Card>
          <CardHeader>
            <CardTitle>{task.goal}</CardTitle>
            <CardDescription>
              Task selected for this source check
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <h2>Confirmed progress</h2>
            <p>{task.progress}</p>
            <h2>Saved next action · not reassessed</h2>
            <p>{task.nextAction}</p>
            <p>
              Review your saved action when text changes or the source cannot be
              verified. AI interpretation has not run.
            </p>
            <Button asChild variant="outline">
              <Link
                href={task.workUrl}
                target="_blank"
                rel="noreferrer"
                prefetch={false}
              >
                Open saved work link
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
      {task && !loading && (
        <section className="grid gap-4" aria-labelledby="result-heading">
          <h2 id="result-heading" ref={resultRef} tabIndex={-1}>
            {capture
              ? "Review recapture for this task"
              : check
                ? checkMessages[check.status]
                : "Instructions have not been checked again"}
          </h2>
          {check?.reason && (
            <Alert>
              <AlertDescription>
                {reasonMessages[check.reason]}
              </AlertDescription>
            </Alert>
          )}
          {check?.status === "unchanged" && !capture && (
            <p>
              Only the selected instruction text matched the saved capture.
              Other page content was not checked, and your next action has not
              been verified.
            </p>
          )}
          {check?.status === "changed" && !capture && (
            <p>
              These are text differences. Even punctuation or spacing counts
              here; this is not yet a conclusion that a requirement changed.
            </p>
          )}
          {check?.completedAt && (
            <p>
              Check recorded {new Date(check.completedAt).toLocaleString()}.
              Capture times below are not website edit times.
            </p>
          )}
          {check?.status === "awaiting" && !capture && (
            <p>
              Awaiting recapture. The extension is linked to the source tab
              opened for this task. If the source cannot be read, report that
              below; a failed check never counts as unchanged.
            </p>
          )}
          {!capture && (
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={busy || check?.status === "awaiting"}
                onClick={() => void start()}
              >
                Open source and check again
              </Button>
              {check?.status === "awaiting" && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => void refresh()}
                >
                  Refresh check status
                </Button>
              )}
            </div>
          )}
          {check?.status === "awaiting" && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void close("cancelled")}
              >
                Cancel this check
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void close("source-unavailable")}
              >
                I cannot read the source
              </Button>
            </div>
          )}
        </section>
      )}
      {before && (
        <Card>
          <CardHeader>
            <CardTitle>Saved source snapshot</CardTitle>
            <CardDescription>
              Captured {new Date(before.capturedAt).toLocaleString()} · section:{" "}
              {before.section?.label ?? "Unidentified selection"}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Label htmlFor="before-url">Saved instruction URL</Label>
            <Textarea id="before-url" readOnly value={before.url} rows={2} />
            <Label htmlFor="before-text">Saved instruction text</Label>
            <Textarea id="before-text" readOnly value={before.text} rows={7} />
          </CardContent>
        </Card>
      )}
      {after && (
        <Card>
          <CardHeader>
            <CardTitle>New source snapshot</CardTitle>
            <CardDescription>
              Captured {new Date(after.capturedAt).toLocaleString()} · section:{" "}
              {after.section?.label ?? "Unidentified selection"}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Label htmlFor="after-url">New instruction URL</Label>
            <Textarea id="after-url" readOnly value={after.url} rows={2} />
            <Label htmlFor="after-text">New instruction text</Label>
            <Textarea id="after-text" readOnly value={after.text} rows={7} />
          </CardContent>
        </Card>
      )}
      {capture && check && (
        <section
          className="grid gap-4"
          aria-label="Confirm comparison association"
        >
          <p>
            This recapture belongs to <strong>{task?.goal}</strong>. Check both
            URLs and sections above before accepting it. Different detected
            sections or URLs will be recorded as incomparable.
          </p>
          <div className="flex items-center gap-2">
            <Checkbox
              id="same-section"
              checked={sameSection}
              disabled={busy}
              onCheckedChange={(value) => setSameSection(value === true)}
            />
            <Label htmlFor="same-section">
              I selected the same instruction section as the saved capture.
            </Label>
          </div>
          <Button disabled={busy} onClick={() => void save()}>
            {busy ? "Saving comparison…" : "Save source comparison"}
          </Button>
          <p>
            If you leave the box unchecked, the capture can be retained as
            incomparable. It will never be called unchanged.
          </p>
        </section>
      )}
      {changes && (
        <section className="grid gap-4" aria-label="Text differences">
          <h2>Text differences</h2>
          {changes.parts.map((part, index) => (
            <Card key={index}>
              <CardHeader>
                <Badge variant="secondary">{part.kind}</Badge>
              </CardHeader>
              <CardContent>
                <Label htmlFor={`change-${index}`}>
                  {part.kind} text fragment {index + 1}
                </Label>
                <Textarea
                  id={`change-${index}`}
                  readOnly
                  value={part.text}
                  rows={2}
                />
              </CardContent>
            </Card>
          ))}
          {changes.limited && (
            <p>
              Change details exceed the display budget. Full saved and new
              captures are available above.
            </p>
          )}
        </section>
      )}
      <footer>
        <p>
          Your original checkpoint remains intact. ReEntry compares only the
          material you explicitly captured and confirmed.
        </p>
      </footer>
    </main>
  );
}
