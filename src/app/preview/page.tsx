"use client";

import { cloneElement, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Leaf,
  Pause,
  Play,
  ShoppingBag,
} from "lucide-react";
import TypographyH1 from "@/components/typography-h1";
import TypographyLead from "@/components/typography-lead";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Item,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
  ItemGroup,
  ItemMedia,
} from "@/components/ui/item";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  changePreview,
  previewCopy,
  resetPreview,
  scenarios,
  usePreview,
} from "@/features/preview/model";

export default function Preview() {
  const state = usePreview();
  const copy = previewCopy(state.scenario);
  const compact = state.view === "companion";
  const [correction, setCorrection] = useState("");
  const [dialog, setDialog] = useState(false);
  const [message, setMessage] = useState("");
  const paused = state.scenario === "paused";
  const empty = state.scenario === "empty" || state.scenario === "observing";
  const problem = ["offline", "denied", "unavailable"].includes(state.scenario);
  const title = state.research
    ? "Research the Northstar scholarship"
    : state.title;
  function view(value: typeof state.view) {
    changePreview({ view: value });
    setMessage("");
  }
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Button
          variant="ghost"
          onClick={() => view("home")}
          aria-label="ReEntry preview home"
        >
          <Leaf aria-hidden="true" /> ReEntry
        </Button>
        <nav aria-label="Preview navigation" className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            onClick={() => view(compact ? "home" : "companion")}
          >
            {compact ? "Home preview" : "Companion preview"}
          </Button>
          {!compact && (
            <Button variant="outline" asChild>
              <Link href="/">Current app</Link>
            </Button>
          )}
        </nav>
      </header>
      <main className="grid gap-6 py-6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline">Fictional preview</Badge>
          <CardDescription>
            {compact
              ? "Example data · AI off"
              : "No browser monitoring or model requests. Changes affect example data only."}
          </CardDescription>
        </div>
        {state.view === "home" ? (
          <section
            className="grid gap-4 py-4"
            aria-labelledby="preview-heading"
          >
            <Empty className="px-0 py-4">
              <div className="grid gap-4">
                {cloneElement(
                  TypographyH1(),
                  { id: "preview-heading" },
                  "A little easier to return.",
                )}
                {cloneElement(
                  TypographyLead(),
                  {},
                  "Your place is kept. Start with one thing, whenever you’re ready.",
                )}
              </div>
            </Empty>
          </section>
        ) : (
          <div className="grid gap-4">
            {!compact && (
              <div>
                <Button variant="ghost" onClick={() => view("home")}>
                  <ArrowLeft aria-hidden="true" /> Back to your places
                </Button>
              </div>
            )}
            <EmptyTitle>
              <h1>{compact ? "Beside your work" : "Your place, remembered"}</h1>
            </EmptyTitle>
          </div>
        )}
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="grid gap-6 lg:col-span-2 min-w-0">
            {problem && (
              <Alert>
                <AlertTitle>
                  {state.scenario === "offline"
                    ? "Your place is still here"
                    : state.scenario === "denied"
                      ? "This site is not being observed"
                      : "The latest changes are unverified"}
                </AlertTitle>
                <AlertDescription>
                  {state.scenario === "offline"
                    ? "Example: the app is disconnected. Observing and checking are separate states."
                    : state.scenario === "denied"
                      ? "Example: site access was declined. You stay in control of coverage."
                      : "Example: the model is unavailable. Your earlier checkpoint is preserved."}
                  <Button
                    variant="outline"
                    onClick={() => {
                      changePreview({ scenario: "active" });
                      setMessage(
                        "Preview connection restored. No live service was contacted.",
                      );
                    }}
                  >
                    Try preview again
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            {empty ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Leaf aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle>
                    <h2>
                      {state.scenario === "empty"
                        ? "Make room for your next beginning"
                        : "Nothing needs your attention"}
                    </h2>
                  </EmptyTitle>
                  <EmptyDescription>
                    {state.scenario === "empty"
                      ? "ReEntry will keep the goal, progress and next step together as you work."
                      : "Example: the page has no clear task. ReEntry should leave it that way."}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button
                    onClick={() => changePreview({ scenario: "changed" })}
                  >
                    Explore an example <ArrowRight aria-hidden="true" />
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Badge variant="secondary">{copy.status}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        changePreview({
                          scenario: paused ? "active" : "paused",
                        })
                      }
                    >
                      {paused ? (
                        <Play aria-hidden="true" />
                      ) : (
                        <Pause aria-hidden="true" />
                      )}
                      {paused ? "Resume preview" : "Pause preview"}
                    </Button>
                  </div>
                  <EmptyTitle>
                    <h2>{title}</h2>
                  </EmptyTitle>
                  <CardDescription>
                    {state.scenario === "candidate"
                      ? "A possible task, based on the fictional page. You can change or dismiss it."
                      : copy.progress}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                  <div className="grid gap-2">
                    <CardTitle>
                      <h3>Finished when</h3>
                    </CardTitle>
                    <p>
                      {state.research
                        ? "You have enough information to decide whether to apply."
                        : copy.finish}
                    </p>
                  </div>
                  {copy.changed && (
                    <Item variant="muted">
                      <ItemContent>
                        <ItemTitle>One instruction changed</ItemTitle>
                        <p>
                          The application now asks for two referees. Your saved
                          draft is still useful.
                        </p>
                      </ItemContent>
                    </Item>
                  )}
                  <div className="grid gap-2">
                    <CardTitle>
                      <h3>
                        {copy.completed
                          ? "You can put this down"
                          : "Your next small step"}
                      </h3>
                    </CardTitle>
                    <p>
                      {paused
                        ? "Observation is paused in this preview. Your earlier place is preserved."
                        : state.research
                          ? "Read the award requirements and decide whether to apply."
                          : copy.next}
                    </p>
                  </div>
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost">Why this?</Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="grid gap-4 pt-4">
                      <p>
                        These are fictional observations for reviewing the
                        design. No real page was read to create this card.
                      </p>
                      <dl className="grid gap-3">
                        <div>
                          <dt>
                            <strong>Observed in the example</strong>
                          </dt>
                          <dd>
                            Draft saved. Sample transcript marked as attached.
                          </dd>
                        </div>
                        <div>
                          <dt>
                            <strong>Inferred in the example</strong>
                          </dt>
                          <dd>
                            The intended outcome is a submitted application.
                          </dd>
                        </div>
                        <div>
                          <dt>
                            <strong>Instruction comparison</strong>
                          </dt>
                          <dd>Earlier: one referee. Current: two referees.</dd>
                        </div>
                        {state.research && (
                          <div>
                            <dt>
                              <strong>Your correction</strong>
                            </dt>
                            <dd>
                              Researching only. Do not assume an application
                              commitment.
                            </dd>
                          </div>
                        )}
                      </dl>
                    </CollapsibleContent>
                  </Collapsible>
                  {state.view === "detail" && (
                    <section
                      aria-labelledby="timeline-heading"
                      className="grid gap-4"
                    >
                      <CardTitle>
                        <h3 id="timeline-heading">How you got here</h3>
                      </CardTitle>
                      <ol className="grid gap-4">
                        <li>
                          <strong>1. Draft saved</strong>
                          <p>
                            Fictional observation · Your statement and sample
                            attachment are retained.
                          </p>
                        </li>
                        <li>
                          <strong>2. Requirement changed</strong>
                          <p>
                            Fictional comparison · An additional referee is
                            requested.
                          </p>
                        </li>
                        <li>
                          <strong>
                            3.{" "}
                            {copy.completed
                              ? "Confirmation observed"
                              : "Ready to return"}
                          </strong>
                          <p>
                            {copy.completed
                              ? "Fictional receipt · The matching application was submitted."
                              : state.research
                                ? "Your correction · Read requirements before deciding whether to apply."
                                : "Inferred next action · Add the missing referee before review."}
                          </p>
                        </li>
                      </ol>
                      <Separator />
                      <CardTitle>
                        <h3>Supporting materials</h3>
                      </CardTitle>
                      <p>
                        Northstar requirements and your application draft live
                        in the separate local test portal.
                      </p>
                    </section>
                  )}
                </CardContent>
                <CardFooter className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => {
                      view("detail");
                      setMessage(
                        copy.completed
                          ? "This example is finished. No further action is needed."
                          : "You’re at the example’s next step. The real portal is available under preview settings.",
                      );
                    }}
                  >
                    {copy.completed ? (
                      <Check aria-hidden="true" />
                    ) : (
                      <ArrowRight aria-hidden="true" />
                    )}
                    {copy.completed
                      ? "View finished example"
                      : "Return to this task"}
                  </Button>
                  {state.view !== "detail" && (
                    <Button variant="ghost" onClick={() => view("detail")}>
                      Task details
                    </Button>
                  )}
                  <Dialog
                    open={dialog}
                    onOpenChange={(open) => {
                      setDialog(open);
                      if (open) setCorrection(title);
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button variant="ghost">Correct this</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>What are you working toward?</DialogTitle>
                        <DialogDescription>
                          A small correction is enough. This changes fictional
                          preview data only.
                        </DialogDescription>
                      </DialogHeader>
                      <form
                        className="grid gap-4"
                        onSubmit={(event) => {
                          event.preventDefault();
                          if (!correction.trim()) return;
                          changePreview({
                            title: correction.trim(),
                            research: false,
                          });
                          setDialog(false);
                          setMessage("Example goal corrected.");
                        }}
                      >
                        <Label htmlFor="preview-correction">Your goal</Label>
                        <Input
                          id="preview-correction"
                          value={correction}
                          onChange={(event) =>
                            setCorrection(event.target.value)
                          }
                          maxLength={180}
                          required
                        />
                        <Button
                          variant="outline"
                          type="button"
                          onClick={() => {
                            changePreview({ research: true });
                            setDialog(false);
                            setMessage("Example changed to researching only.");
                          }}
                        >
                          I’m only researching
                        </Button>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button type="button" variant="ghost">
                              Cancel
                            </Button>
                          </DialogClose>
                          <Button type="submit">Save correction</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>
            )}
            {!empty && (
              <p role="status" aria-live="polite">
                {message ||
                  (state.scenario === "snoozed"
                    ? "Example reminder snoozed until tomorrow. No notification was scheduled."
                    : "")}
              </p>
            )}
          </div>
          {!compact && !empty && (
            <aside className="grid gap-6" aria-label="Other places">
              <Tabs defaultValue="waiting">
                <TabsList aria-label="Other tasks">
                  <TabsTrigger value="waiting">Waiting</TabsTrigger>
                  <TabsTrigger value="finished">Finished</TabsTrigger>
                </TabsList>
                <TabsContent value="waiting">
                  <ItemGroup>
                    <Item variant="muted">
                      <ItemMedia variant="icon">
                        <ShoppingBag aria-hidden="true" />
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle>Choose a backpack</ItemTitle>
                        <ItemDescription>
                          Fictional · Comparing only.
                        </ItemDescription>
                      </ItemContent>
                      <ItemActions>
                        <Button
                          variant="ghost"
                          onClick={() =>
                            setMessage(
                              "Shopping example: compare the two options before deciding whether to buy.",
                            )
                          }
                        >
                          Review example
                        </Button>
                      </ItemActions>
                    </Item>
                  </ItemGroup>
                </TabsContent>
                <TabsContent value="finished">
                  <Item variant="muted">
                    <ItemContent>
                      <ItemTitle>Find the course reading list</ItemTitle>
                      <ItemDescription>
                        Fictional example · Reading list located.
                      </ItemDescription>
                    </ItemContent>
                  </Item>
                </TabsContent>
              </Tabs>
              <Separator />
              <CardDescription>
                Your list can wait. There’s no need to finish everything today.
              </CardDescription>
            </aside>
          )}
        </div>
        {state.storage === "tab-only" && (
          <Alert>
            <AlertTitle>Preview changes are kept in this tab only</AlertTitle>
            <AlertDescription>
              Browser storage is unavailable. A reload may reset the examples.
            </AlertDescription>
          </Alert>
        )}
      </main>
      <footer className="grid gap-4 pb-8">
        <Separator />
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost">Explore preview states and settings</Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="grid gap-4 pt-4">
            <p>
              These controls simulate the intended experience. They do not
              change browser permissions, run AI or schedule reminders.
            </p>
            <Label htmlFor="preview-scenario">Example state</Label>
            <Select
              value={state.scenario}
              onValueChange={(value) =>
                changePreview({ scenario: value as keyof typeof scenarios })
              }
            >
              <SelectTrigger id="preview-scenario" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(scenarios).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => changePreview({ scenario: "snoozed" })}
              >
                Snooze example reminder
              </Button>
              <Button
                variant="outline"
                onClick={() => changePreview({ scenario: "empty" })}
              >
                Dismiss example task
              </Button>
              <Button variant="ghost" onClick={resetPreview}>
                Reset examples
              </Button>
            </div>
            <CardDescription>
              The application sandbox usually runs on port 4176; the reused shop
              runs separately on 4177. Use the address printed by each sandbox
              launcher.
            </CardDescription>
          </CollapsibleContent>
        </Collapsible>
      </footer>
    </div>
  );
}
