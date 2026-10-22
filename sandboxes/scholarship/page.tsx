import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  FileText,
  GraduationCap,
  Info,
  Save,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  completion,
  DRAFT_KEY,
  draftSchema,
  emptyDraft,
  requirements,
  scenarioSchema,
} from "./model";
import type { ApplicationDraft, Version } from "./model";

function readDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return {
      draft: raw ? draftSchema.parse(JSON.parse(raw)) : { ...emptyDraft },
      saved: Boolean(raw),
      error: "",
    };
  } catch {
    return {
      draft: { ...emptyDraft },
      saved: false,
      error:
        "The saved demo draft could not be read. You can fill a new draft; saving it will replace the old demo draft.",
    };
  }
}

export default function ScholarshipPortal() {
  const application = location.pathname.endsWith("application.html");
  const [initial] = useState(readDraft);
  const [draft, setDraft] = useState(initial.draft);
  const [savedDraft, setSavedDraft] = useState(JSON.stringify(initial.draft));
  const [hasSaved, setHasSaved] = useState(initial.saved);
  const [version, setVersion] = useState<Version>();
  const [sourceError, setSourceError] = useState(false);
  const [error, setError] = useState(initial.error);
  const [status, setStatus] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetError, setResetError] = useState("");
  const dirty = JSON.stringify(draft) !== savedDraft;
  const checklist = version ? completion(draft, version) : [];
  const completed = checklist.filter((item) => item.complete).length;

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    const timeout = setTimeout(() => controller.abort(), 10_000);
    fetch("./scenario.json", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Source unavailable");
        const scenario = scenarioSchema.parse(await response.json());
        setVersion(scenario.version);
      })
      .catch(() => {
        if (!disposed) setSourceError(true);
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      disposed = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  function update<K extends keyof ApplicationDraft>(
    key: K,
    value: ApplicationDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
    setStatus("");
  }

  function save(event: FormEvent) {
    event.preventDefault();
    try {
      const value = JSON.stringify(draftSchema.parse(draft));
      localStorage.setItem(DRAFT_KEY, value);
      setSavedDraft(value);
      setHasSaved(true);
      setError("");
      setStatus(
        "Draft saved in this browser. You can close this page and return later.",
      );
    } catch {
      setError(
        "Your draft could not be saved. Keep this page open and try again.",
      );
      setStatus("");
    }
  }

  function reset() {
    try {
      localStorage.removeItem(DRAFT_KEY);
      setDraft({ ...emptyDraft });
      setSavedDraft(JSON.stringify(emptyDraft));
      setHasSaved(false);
      setError("");
      setStatus("Demo draft reset. Your ReEntry checkpoints have not changed.");
      setResetOpen(false);
    } catch {
      setResetError(
        "The demo draft could not be reset. Try again when browser storage is available.",
      );
    }
  }

  function selectRequirements() {
    const element = document.getElementById("instructions");
    if (!element) return;
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    setStatus(
      "Requirements selected. Use the ReEntry extension to capture them.",
    );
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-6 wrap-anywhere">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <GraduationCap size={36} aria-hidden="true" />
          <div>
            <CardTitle>Northstar Foundation</CardTitle>
            <CardDescription>
              Opportunity programme · Applicant portal
            </CardDescription>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline">Fictional demo</Badge>
          <Badge variant="secondary">2026 / 27</Badge>
        </div>
      </header>
      <Separator />
      <Alert role="note">
        <Info aria-hidden="true" />
        <AlertTitle>A demonstration you can safely explore</AlertTitle>
        <AlertDescription>
          Fictional award, applicant and requirements. Nothing is submitted and
          no real documents are uploaded. Use sample information only.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardDescription>Education opens the next door.</CardDescription>
          <CardTitle>
            <h1>
              {application
                ? "Your scholarship application"
                : "Northstar Opportunity Award"}
            </h1>
          </CardTitle>
          <CardDescription>
            {application
              ? "Make a little progress, save your draft, and come back when you’re ready."
              : "Support for students taking the next step in their education. Prepare your materials at your own pace."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6">
          <div className="flex grow flex-col gap-2">
            <CardDescription>Study grant</CardDescription>
            <CardTitle>₹50,000</CardTitle>
            <CardDescription>
              One academic year · fictional award
            </CardDescription>
          </div>
          <div className="flex grow flex-col gap-2">
            <CardDescription>Application closes</CardDescription>
            <CardTitle>31 October 2026</CardTitle>
            <CardDescription>
              17:00 IST · demonstration deadline
            </CardDescription>
          </div>
          <div className="flex grow flex-col gap-2">
            <CardDescription>Your draft</CardDescription>
            <CardTitle>
              {version
                ? `${completed} of 4 sections ready`
                : "Checking requirements…"}
            </CardTitle>
            <Progress
              value={completed * 25}
              aria-label="Application preparation progress"
            />
            <CardDescription>
              {dirty
                ? "Unsaved changes"
                : hasSaved
                  ? "Saved in this browser"
                  : "Sample profile · not saved yet"}
            </CardDescription>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-3">
          <Button
            variant={application ? "outline" : "default"}
            onClick={() => {
              location.href = application
                ? "./instructions.html"
                : "./application.html";
            }}
          >
            {application ? (
              <ArrowLeft aria-hidden="true" />
            ) : (
              <ArrowUpRight aria-hidden="true" />
            )}
            {application
              ? "View award requirements"
              : hasSaved
                ? "Continue application draft"
                : "Start application draft"}
          </Button>
          <CardDescription>No account needed for this demo.</CardDescription>
        </CardFooter>
      </Card>

      {sourceError ? (
        <Alert>
          <AlertTitle>Requirements could not be loaded</AlertTitle>
          <AlertDescription>
            Do not assume the old requirements still apply. Reload this page to
            try again. Your saved application draft is unchanged.
            <Button variant="outline" onClick={() => location.reload()}>
              Reload requirements
            </Button>
          </AlertDescription>
        </Alert>
      ) : !version ? (
        <Skeleton aria-label="Loading award requirements" />
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          <section
            className="flex min-w-0 flex-col gap-6 lg:col-span-2"
            aria-label={application ? "Application draft" : "Award information"}
          >
            {version === "v2" && (
              <Alert role="note">
                <Info aria-hidden="true" />
                <AlertTitle>Application guidance has been updated</AlertTitle>
                <AlertDescription>
                  Two referees are now required. Existing drafts are retained;
                  please review the current requirements before continuing.
                </AlertDescription>
              </Alert>
            )}
            {!application ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <h2>What you’ll need</h2>
                    </CardTitle>
                    <CardDescription>
                      Read these requirements before completing your draft.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-6">
                    <Alert role="note">
                      <BookOpen aria-hidden="true" />
                      <AlertTitle>Application requirements</AlertTitle>
                      <AlertDescription>
                        <p id="instructions">{requirements[version]}</p>
                      </AlertDescription>
                    </Alert>
                    <div className="flex flex-col gap-4">
                      <div className="flex items-start gap-3">
                        <FileText aria-hidden="true" />
                        <div>
                          <CardTitle>Academic transcript</CardTitle>
                          <CardDescription>
                            A copy of your current academic record. This demo
                            offers a sample attachment.
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <GraduationCap aria-hidden="true" />
                        <div>
                          <CardTitle>
                            {version === "v2"
                              ? "Two academic or professional referees"
                              : "One academic or professional referee"}
                          </CardTitle>
                          <CardDescription>
                            Choose someone who knows your work. Save their name
                            in your application draft.
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <BookOpen aria-hidden="true" />
                        <div>
                          <CardTitle>A personal statement</CardTitle>
                          <CardDescription>
                            Describe what you hope to study and how this support
                            would help. You can save an unfinished statement.
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" onClick={selectRequirements}>
                      Select requirements for capture
                    </Button>
                  </CardFooter>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <h2>Who this award is for</h2>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <p>
                      Students preparing for further education who can explain
                      their learning goals and the support they need.
                    </p>
                    <p>
                      You can prepare your application in several visits. Save
                      your draft before leaving this portal.
                    </p>
                    <CardDescription>
                      All eligibility information on this page is fictional.
                    </CardDescription>
                  </CardContent>
                </Card>
              </>
            ) : (
              <form className="flex flex-col gap-6" onSubmit={save}>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <h2>1. Applicant details</h2>
                    </CardTitle>
                    <CardDescription>
                      A fictional profile is provided to get you started.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="applicant-name">Full name</Label>
                      <Input
                        id="applicant-name"
                        maxLength={120}
                        value={draft.name}
                        onChange={(event) => update("name", event.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="applicant-email">Email address</Label>
                      <Input
                        id="applicant-email"
                        type="email"
                        maxLength={200}
                        value={draft.email}
                        onChange={(event) =>
                          update("email", event.target.value)
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="applicant-college">
                        School or college
                      </Label>
                      <Input
                        id="applicant-college"
                        maxLength={200}
                        value={draft.college}
                        onChange={(event) =>
                          update("college", event.target.value)
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <h2>2. Personal statement</h2>
                    </CardTitle>
                    <CardDescription>
                      What would you like to study, and why does it matter to
                      you?
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-2">
                    <Label htmlFor="statement">Your statement</Label>
                    <Textarea
                      id="statement"
                      rows={6}
                      maxLength={6000}
                      value={draft.statement}
                      onChange={(event) =>
                        update("statement", event.target.value)
                      }
                      placeholder="Start with a few sentences. You can finish this later."
                    />
                    <CardDescription>
                      {draft.statement.trim()
                        ? draft.statement.trim().split(/\s+/).length
                        : 0}{" "}
                      words · drafts can be incomplete
                    </CardDescription>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <h2>3. Supporting document</h2>
                    </CardTitle>
                    <CardDescription>
                      Sample attachment only; no file leaves your computer.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <FileText aria-hidden="true" />
                      <div>
                        <CardTitle>
                          {draft.transcript
                            ? "Sample-transcript.pdf"
                            : "Academic transcript"}
                        </CardTitle>
                        <CardDescription>
                          {draft.transcript
                            ? "Demo attachment added · save the draft to keep it"
                            : "Add a fictional transcript to practice pausing here."}
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => update("transcript", !draft.transcript)}
                    >
                      {draft.transcript
                        ? "Remove sample transcript"
                        : "Attach sample transcript"}
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <h2>4. Referees</h2>
                    </CardTitle>
                    <CardDescription>
                      {version === "v2"
                        ? "Current guidance requires two referees."
                        : "Current guidance requires one referee."}{" "}
                      No invitations are sent.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="referee-one">First referee</Label>
                      <Input
                        id="referee-one"
                        value={draft.refereeOne}
                        maxLength={120}
                        onChange={(event) =>
                          update("refereeOne", event.target.value)
                        }
                        placeholder="Sample referee name"
                      />
                    </div>
                    {version === "v2" && (
                      <div className="grid gap-2">
                        <Label htmlFor="referee-two">Second referee</Label>
                        <Input
                          id="referee-two"
                          value={draft.refereeTwo}
                          maxLength={120}
                          onChange={(event) =>
                            update("refereeTwo", event.target.value)
                          }
                          placeholder="Add the additional referee"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
                <div className="flex flex-wrap gap-3">
                  <Button type="submit">
                    <Save aria-hidden="true" />
                    Save application draft
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline">
                        Review application
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Application review</DialogTitle>
                        <DialogDescription>
                          A preparation summary only. This demo does not submit
                          applications.
                        </DialogDescription>
                      </DialogHeader>
                      <dl className="grid gap-3">
                        {checklist.map((item) => (
                          <div
                            key={item.label}
                            className="flex flex-wrap justify-between gap-2"
                          >
                            <dt>{item.label}</dt>
                            <dd>
                              <Badge
                                variant={
                                  item.complete ? "secondary" : "outline"
                                }
                              >
                                {item.complete ? "Ready" : "Still to do"}
                              </Badge>
                            </dd>
                          </div>
                        ))}
                      </dl>
                      {dirty && (
                        <p>Save your draft to keep your latest changes.</p>
                      )}
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button type="button" variant="outline">
                            Back to draft
                          </Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </form>
            )}
          </section>
          <aside
            className="flex min-w-0 flex-col gap-6"
            aria-label="Preparation checklist"
          >
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>Your preparation checklist</h2>
                </CardTitle>
                <CardDescription>
                  {application
                    ? "Reflects the fields in this draft."
                    : "Reflects your saved application draft."}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {checklist.map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-wrap items-center justify-between gap-2"
                  >
                    <span>{item.label}</span>
                    <Badge variant={item.complete ? "secondary" : "outline"}>
                      {item.complete && <Check aria-hidden="true" />}
                      {item.complete ? "Ready" : "To do"}
                    </Badge>
                  </div>
                ))}
                <Separator />
                <CardDescription>
                  Application progress belongs to this portal. ReEntry records
                  only the progress you explicitly confirm.
                </CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>Take it one step at a time</h2>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p>
                  Your draft stays in this browser after you save it. Return
                  using the same browser profile and address.
                </p>
                <CardDescription>
                  Need a place to pause? Save your draft, then capture the award
                  requirements with ReEntry.
                </CardDescription>
              </CardContent>
            </Card>
          </aside>
        </div>
      )}

      {error && (
        <Alert>
          <AlertTitle>Draft storage needs attention</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <p role="status" aria-live="polite">
        {status}
      </p>
      <Separator />
      <footer className="flex flex-col gap-4">
        <CardDescription>
          Northstar is a fictional portal built for the ReEntry demonstration.
          This site runs separately from ReEntry.
        </CardDescription>
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost">
              Demo setup and reset <ChevronDown aria-hidden="true" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="flex flex-col gap-4 p-4">
            <p>
              Capture the requirements, save a checkpoint in ReEntry, then
              change the source in a terminal and reload this page. The
              application draft is retained.
            </p>
            <p>
              <code>pnpm sandbox:switch v2</code> changes one referee to two.{" "}
              <code>pnpm sandbox:switch cosmetic</code> changes punctuation
              only. <code>pnpm sandbox:switch v1</code> restores the initial
              requirements.
            </p>
            <p>
              Your work link is{" "}
              <code>{new URL("./application.html", location.href).href}</code>.
            </p>
            <Dialog
              open={resetOpen}
              onOpenChange={(open) => {
                setResetOpen(open);
                setResetError("");
              }}
            >
              <DialogTrigger asChild>
                <Button variant="outline">Reset demo application draft</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reset the demo application?</DialogTitle>
                  <DialogDescription>
                    This removes only the fictional portal’s draft in this
                    browser. Your ReEntry checkpoints and the current
                    requirements are kept.
                  </DialogDescription>
                </DialogHeader>
                {resetError && (
                  <Alert>
                    <AlertTitle>Reset failed</AlertTitle>
                    <AlertDescription>{resetError}</AlertDescription>
                  </Alert>
                )}
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Keep draft</Button>
                  </DialogClose>
                  <Button variant="destructive" onClick={reset}>
                    Reset draft
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CollapsibleContent>
        </Collapsible>
      </footer>
    </main>
  );
}
