"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
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
import { flushCleanup } from "@/features/tasks/cleanup";
import { loadDraft, saveDraft } from "@/features/tasks/drafts";
import type { TaskDraft } from "@/features/tasks/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { requestCaptureBridge } from "@/features/capture/bridge";
import { readConnectionConfiguration } from "@/features/capture/config";
import { idSchema } from "@/features/capture/protocol";
import type { Capture } from "@/features/capture/protocol";
import { taskInputSchema } from "@/features/tasks/schema";
import type { SavedTask } from "@/features/tasks/schema";
import {
  deleteTasks,
  listTasks,
  saveTask,
  taskDatabase,
} from "@/features/tasks/storage";

async function acknowledge(task: SavedTask) {
  try {
    const { extensionId } = readConnectionConfiguration();
    const reply = await requestCaptureBridge(extensionId, {
      version: 1,
      type: "capture.ack",
      captureId: task.captureId,
      taskId: task.id,
    });
    if (reply.status !== "acknowledged") throw new Error("not acknowledged");
    history.replaceState(null, "", location.pathname);
    return true;
  } catch {
    return false;
  }
}

export default function Home() {
  const [restoredDraft, setRestoredDraft] = useState<TaskDraft | undefined>();
  const draftWrites = useRef<Promise<unknown>>(Promise.resolve());
  const [cleanupPending, setCleanupPending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [tasks, setTasks] = useState<SavedTask[]>([]);
  const [capture, setCapture] = useState<Capture | null>(null);
  const [selected, setSelected] = useState<SavedTask | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const busy = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const savedRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  useEffect(() => {
    if (selected) savedRef.current?.focus();
  }, [selected]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { appOrigin, extensionId } = readConnectionConfiguration();
        const saved = await listTasks(taskDatabase());
        void flushCleanup(taskDatabase())
          .then((count) => {
            if (active) setCleanupPending(count > 0);
          })
          .catch(() => {
            if (active) setCleanupPending(true);
          });
        if (!active) return;
        setTasks(saved);
        const captureId = new URL(location.href).searchParams.get("capture");
        if (!captureId) return;
        if (location.origin !== appOrigin)
          throw new Error(
            `Open ReEntry at ${appOrigin} to receive this capture.`,
          );
        if (!idSchema.safeParse(captureId).success)
          throw new Error(
            "This capture link is invalid. Open ReEntry again from the extension preview.",
          );
        const existing = saved.find((task) => task.captureId === captureId);
        if (existing) {
          const delivered = await acknowledge(existing);
          if (!active) return;
          setSelected(existing);
          setStatus(
            delivered
              ? "This capture was already saved. Your existing task is shown; no duplicate was created."
              : "Your task is saved. The extension acknowledgement is still pending; refresh to retry it.",
          );
          return;
        }
        const reply = await requestCaptureBridge(extensionId, {
          version: 1,
          type: "capture.get",
          captureId,
        });
        if (!active) return;
        if (
          reply.status !== "capture" ||
          reply.capture.id !== captureId ||
          reply.check
        )
          throw new Error(
            "This capture is unavailable, unconfirmed, discarded, or expired. Review a pending capture in the extension, or select the source again.",
          );
        const draft = await loadDraft(taskDatabase(), captureId);
        if (!active) return;
        setRestoredDraft(draft);
        setCapture(reply.capture);
        setStatus("Capture received for review. No task has been saved yet.");
      } catch (failure) {
        if (active)
          setError(
            failure instanceof Error &&
              !(
                failure.name.startsWith("Database") ||
                failure.name === "UnknownError"
              )
              ? failure.message
              : "Browser storage is unavailable. Your capture remains in the extension; nothing was acknowledged.",
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!capture || busy.current) return;
    const form = new FormData(event.currentTarget);
    const result = taskInputSchema.safeParse({
      goal: form.get("goal"),
      workUrl: form.get("workUrl"),
      progress: form.get("progress"),
      nextAction: form.get("nextAction"),
      materialUrls: String(form.get("materials") || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
      confirmed,
    });
    if (!result.success) {
      setError(result.error.issues.map((issue) => issue.message).join(" "));
      return;
    }
    busy.current = true;
    setSaving(true);
    setError("");
    let saved: SavedTask | undefined;
    try {
      await draftWrites.current;
      const reply = await requestCaptureBridge(
        readConnectionConfiguration().extensionId,
        {
          version: 1,
          type: "capture.get",
          captureId: capture.id,
        },
      );
      if (
        reply.status !== "capture" ||
        reply.check ||
        JSON.stringify(reply.capture) !== JSON.stringify(capture)
      )
        throw new Error("capture unavailable");
      saved = await saveTask(taskDatabase(), result.data, capture);
    } catch {
      setError(
        "Could not save your checkpoint. Check browser storage and that the capture is still pending, then retry. The extension has not been told to clear it.",
      );
    }
    if (saved) {
      const delivered = await acknowledge(saved);
      setTasks((current) => [
        saved,
        ...current.filter((task) => task.id !== saved.id),
      ]);
      setSelected(saved);
      setCapture(null);
      setStatus(
        delivered
          ? "Checkpoint saved on this browser. You can close ReEntry and come back later."
          : "Checkpoint saved on this browser. The extension acknowledgement is pending; refresh this page to retry without creating a duplicate.",
      );
    }
    busy.current = false;
    setSaving(false);
  }

  function keepDraft(form: HTMLFormElement) {
    if (!capture || busy.current) return;
    const data = new FormData(form);
    const draft = {
      id: capture.id,
      baseRevision: 0,
      capturedAt: capture.capturedAt,
      goal: String(data.get("goal") ?? ""),
      workUrl: String(data.get("workUrl") ?? ""),
      progress: String(data.get("progress") ?? ""),
      nextAction: String(data.get("nextAction") ?? ""),
      materials: String(data.get("materials") ?? ""),
      confirmed: false,
    };
    setStatus("Unsaved changes · keeping a local draft…");
    draftWrites.current = draftWrites.current
      .catch(() => undefined)
      .then(() => saveDraft(taskDatabase(), draft))
      .then(
        () =>
          setStatus(
            "Draft kept on this browser. Confirm and save to create a checkpoint.",
          ),
        () =>
          setStatus(
            "Unsaved changes · draft storage failed. Keep this page open and retry saving.",
          ),
      );
  }
  async function clearAll() {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      await draftWrites.current;
      await deleteTasks(taskDatabase());
      setTasks([]);
      setSelected(null);
      setCapture(null);
      setDeleteOpen(false);
      history.replaceState(null, "", location.pathname);
      setCleanupPending((await flushCleanup(taskDatabase())) > 0);
      setStatus("All saved tasks and drafts deleted from this browser.");
    } catch {
      setError("Could not delete saved data. Check browser storage and retry.");
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  return (
    <main className="wrap-anywhere container mx-auto max-w-3xl grid gap-6 p-6">
      <header className="grid gap-2">
        <CardTitle>
          <h1>ReEntry · Find your way back</h1>
        </CardTitle>
        <p>
          Save your place. Return with your goal, confirmed progress,
          instructions, and one next action together.
        </p>
        <Badge variant="secondary">
          Saved on this browser · no AI processing in this step
        </Badge>
        <div>
          <Button variant="outline" asChild>
            <Link href="/preview">
              Explore the new companion · fictional preview
            </Link>
          </Button>
        </div>
      </header>
      <p role="status" aria-live="polite">
        {loading ? "Loading saved tasks…" : status}
      </p>
      {error && (
        <Alert
          ref={errorRef}
          tabIndex={-1}
          variant="destructive"
          role="alert"
          aria-labelledby="task-error-heading"
        >
          <AlertTitle id="task-error-heading">
            Something needs your attention
          </AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {!loading && capture && (
        <section className="grid gap-4" aria-labelledby="save-heading">
          <h2 id="save-heading">Save a checkpoint</h2>
          <Card>
            <CardHeader>
              <CardTitle>{capture.title}</CardTitle>
              <CardDescription>
                Source captured {new Date(capture.capturedAt).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Label htmlFor="new-source-url">Source URL</Label>
              <Textarea
                readOnly
                id="new-source-url"
                rows={2}
                value={capture.url}
              />
              <Label htmlFor="new-source-text">
                Selected instructions · exact captured text
              </Label>
              <Textarea
                readOnly
                id="new-source-text"
                rows={6}
                value={capture.text}
              />
            </CardContent>
          </Card>
          <form
            onSubmit={(event) => void submit(event)}
            onChange={(event) => keepDraft(event.currentTarget)}
            className="grid gap-4"
            aria-busy={saving}
          >
            <div className="grid gap-2">
              <Label htmlFor="goal">Your goal</Label>
              <Input
                id="goal"
                name="goal"
                defaultValue={restoredDraft?.goal}
                required
                maxLength={300}
                placeholder="Finish my application"
                disabled={saving}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="workUrl">Work link</Label>
              <Input
                id="workUrl"
                name="workUrl"
                defaultValue={restoredDraft?.workUrl}
                type="url"
                required
                maxLength={2048}
                placeholder="https://example.org/application"
                disabled={saving}
                aria-describedby="work-help"
              />
              <p id="work-help">
                Check this destination yourself. ReEntry reopens the link; the
                external site controls whether its form progress is kept.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="progress">What have you completed?</Label>
              <Textarea
                id="progress"
                name="progress"
                defaultValue={restoredDraft?.progress}
                required
                maxLength={3000}
                placeholder="Transcript attached. Write Nothing yet if you haven't started."
                disabled={saving}
              />
              <p>
                Your record of progress; ReEntry does not inspect private form
                fields.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="confirmed"
                checked={confirmed}
                onCheckedChange={(value) => setConfirmed(value === true)}
                disabled={saving}
              />
              <Label htmlFor="confirmed">
                I confirm this progress is my own record.
              </Label>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nextAction">One next action</Label>
              <Textarea
                id="nextAction"
                name="nextAction"
                defaultValue={restoredDraft?.nextAction}
                required
                maxLength={1000}
                placeholder="Find the first referee's contact details"
                disabled={saving}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="materials">Supporting links (optional)</Label>
              <Textarea
                id="materials"
                name="materials"
                defaultValue={restoredDraft?.materials}
                maxLength={10300}
                placeholder="One complete HTTP or HTTPS link per line, up to five"
                disabled={saving}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving checkpoint…" : "Save confirmed checkpoint"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => {
                  setCapture(null);
                  setError("");
                  history.replaceState(null, "", location.pathname);
                  setStatus(
                    "Not saved. The capture remains pending in the extension until you save or discard it there.",
                  );
                }}
              >
                Cancel task save
              </Button>
            </div>
          </form>
        </section>
      )}
      {selected && (
        <section className="grid gap-4" aria-labelledby="saved-heading">
          <h2 id="saved-heading" tabIndex={-1} ref={savedRef}>
            Saved checkpoint
          </h2>
          <Card>
            <CardHeader>
              <CardTitle>{selected.goal}</CardTitle>
              <CardDescription>
                Saved {new Date(selected.savedAt).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Badge variant="secondary">Revision {selected.revision}</Badge>
              <h3>Confirmed progress</h3>
              <p>{selected.progress}</p>
              <Separator />
              <h3>Your next action</h3>
              <p>{selected.nextAction}</p>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link
                    href={selected.workUrl}
                    target="_blank"
                    rel="noreferrer"
                    prefetch={false}
                  >
                    Open work link
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link
                    href={selected.source.url}
                    target="_blank"
                    rel="noreferrer"
                    prefetch={false}
                  >
                    Open instruction source
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href={`/check?task=${selected.id}`}>
                    Check instructions again
                  </Link>
                </Button>
              </div>
              <Button asChild variant="outline">
                <Link href={`/task?task=${selected.id}`}>
                  Edit checkpoint and history
                </Link>
              </Button>
              <Collapsible defaultOpen>
                <CollapsibleTrigger asChild>
                  <Button variant="outline">Saved instruction details</Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="grid gap-3 p-3">
                  <Label htmlFor="saved-url">Saved source URL</Label>
                  <Textarea
                    id="saved-url"
                    readOnly
                    value={selected.source.url}
                    rows={2}
                  />
                  <Label htmlFor="saved-text">
                    Saved instructions · captured text, not a live check
                  </Label>
                  <Textarea
                    id="saved-text"
                    readOnly
                    value={selected.source.text}
                    rows={7}
                  />
                </CollapsibleContent>
              </Collapsible>
              {selected.materialUrls.length > 0 && (
                <section className="grid gap-2" aria-label="Supporting links">
                  {selected.materialUrls.map((url, index) => (
                    <Button key={`${url}-${index}`} asChild variant="outline">
                      <Link
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        prefetch={false}
                      >
                        Open supporting link {index + 1}
                      </Link>
                    </Button>
                  ))}
                </section>
              )}
            </CardContent>
          </Card>
        </section>
      )}
      {!loading && (
        <section className="grid gap-4" aria-labelledby="library-heading">
          <h2 id="library-heading">Your saved tasks ({tasks.length})</h2>
          {!tasks.length && (
            <Card>
              <CardHeader>
                <CardTitle>Save your first place</CardTitle>
                <CardDescription>
                  Select instruction text on another page, then choose Capture
                  selection with ReEntry in the Chrome toolbar or use
                  Command+Shift+Y on Mac / Ctrl+Shift+Y elsewhere. Review it in
                  the extension before saving here.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
          {tasks.map((task) => (
            <Card key={task.id}>
              <CardHeader>
                <CardTitle>{task.goal}</CardTitle>
                <CardDescription>{task.nextAction}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <Badge variant="outline">Revision {task.revision}</Badge>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSelected(task);
                    setError("");
                  }}
                >
                  Open saved checkpoint
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/task?task=${task.id}`}>
                    Edit checkpoint and history
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
      {cleanupPending && (
        <Alert>
          <AlertTitle>Extension cleanup pending</AlertTitle>
          <AlertDescription>
            Local deletion is complete. Reconnect the extension to clear
            associated pending captures.
            <Button
              variant="outline"
              onClick={() =>
                void flushCleanup(taskDatabase()).then((count) =>
                  setCleanupPending(count > 0),
                )
              }
            >
              Retry extension cleanup
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {!loading && !capture && (
        <Dialog
          open={deleteOpen}
          onOpenChange={(value) => {
            if (!saving) setDeleteOpen(value);
          }}
        >
          <DialogTrigger asChild>
            <Button variant="outline">Delete all saved data</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete all saved data?</DialogTitle>
              <DialogDescription>
                All tasks, revision history, source checks, suggestions, drafts
                and existing pending captures will be removed. This cannot be
                undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={saving}>
                  Keep my data
                </Button>
              </DialogClose>
              <Button
                variant="destructive"
                disabled={saving}
                onClick={() => void clearAll()}
              >
                Confirm delete all
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      <footer>
        <p>
          Saved tasks stay in this browser profile. Clearing site data removes
          them. Open a saved checkpoint and choose Check instructions again to
          compare a fresh capture with its saved instructions.
        </p>
      </footer>
    </main>
  );
}
