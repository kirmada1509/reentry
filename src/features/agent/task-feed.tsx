"use client";
import { useRef, useState } from "react";
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

import { reminderPolicySchema } from "./recovery-schema";
import type { RecoveryView } from "./recovery-schema";

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

function ReminderSettings({
  recovery,
  act,
  busy,
  allowReminders,
  remindersReady,
}: {
  recovery: RecoveryView;
  act: Action;
  busy: boolean;
  allowReminders?: () => Promise<boolean>;
  remindersReady?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const attempt = useRef(0);
  const [draft, setDraft] = useState(recovery.policy);
  const [version, setVersion] = useState(recovery.version);
  const [error, setError] = useState("");
  const time = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  const minutes = (value: string) => {
    const [h, m] = value.split(":").map(Number);
    return h! * 60 + m!;
  };
  async function save() {
    const valid = reminderPolicySchema.safeParse(draft);
    if (!valid.success) {
      setError(valid.error.issues[0]?.message ?? "Review these settings.");
      return;
    }
    const currentAttempt = ++attempt.current;
    setSaving(true);
    try {
      const allowed =
        !valid.data.enabled || !allowReminders || (await allowReminders());
      if (currentAttempt !== attempt.current) return;
      if (!allowed) {
        setError(
          "Chrome notifications and idle detection were not allowed. Reminders have not been enabled. You can try again when ready.",
        );
        return;
      }
      await act({
        action: "reminder_policy",
        policy: valid.data,
        expectedVersion: version,
      });
      setOpen(false);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not save. Your settings are still here.",
      );
    } finally {
      if (currentAttempt === attempt.current) setSaving(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        attempt.current++;
        setSaving(false);
        setOpen(value);
        if (value) {
          setDraft({
            ...recovery.policy,
            timeZone:
              recovery.version === 0
                ? Intl.DateTimeFormat().resolvedOptions().timeZone
                : recovery.policy.timeZone,
          });
          setVersion(recovery.version);
          setError("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">Reminder settings</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>A gentle way back</DialogTitle>
          <DialogDescription>
            Optional local reminders for unfinished purchases and applications.
            Possible research tasks are never treated as obligations.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <Checkbox
              disabled={saving || busy}
              id="reminders-enabled"
              checked={draft.enabled}
              onCheckedChange={(v) =>
                setDraft({ ...draft, enabled: v === true })
              }
            />
            <Label htmlFor="reminders-enabled">Enable gentle reminders</Label>
          </div>
          <Label htmlFor="reminder-away">
            Minutes away before reminding (15–240)
          </Label>
          <Input
            disabled={saving || busy}
            id="reminder-away"
            type="number"
            min={15}
            max={240}
            value={draft.awayMinutes}
            onChange={(e) =>
              setDraft({ ...draft, awayMinutes: Number(e.target.value) })
            }
          />
          <div className="flex items-start gap-2">
            <Checkbox
              disabled={saving || busy}
              id="reminder-quiet"
              checked={draft.quietEnabled}
              onCheckedChange={(v) =>
                setDraft({ ...draft, quietEnabled: v === true })
              }
            />
            <Label htmlFor="reminder-quiet">Keep quiet hours</Label>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="quiet-start">Quiet hours start</Label>
              <Input
                disabled={saving || busy}
                id="quiet-start"
                type="time"
                value={time(draft.quietStart)}
                onChange={(e) =>
                  setDraft({ ...draft, quietStart: minutes(e.target.value) })
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="quiet-end">Quiet hours end</Label>
              <Input
                disabled={saving || busy}
                id="quiet-end"
                type="time"
                value={time(draft.quietEnd)}
                onChange={(e) =>
                  setDraft({ ...draft, quietEnd: minutes(e.target.value) })
                }
              />
            </div>
          </div>
          <Label htmlFor="reminder-zone">Reminder timezone</Label>
          <Input
            disabled={saving || busy}
            id="reminder-zone"
            value={draft.timeZone}
            onChange={(e) => setDraft({ ...draft, timeZone: e.target.value })}
          />
          <p>
            At most one reminder per task per day. No website deadline is
            inferred.
          </p>
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost">Delivery and permission details</Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="flex flex-col gap-3 pt-3">
              <p>
                Waiting tasks and snoozed or cancelled reminders stay quiet.
                Chrome and the local ReEntry server must be available. Sleep,
                browser exit, outages and system notification settings can delay
                or prevent delivery. Interrupted attempts are not resent
                automatically.
              </p>
              <p>
                {allowReminders
                  ? remindersReady
                    ? "Chrome reminder permission is allowed."
                    : "Saving with reminders enabled asks Chrome for notification and idle-detection permission."
                  : "Chrome permission is managed separately: open Reminder settings in the browser companion and save with reminders enabled."}
              </p>
            </CollapsibleContent>
          </Collapsible>
          {saving && (
            <p role="status">
              Saving settings; Chrome may be waiting for a permission choice.
              You can cancel.
            </p>
          )}
          {error && <p role="alert">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button disabled={busy || saving} onClick={() => void save()}>
            Save reminder settings
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
  allowReminders,
  remindersReady,
}: {
  data: AgentView | null;
  act: Action;
  busy: boolean;
  canEnable: boolean;
  sessionId: string | null;
  allowReminders?: () => Promise<boolean>;
  remindersReady?: boolean;
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
          <p>
            {data.recovery.policy.enabled
              ? `Gentle reminders are enabled after ${data.recovery.policy.awayMinutes} minutes away.`
              : "Gentle reminders are off."}
          </p>
          <ReminderSettings
            recovery={data.recovery}
            act={act}
            busy={busy}
            allowReminders={allowReminders}
            remindersReady={remindersReady}
          />
          {data.recovery.deliveryFailed && (
            <p role="status">
              A local notification could not be delivered. Your task is safe;
              check Chrome and system notification settings. It will not be
              resent today.
            </p>
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
                schedule reminders. Local reminders use your separate policy.
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
      {data.tasks.map((task) => {
        const recovery = data.recovery.items.find((r) => r.taskId === task.id);
        const unfinished = !["completed", "cancelled"].includes(task.stage);
        return (
          <Card key={task.id} id={`task-${task.id}`}>
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
              {unfinished && recovery && (
                <p>
                  {recovery.state === "waiting"
                    ? "Waiting — reminders are paused until you resume."
                    : recovery.state === "returned"
                      ? "Welcome back. Your last progress and next step are below."
                      : recovery.state === "interrupted"
                        ? "Ready whenever you are. Here’s where you left off."
                        : recovery.state === "active"
                          ? "With you on this task."
                          : "Your place is saved."}
                </p>
              )}
              <p>Finished would mean: {task.finishCondition}</p>
              {task.progress.length > 0 && (
                <p>Last observed: {task.progress.at(-1)!.summary}</p>
              )}
              <p>Next: {task.nextAction}</p>
              {unfinished && recovery?.url && (
                <Button
                  onClick={() =>
                    window.open(recovery.url!, "_blank", "noopener,noreferrer")
                  }
                >
                  Return to work
                </Button>
              )}
              {unfinished && recovery && (
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost">Return and reminder options</Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="flex flex-col gap-3 pt-3">
                    <p>
                      Last active:{" "}
                      {new Date(recovery.lastActive).toLocaleString()}. Activity
                      means a visible enabled page, not verified work.
                    </p>
                    <p>
                      Return links keep the page path, without query strings or
                      fragments. The external site owns your draft; some pages
                      may need navigation after opening. Links stay local and
                      are excluded from AI prompts.
                    </p>
                    <p>
                      {recovery.muted
                        ? "Reminders cancelled for this task."
                        : recovery.snoozedUntil
                          ? `Snoozed until ${new Date(recovery.snoozedUntil).toLocaleString()}.`
                          : "This task follows your reminder policy."}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          quiet({
                            action: "recovery",
                            id: task.id,
                            expectedRevision: task.revision,
                            change:
                              recovery.state === "waiting" ? "resume" : "wait",
                          })
                        }
                      >
                        {recovery.state === "waiting"
                          ? "Resume this task"
                          : "Waiting for something"}
                      </Button>
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          quiet({
                            action: "recovery",
                            id: task.id,
                            expectedRevision: task.revision,
                            change: "snooze",
                          })
                        }
                      >
                        Snooze for one hour
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          quiet({
                            action: "recovery",
                            id: task.id,
                            expectedRevision: task.revision,
                            change: recovery.muted ? "unmute" : "mute",
                          })
                        }
                      >
                        {recovery.muted
                          ? "Allow reminders for this task"
                          : "Cancel reminders for this task"}
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
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
                        prevent delayed observations from bringing it back.
                        Clear browser-agent data to reset these markers.
                      </DialogDescription>
                    </DialogHeader>
                    {confirmationError && (
                      <p role="alert">{confirmationError}</p>
                    )}
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
        );
      })}
    </section>
  );
}
