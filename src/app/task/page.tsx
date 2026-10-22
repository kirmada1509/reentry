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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { idSchema } from "@/features/capture/protocol";
import { getTask } from "@/features/sources/storage";
import { flushCleanup } from "@/features/tasks/cleanup";
import { loadDraft, saveDraft } from "@/features/tasks/drafts";
import type { SavedTask, TaskDraft } from "@/features/tasks/schema";
import {
  deleteTasks,
  restoreTask,
  taskDatabase,
  taskHistory,
  updateTask,
} from "@/features/tasks/storage";

function fromTask(task: SavedTask): TaskDraft {
  return {
    id: task.id,
    baseRevision: task.revision,
    goal: task.goal,
    workUrl: task.workUrl,
    progress: task.progress,
    nextAction: task.nextAction,
    materials: task.materialUrls.join("\n"),
    confirmed: false,
  };
}

export default function TaskPage() {
  const [task, setTask] = useState<SavedTask | null>(null);
  const [draft, setDraft] = useState<TaskDraft | null>(null);
  const [history, setHistory] = useState<SavedTask[]>([]);
  const [status, setStatus] = useState("Opening checkpoint…");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const writes = useRef<Promise<unknown>>(Promise.resolve());
  const busyRef = useRef(false);
  const editSequence = useRef(0);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const db = taskDatabase();
        const id = idSchema.parse(
          new URL(location.href).searchParams.get("task"),
        );
        const saved = await getTask(db, id);
        const [pending, revisions] = await Promise.all([
          loadDraft(db, id),
          taskHistory(db, id),
        ]);
        if (!active) return;
        setTask(saved);
        setDraft(pending ?? fromTask(saved));
        setHistory(revisions);
        setDirty(Boolean(pending));
        setStatus(
          pending
            ? "Recovered your local draft. Review it before saving a checkpoint."
            : `Checkpoint saved · revision ${saved.revision}`,
        );
      } catch {
        if (active) {
          setError(
            "This checkpoint is unavailable. It may have been deleted, or browser storage needs attention. Return to saved tasks to retry.",
          );
          setStatus("");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty && status.startsWith("Unsaved")) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, status]);
  function change(patch: Partial<TaskDraft>) {
    if (!draft || busyRef.current) return;
    const next = { ...draft, ...patch };
    setDraft(next);
    setDirty(true);
    setStatus("Unsaved changes · keeping a local draft…");
    const sequence = ++editSequence.current;
    writes.current = writes.current
      .catch(() => undefined)
      .then(() => saveDraft(taskDatabase(), next))
      .then(
        () => {
          if (sequence === editSequence.current)
            setStatus(
              "Draft kept on this browser · checkpoint not updated yet.",
            );
        },
        () => {
          if (sequence === editSequence.current)
            setStatus(
              "Unsaved changes · draft storage failed. Keep this page open and retry saving.",
            );
        },
      );
  }
  async function accept(saved: SavedTask) {
    setTask(saved);
    setDraft(fromTask(saved));
    setHistory(await taskHistory(taskDatabase(), saved.id));
    setDirty(false);
    setStatus(
      `Checkpoint saved · revision ${saved.revision}. Check instructions again before generating a new recovery.`,
    );
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!task || !draft || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      await writes.current;
      await accept(
        await updateTask(taskDatabase(), task.id, draft.baseRevision, {
          goal: draft.goal,
          progress: draft.progress,
          nextAction: draft.nextAction,
          workUrl: draft.workUrl,
          materialUrls: draft.materials
            .split(/\r?\n/)
            .map((url) => url.trim())
            .filter(Boolean),
          confirmed: draft.confirmed,
        }),
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not save. Your changes are still shown; retry when storage is available.",
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function restore(revision: number) {
    if (!task || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      await writes.current;
      await accept(
        await restoreTask(taskDatabase(), task.id, task.revision, revision),
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Restore failed. Your current checkpoint is intact.",
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function remove() {
    if (!task || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      await writes.current;
      await deleteTasks(taskDatabase(), [task.id]);
      setDeleted(true);
      setDeleteOpen(false);
      setDraft(null);
      setDirty(false);
      const pending = await flushCleanup(taskDatabase());
      setStatus(
        pending
          ? "Task deleted. Extension cleanup is pending; reconnect the extension and retry from saved tasks."
          : "Task and associated data deleted.",
      );
    } catch {
      setError(
        "Deletion failed. No success was recorded. Check browser storage and retry.",
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function reloadLatest() {
    if (!task || !draft) return;
    try {
      const latest = await getTask(taskDatabase(), task.id);
      setTask(latest);
      setHistory(await taskHistory(taskDatabase(), task.id));
      change({ baseRevision: latest.revision, confirmed: false });
      setError("");
    } catch {
      setError(
        "The task is unavailable. Your draft remains visible; return to saved tasks.",
      );
    }
  }
  return (
    <main className="container mx-auto max-w-3xl grid gap-6 p-6">
      <header className="grid gap-3">
        <Badge variant="secondary">ReEntry · Checkpoint editor</Badge>
        <CardTitle>
          <h1>Edit your saved place</h1>
        </CardTitle>
        <p>
          Your confirmed record stays separate from AI suggestions. Every saved
          correction gets a revision.
        </p>
        <nav>
          <Button asChild variant="outline">
            <Link href="/">Return to saved tasks</Link>
          </Button>
        </nav>
      </header>
      <p role="status" aria-live="polite">
        {status}
      </p>
      {error && (
        <Alert
          ref={errorRef}
          tabIndex={-1}
          variant="destructive"
          role="alert"
          aria-labelledby="edit-error"
        >
          <AlertTitle id="edit-error">Checkpoint needs attention</AlertTitle>
          <AlertDescription>
            {error}
            <Button
              variant="outline"
              onClick={() => void reloadLatest()}
              disabled={busy || !task}
            >
              Load latest version for review
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {task && draft && !deleted && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Current saved checkpoint</h2>
              </CardTitle>
              <CardDescription>
                Revision {task.revision} ·{" "}
                {new Date(task.savedAt).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <h3>{task.goal}</h3>
              <p>{task.progress}</p>
              <p>Next: {task.nextAction}</p>
              <Button asChild variant="outline">
                <Link href={`/check?task=${task.id}`}>
                  Check instructions again
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Your correction</h2>
              </CardTitle>
              <CardDescription>
                Draft based on revision {draft.baseRevision}. Source snapshots
                are preserved.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(event) => void save(event)}
                className="grid gap-4"
                aria-busy={busy}
              >
                <div className="grid gap-2">
                  <Label htmlFor="edit-goal">Your goal</Label>
                  <Input
                    id="edit-goal"
                    required
                    maxLength={300}
                    value={draft.goal}
                    disabled={busy}
                    onChange={(event) => change({ goal: event.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-work">Work link</Label>
                  <Input
                    id="edit-work"
                    type="url"
                    required
                    maxLength={2048}
                    value={draft.workUrl}
                    disabled={busy}
                    onChange={(event) =>
                      change({ workUrl: event.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-progress">
                    What have you completed?
                  </Label>
                  <Textarea
                    id="edit-progress"
                    required
                    maxLength={3000}
                    value={draft.progress}
                    disabled={busy}
                    onChange={(event) =>
                      change({ progress: event.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-action">One next action</Label>
                  <Textarea
                    id="edit-action"
                    required
                    maxLength={1000}
                    value={draft.nextAction}
                    disabled={busy}
                    onChange={(event) =>
                      change({ nextAction: event.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-materials">
                    Supporting links (optional)
                  </Label>
                  <Textarea
                    id="edit-materials"
                    maxLength={10300}
                    value={draft.materials}
                    disabled={busy}
                    onChange={(event) =>
                      change({ materials: event.target.value })
                    }
                  />
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="edit-confirm"
                    checked={draft.confirmed}
                    disabled={busy}
                    onCheckedChange={(value) =>
                      change({ confirmed: value === true })
                    }
                  />
                  <Label htmlFor="edit-confirm">
                    I confirm this progress is my own record.
                  </Label>
                </div>
                <Button type="submit" disabled={busy || !dirty}>
                  {busy ? "Saving…" : "Save checkpoint revision"}
                </Button>
              </form>
            </CardContent>
          </Card>
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="outline">
                Revision history ({history.length})
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="grid gap-4 p-4">
              <p>
                Up to ten revisions are retained. Restore saves the earlier
                contents as a new revision.
              </p>
              {history.map((version) => (
                <Card key={version.revision}>
                  <CardHeader>
                    <CardTitle>
                      <h3>
                        Revision {version.revision}
                        {version.revision === task.revision ? " · current" : ""}
                      </h3>
                    </CardTitle>
                    <CardDescription>
                      {new Date(version.savedAt).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <p>{version.goal}</p>
                    <p>{version.progress}</p>
                    <p>Next: {version.nextAction}</p>
                    <Button
                      variant="outline"
                      disabled={
                        busy || dirty || version.revision === task.revision
                      }
                      onClick={() => void restore(version.revision)}
                    >
                      Restore revision {version.revision}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </CollapsibleContent>
          </Collapsible>
          {dirty && <p>Save your correction before restoring a revision.</p>}
          <Dialog
            open={deleteOpen}
            onOpenChange={(value) => {
              if (!busy) setDeleteOpen(value);
            }}
          >
            <DialogTrigger asChild>
              <Button variant="destructive">Delete this task</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete this task and its data?</DialogTitle>
                <DialogDescription>
                  Checkpoint history, source checks, suggestions and drafts will
                  be removed from this browser. This cannot be restored through
                  revision history.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" disabled={busy}>
                    Keep task
                  </Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  disabled={busy}
                  onClick={() => void remove()}
                >
                  Confirm delete task
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </main>
  );
}
