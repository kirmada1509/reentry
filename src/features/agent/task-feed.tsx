"use client";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Checkbox } from "../../components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../components/ui/collapsible";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { taskDescriptionSchema } from "./schema";
import type { AgentAction, AgentTask, AgentView } from "./schema";

type Action = (action: AgentAction) => Promise<void>;
function TaskCorrection({
  task,
  act,
  busy,
}: {
  task: AgentTask;
  act: Action;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [goal, setGoal] = useState(task.goal);
  const [finish, setFinish] = useState(task.finishCondition);
  const [intent, setIntent] = useState(task.intent);
  const [revision, setRevision] = useState(task.revision);
  const [error, setError] = useState("");
  async function save() {
    const value = taskDescriptionSchema.safeParse({
      goal,
      finishCondition: finish,
      intent,
    });
    if (!value.success) {
      setError(
        "Use a goal of 3–160 characters and a finish condition of 3–240 characters.",
      );
      return;
    }
    try {
      await act({
        action: "correct",
        id: task.id,
        expectedRevision: revision,
        ...value.data,
      });
      setOpen(false);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not save. Your input is still here.",
      );
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) {
          setGoal(task.goal);
          setFinish(task.finishCondition);
          setIntent(task.intent);
          setRevision(task.revision);
          setError("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">Correct this task</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keep it true to your intent</DialogTitle>
          <DialogDescription>
            Your goal, intent and finish condition take priority over later AI
            guesses.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Label htmlFor={`goal-${task.id}`}>Goal</Label>
          <Input
            id={`goal-${task.id}`}
            value={goal}
            maxLength={160}
            onChange={(e) => setGoal(e.target.value)}
          />
          <Label htmlFor={`intent-${task.id}`}>Intent</Label>
          <Select
            value={intent}
            onValueChange={(value) => setIntent(value as AgentTask["intent"])}
          >
            <SelectTrigger id={`intent-${task.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="research">Research or compare</SelectItem>
              <SelectItem value="purchase">Buy something</SelectItem>
              <SelectItem value="application">
                Work on an application
              </SelectItem>
            </SelectContent>
          </Select>
          <Label htmlFor={`finish-${task.id}`}>
            What would finished look like?
          </Label>
          <Input
            id={`finish-${task.id}`}
            value={finish}
            maxLength={240}
            onChange={(e) => setFinish(e.target.value)}
          />
          {error && <p role="alert">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button disabled={busy} onClick={() => void save()}>
            Save correction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TaskFeed({
  data,
  act,
  busy,
  canEnable,
  sessionId,
}: {
  data: AgentView | null;
  act: Action;
  busy: boolean;
  canEnable: boolean;
  sessionId: string | null;
}) {
  const quiet = (action: AgentAction) => {
    void act(action).catch(() => undefined);
  };
  const [deleting, setDeleting] = useState<{
    id: string;
    revision: number;
  } | null>(null);
  const [confirmationError, setConfirmationError] = useState("");
  const confirm = async (action: AgentAction) => {
    try {
      await act(action);
    } catch (error) {
      setConfirmationError(
        error instanceof Error
          ? error.message
          : "Could not save. Close and review before retrying.",
      );
    }
  };
  const [agreement, setAgreement] = useState<string | null>(null);
  const agreementKey = (data?.processing.consentId ?? "") + (sessionId ?? "");
  const agreed = agreement === agreementKey;
  if (!data) return <p role="status">Loading your tasks…</p>;
  const notices = {
    off: "AI task understanding is off.",
    ready: "Ready to notice your next step.",
    thinking: "Making sense of the latest page…",
    unavailable:
      "The last AI update could not be validated. Existing tasks are safe. Retry when ready.",
    budget:
      "The hourly AI budget is reached. Observation continues; queued work waits until calls become available.",
    "needs-consent":
      "The model configuration changed. Review the current processing notice to continue.",
  };
  return (
    <section className="flex flex-col gap-4" aria-label="Automatic tasks">
      <Card>
        <CardHeader>
          <CardTitle>A place for what’s in progress</CardTitle>
          <CardDescription>
            Tasks and finish conditions inferred from the sites you enable. You
            can correct them at any time.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p role="status" aria-live="polite">
            {notices[data.status]}
          </p>
          {!data.enabled ? (
            <>
              <p>
                {data.processing.available
                  ? `${data.processing.provider} · ${data.processing.model}`
                  : "No AI provider is configured on the local server."}
              </p>
              <p>
                {data.processing.hosted
                  ? "NVIDIA receives bounded page text, site origins, field labels/statuses and task context from your enabled sites, including the latest observation. This runs automatically while the local server is on, even with this tab closed. The reader reduces sensitive data but cannot remove every personal detail."
                  : "The local model receives bounded observations and task context from your enabled sites, including the latest observation. Processing runs automatically while the local server is on."}
              </p>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="agent-agreement"
                  checked={agreed}
                  onCheckedChange={(v) =>
                    setAgreement(v === true ? agreementKey : null)
                  }
                />
                <Label htmlFor="agent-agreement">
                  {data.processing.hosted
                    ? "Allow automatic NVIDIA processing for this site session"
                    : "Allow automatic local AI processing for this site session"}
                </Label>
              </div>
              <Button
                disabled={
                  busy ||
                  !agreed ||
                  !canEnable ||
                  !sessionId ||
                  !data.processing.available
                }
                onClick={() => {
                  if (sessionId)
                    quiet({
                      action: "enable",
                      consentId: data.processing.consentId,
                      sessionId,
                    });
                }}
              >
                Enable task understanding
              </Button>
              {!canEnable && (
                <p>Connect the browser and enable site observation first.</p>
              )}
            </>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => quiet({ action: "disable" })}
              >
                Pause AI understanding
              </Button>
              {data.status === "unavailable" && (
                <Button
                  disabled={busy}
                  onClick={() => quiet({ action: "retry" })}
                >
                  Retry AI update
                </Button>
              )}
            </div>
          )}
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost">How ReEntry reaches a conclusion</Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="flex flex-col gap-3 pt-3">
              <p>
                Up to three model calls per decision and 30 per hour. ReEntry
                can read recent evidence and task history, then propose a task.
                It cannot act on websites, place orders, submit applications or
                send reminders.
              </p>
              <p>
                Research is a possibility, not an obligation. Progress is an AI
                interpretation. Fresh matching confirmations can finish
                uncorrected purchase/application tasks after a final review in
                the same tab. Corrected goals require your review. Task
                summaries and short evidence excerpts stay locally until
                cleared. Changing the site session requires agreement again.
              </p>
              <p>
                {data.callsRemaining} model calls remain in the current hourly
                window.
              </p>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
      {!data.tasks.length && data.enabled && (
        <Alert>
          <AlertTitle>Nothing to carry yet</AlertTitle>
          <AlertDescription>
            Browse an application or compare a product on an enabled site. Tasks
            appear here without a checkpoint form.
          </AlertDescription>
        </Alert>
      )}
      {data.tasks.map((task) => (
        <Card key={task.id}>
          <CardHeader>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {task.stage === "candidate"
                  ? "Possible task"
                  : task.stage === "uncertain"
                    ? "Needs clarity"
                    : task.stage === "completed"
                      ? task.completedBy === "user"
                        ? "Marked finished by you"
                        : "Confirmation observed"
                      : task.stage === "cancelled"
                        ? "Cancelled"
                        : "In progress"}
              </Badge>
              {task.corrected && (
                <Badge variant="outline">Your correction</Badge>
              )}
            </div>
            <CardTitle>{task.goal}</CardTitle>
            <CardDescription>
              {task.origin} ·{" "}
              {task.intent === "research"
                ? "Research, with no purchase obligation"
                : "AI interpretation"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p>Finished would mean: {task.finishCondition}</p>
            <p>Next: {task.nextAction}</p>
            {task.progress.length > 0 && (
              <p>Last observed: {task.progress.at(-1)!.summary}</p>
            )}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost">Why this task?</Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="flex flex-col gap-3 pt-3">
                {task.evidence.map((e, i) => (
                  <p key={i}>“{e.quote}”</p>
                ))}
                <p>
                  These are observations interpreted by AI, not user-confirmed
                  facts or independent verification by the website’s server.
                </p>
                <ol className="flex flex-col gap-3">
                  {task.progress.map((point, index) => (
                    <li key={`${point.eventId}-${index}`}>
                      <p>
                        {point.kind.replaceAll("_", " ")} ·{" "}
                        {new Date(point.observedAt).toLocaleString()}
                      </p>
                      <p>{point.summary}</p>
                      {point.evidence.map((e, i) => (
                        <p key={i}>“{e.quote}”</p>
                      ))}
                    </li>
                  ))}
                </ol>
              </CollapsibleContent>
            </Collapsible>
            <div className="flex flex-wrap gap-2">
              <TaskCorrection task={task} act={act} busy={busy} />
              {!["completed", "cancelled"].includes(task.stage) && (
                <Dialog
                  onOpenChange={(open) => {
                    if (open) {
                      setDeleting({ id: task.id, revision: task.revision });
                      setConfirmationError("");
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline">Mark finished</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Is this task finished?</DialogTitle>
                      <DialogDescription>
                        This records your confirmation. It does not verify a
                        website receipt or submit anything.
                      </DialogDescription>
                    </DialogHeader>
                    {confirmationError && (
                      <p role="alert">{confirmationError}</p>
                    )}
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Keep in progress</Button>
                      </DialogClose>
                      <Button
                        disabled={busy}
                        onClick={() =>
                          void confirm({
                            action: "finish",
                            id: task.id,
                            expectedRevision:
                              deleting?.id === task.id
                                ? deleting.revision
                                : task.revision,
                          })
                        }
                      >
                        Yes, mark finished
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              {["completed", "cancelled"].includes(task.stage) && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    quiet({
                      action: "reopen",
                      id: task.id,
                      expectedRevision: task.revision,
                    })
                  }
                >
                  Reopen task
                </Button>
              )}
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  quiet({
                    action: "dismiss",
                    id: task.id,
                    expectedRevision: task.revision,
                  })
                }
              >
                Dismiss on these pages
              </Button>
              <Dialog
                onOpenChange={(open) => {
                  if (open) {
                    setDeleting({ id: task.id, revision: task.revision });
                    setConfirmationError("");
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button variant="ghost">Delete task</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete this automatic task?</DialogTitle>
                    <DialogDescription>
                      Remove its progress and history. Minimal page markers
                      prevent delayed observations from bringing it back. Clear
                      browser-agent data to reset these markers.
                    </DialogDescription>
                  </DialogHeader>
                  {confirmationError && <p role="alert">{confirmationError}</p>}
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Keep task</Button>
                    </DialogClose>
                    <Button
                      disabled={busy}
                      onClick={() =>
                        void confirm({
                          action: "delete",
                          id: task.id,
                          expectedRevision:
                            deleting?.id === task.id
                              ? deleting.revision
                              : task.revision,
                        })
                      }
                    >
                      Delete task and history
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
