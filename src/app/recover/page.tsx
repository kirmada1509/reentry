"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { idSchema } from "@/features/capture/protocol";
import { taskDatabase } from "@/features/tasks/storage";
import { getTask } from "@/features/sources/storage";
import type { SavedTask } from "@/features/tasks/schema";
import {
  modelStatusSchema,
  recoveryResultSchema,
} from "@/features/recovery/schema";
import type { RecoveryRecord } from "@/features/recovery/schema";
import {
  continuationTarget,
  currentRecoveryInput,
  latestRecovery,
  reviewRecovery,
  saveRecovery,
} from "@/features/recovery/storage";

export default function RecoverPage() {
  const [task, setTask] = useState<SavedTask | null>(null);
  const [record, setRecord] = useState<RecoveryRecord | null>(null);
  const [action, setAction] = useState("");
  const [config, setConfig] = useState<ReturnType<
    typeof modelStatusSchema.parse
  > | null>(null);
  const [consentFor, setConsentFor] = useState<string | null>(null);
  const [eligible, setEligible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const controller = useRef<AbortController | null>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  useEffect(() => {
    if (record) resultRef.current?.focus();
  }, [record]);
  useEffect(() => {
    let active = true;
    const abort = new AbortController();
    async function load() {
      try {
        const id = idSchema.parse(
          new URL(location.href).searchParams.get("task"),
        );
        const saved = await getTask(taskDatabase(), id);
        if (!active) return;
        setTask(saved);
        try {
          await currentRecoveryInput(taskDatabase(), id);
          const previous = await latestRecovery(taskDatabase(), id);
          if (!active) return;
          setEligible(true);
          if (previous) {
            setRecord(previous);
            setAction(
              previous.reviewedAction ??
                previous.proposal.nextAction.instruction,
            );
          }
        } catch {
          if (active)
            setMessage(
              "Check a comparable source section before requesting AI recovery. Your saved context is available below.",
            );
        }
        const reply = await fetch("/api/recovery", {
          signal: abort.signal,
          cache: "no-store",
        });
        const status = modelStatusSchema.parse(await reply.json());
        if (active) setConfig(status);
      } catch {
        if (active)
          setError(
            "Could not load recovery setup or the saved task. Return to your task, or use the saved context below.",
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
      abort.abort();
      controller.current?.abort();
    };
  }, []);

  async function generate() {
    if (
      !task ||
      controller.current ||
      (config?.processing === "hosted" && consentFor !== config.consentId)
    )
      return;
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setError("");
    setRecord(null);
    setMessage(
      "Asking the configured model once. You can cancel; your saved checkpoint stays available.",
    );
    try {
      const input = await currentRecoveryInput(taskDatabase(), task.id);
      const reply = await fetch("/api/recovery", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(config?.processing === "hosted" && consentFor
            ? { "x-reentry-consent": consentFor }
            : {}),
        },
        body: JSON.stringify(input),
        signal: abort.signal,
      });
      const body = await reply.json();
      if (!reply.ok && body?.error?.code === "PROCESSING_CONSENT_REQUIRED") {
        setConsentFor(null);
        const status = await fetch("/api/recovery", {
          signal: abort.signal,
          cache: "no-store",
        });
        setConfig(modelStatusSchema.parse(await status.json()));
      }
      if (!reply.ok)
        throw new Error(
          body?.error?.message ??
            "The model could not produce a validated recovery.",
        );
      abort.signal.throwIfAborted();
      const result = recoveryResultSchema.parse(body);
      const saved = await saveRecovery(taskDatabase(), task.id, result).catch(
        () => {
          throw new Error(
            "This suggestion could not be saved. The task or source check may have changed, or browser storage may be unavailable. Your checkpoint is intact; check its evidence and retry.",
          );
        },
      );
      if (abort.signal.aborted) return;
      setRecord(saved);
      setAction(saved.proposal.nextAction.instruction);
      setMessage(
        "Suggestion saved for your review. Confirmed progress and the checkpoint's saved action are unchanged.",
      );
    } catch (failure) {
      setError(
        abort.signal.aborted
          ? "Recovery cancelled. Your saved context is intact."
          : failure instanceof Error
            ? failure.message
            : "Recovery could not be validated. Retry or continue manually.",
      );
      setMessage("");
    } finally {
      controller.current = null;
      setBusy(false);
    }
  }
  async function review() {
    if (!record) return;
    setError("");
    try {
      const saved = await reviewRecovery(taskDatabase(), record.id, action);
      setRecord(saved);
      setMessage(
        "Reviewed action saved. Continue opens your original work link.",
      );
    } catch {
      setError(
        "Could not save the reviewed action. It may be outdated or storage may be unavailable. Request a fresh suggestion after checking the source.",
      );
    }
  }
  async function proceed() {
    if (!record) return;
    // Open in the user gesture, then resolve only the stored, reviewed work URL.
    const destination = window.open("about:blank", "_blank");
    if (destination) destination.opener = null;
    try {
      const url = await continuationTarget(taskDatabase(), record.id);
      if (destination) destination.location.replace(url);
      else
        setError(
          "The browser blocked the new tab. Use Open saved work manually below.",
        );
    } catch {
      destination?.close();
      setError(
        "This suggestion is outdated. Check the source and request recovery again before continuing.",
      );
    }
  }
  return (
    <main className="wrap-anywhere container mx-auto max-w-3xl grid gap-6 p-6">
      <header className="grid gap-2">
        <CardTitle>
          <h1>ReEntry · Recover your next step</h1>
        </CardTitle>
        <p>
          Inspect the suggestion, correct it if needed, and choose one next
          action.
        </p>
        <Button asChild variant="outline">
          <Link href="/checkpoints">Return to saved tasks</Link>
        </Button>
      </header>
      <p role="status" aria-live="polite">
        {loading ? "Opening recovery…" : message}
      </p>
      {error && (
        <Alert
          ref={errorRef}
          tabIndex={-1}
          variant="destructive"
          role="alert"
          aria-labelledby="recovery-error"
        >
          <AlertTitle id="recovery-error">Recovery needs attention</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {task && (
        <>
          <Card role="region" aria-label="Saved checkpoint">
            <CardHeader>
              <CardTitle>{task.goal}</CardTitle>
              <CardDescription>
                Your saved goal · revision {task.revision}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <h2>Confirmed progress</h2>
              <p>{task.progress}</p>
              <Button asChild variant="outline">
                <Link href={`/task?task=${task.id}`}>
                  Edit checkpoint and history
                </Link>
              </Button>
              <h2>Saved next action</h2>
              <p>{task.nextAction}</p>
            </CardContent>
          </Card>
          {record && (
            <section className="grid gap-4" aria-labelledby="recovery-heading">
              <h2 id="recovery-heading" tabIndex={-1} ref={resultRef}>
                Recovery suggestion · review required
              </h2>
              <Card>
                <CardHeader>
                  <CardTitle>
                    <h3>
                      {record.proposal.assessment === "uncertain"
                        ? "Clarification needed"
                        : record.proposal.assessment === "changed"
                          ? "Instructions affect your next step"
                          : "No material change identified"}
                    </h3>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <p>{record.proposal.summary}</p>
                  {record.proposal.changes.map((change, index) => (
                    <section
                      key={index}
                      className="grid gap-2"
                      aria-label={`Evidence ${index + 1}`}
                    >
                      <h3>{change.description}</h3>
                      <h3>Previously required</h3>
                      <p>{change.before.quote}</p>
                      <h3>Now required</h3>
                      <p>{change.after.quote}</p>
                    </section>
                  ))}
                  <Label htmlFor="reviewed-action">Reviewed next action</Label>
                  <Textarea
                    id="reviewed-action"
                    value={action}
                    onChange={(event) => setAction(event.target.value)}
                    maxLength={1000}
                    rows={3}
                  />
                  <Button
                    variant={
                      record.reviewedAction === action.trim()
                        ? "outline"
                        : "default"
                    }
                    disabled={!action.trim() || action.length > 1000}
                    onClick={() => void review()}
                  >
                    Save reviewed recovery
                  </Button>
                  <Button
                    disabled={
                      !record.reviewedAt ||
                      record.reviewedAction !== action.trim()
                    }
                    onClick={() => void proceed()}
                  >
                    Continue to saved work
                  </Button>
                </CardContent>
              </Card>
              <section aria-label="Questions">
                <h2>Questions</h2>
                {record.proposal.questions.length ? (
                  record.proposal.questions.map((question, index) => (
                    <p key={index}>{question}</p>
                  ))
                ) : (
                  <p>
                    No questions proposed. Check the evidence before continuing.
                  </p>
                )}
              </section>
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="outline">Model run details</Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="grid gap-2 p-3">
                  <p>
                    Run: {record.execution.provider} · {record.execution.model}{" "}
                    · {record.execution.durationMs} ms · prompt{" "}
                    {record.execution.promptVersion} · schema{" "}
                    {record.execution.schemaVersion}
                  </p>
                  <p>
                    Model digest:{" "}
                    {record.execution.modelDigest ?? "Not supplied by provider"}
                  </p>
                </CollapsibleContent>
              </Collapsible>
            </section>
          )}
          <section className="grid gap-3" aria-label="Model connection">
            <p>
              {config?.enabled
                ? config.processing === "hosted"
                  ? `Hosted inference · NVIDIA · ${config.model}. Your goal, confirmed progress, saved next action and captured instruction text will leave this computer and be sent to NVIDIA when you generate a suggestion.`
                  : `Local inference · ${config.provider} · ${config.model}. Your goal, confirmed progress, saved next action and captured instructions are sent to Ollama on this computer.`
                : "AI is not configured. Choose a model in server settings, or continue manually."}
            </p>
            <p>
              Suggestions can be wrong. Evidence validation checks references
              and quotes; you still review the interpretation.
            </p>
            {config?.processing === "hosted" && (
              <div className="flex items-start gap-3">
                <Checkbox
                  id="hosted-consent"
                  checked={consentFor === config.consentId}
                  onCheckedChange={(value) =>
                    setConsentFor(
                      value === true ? (config.consentId ?? null) : null,
                    )
                  }
                />
                <Label htmlFor="hosted-consent">
                  I agree to send this task context to NVIDIA using{" "}
                  {config.model} for this recovery.
                </Label>
              </div>
            )}
            <Button
              variant={record ? "outline" : "default"}
              disabled={
                loading ||
                busy ||
                !eligible ||
                !config?.enabled ||
                (config.processing === "hosted" &&
                  consentFor !== config.consentId)
              }
              onClick={() => void generate()}
            >
              Generate recovery suggestion
            </Button>
            {busy && (
              <Button
                variant="outline"
                onClick={() => controller.current?.abort()}
              >
                Cancel recovery
              </Button>
            )}
          </section>
          <section
            className="grid gap-3"
            aria-label="Manual recovery and materials"
          >
            <h2>Saved materials and manual recovery</h2>
            <Button asChild variant="outline">
              <Link href={`/check?task=${task.id}`}>
                Inspect source evidence
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link
                href={task.workUrl}
                target="_blank"
                rel="noreferrer"
                prefetch={false}
              >
                Open saved work manually
              </Link>
            </Button>
            {task.materialUrls.map((url) => (
              <p key={url}>
                <Link
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  prefetch={false}
                >
                  Supporting material {task.materialUrls.indexOf(url) + 1}
                </Link>
              </p>
            ))}
            <p>
              Your confirmed progress and original checkpoint are preserved.
              This app does not fill or submit the external form.
            </p>
          </section>
        </>
      )}
    </main>
  );
}
