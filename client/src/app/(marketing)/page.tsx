import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  AtSign,
  BellRing,
  Bug,
  Check,
  CheckSquare,
  CircleDot,
  GitBranch,
  Grip,
  KeyRound,
  Layers3,
  ListFilter,
  MessageSquareText,
  Radio,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Waypoints,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { env } from "@/lib/env";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TryDemoButton } from "@/components/common/TryDemoButton";

const features: {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}[] = [
  {
    icon: KeyRound,
    title: "Secure sign-in",
    description:
      "Keep access simple with protected sessions and a secure httpOnly cookie.",
    color: "text-violet-300",
  },
  {
    icon: UsersRound,
    title: "Projects and invites",
    description:
      "Bring the right people together with clear project roles and invitations.",
    color: "text-blue-300",
  },
  {
    icon: Bug,
    title: "Issues with context",
    description:
      "Capture bugs, features, and tasks with priorities and a shared history.",
    color: "text-rose-300",
  },
  {
    icon: AtSign,
    title: "Clear ownership",
    description:
      "Assign each issue to a teammate so important work never gets lost.",
    color: "text-amber-300",
  },
  {
    icon: Grip,
    title: "Visual Kanban",
    description:
      "Move work through focused columns with intuitive drag-and-drop.",
    color: "text-indigo-300",
  },
  {
    icon: MessageSquareText,
    title: "Threaded conversations",
    description:
      "Keep decisions and replies attached to the issue they belong to.",
    color: "text-cyan-300",
  },
  {
    icon: ListFilter,
    title: "Find the signal",
    description:
      "Search and filter by status, priority, type, and assignee in seconds.",
    color: "text-emerald-300",
  },
  {
    icon: ShieldCheck,
    title: "Role-aware permissions",
    description:
      "Make collaboration safer with access rules enforced by the server.",
    color: "text-fuchsia-300",
  },
];

const sampleIssues = [
  [
    { key: "WEB-24", title: "Add empty state to projects", tag: "Design", color: "bg-violet-400" },
    { key: "WEB-27", title: "Review mobile navigation", tag: "Frontend", color: "bg-blue-400" },
  ],
  [
    { key: "WEB-21", title: "Polish the sign-in flow", tag: "High", color: "bg-orange-400" },
    { key: "WEB-25", title: "Connect invite acceptance", tag: "Backend", color: "bg-cyan-400" },
  ],
  [
    { key: "WEB-18", title: "Create shared issue board", tag: "Shipped", color: "bg-emerald-400" },
    { key: "WEB-20", title: "Add project activity feed", tag: "Shipped", color: "bg-emerald-400" },
  ],
];

const columns = [
  { title: "To do", tone: "bg-slate-400" },
  { title: "In progress", tone: "bg-blue-400" },
  { title: "Done", tone: "bg-emerald-400" },
];

const steps = [
  {
    number: "01",
    icon: Layers3,
    title: "Create a project",
    description:
      "Start with a shared workspace, choose a short project key, and invite your team.",
  },
  {
    number: "02",
    icon: CircleDot,
    title: "Capture the work",
    description:
      "Create issues, set priorities, assign owners, and keep the context close.",
  },
  {
    number: "03",
    icon: Workflow,
    title: "Move forward together",
    description:
      "Track progress on the board and stay in sync as teammates make changes.",
  },
];

const stack = [
  "Next.js",
  "TypeScript",
  "Express",
  "Prisma",
  "PostgreSQL",
  "Socket.io",
];

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <section className="hero-glow relative isolate overflow-hidden rounded-3xl border border-white/8 bg-card/55 px-5 py-12 shadow-2xl shadow-indigo-950/15 sm:px-10 sm:py-16 lg:px-14 lg:py-20">
        <div
          aria-hidden="true"
          className="hero-orb pointer-events-none absolute -right-36 -top-40 size-[30rem] rounded-full bg-indigo-500/20 blur-3xl"
        />
        <div className="relative grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-8">
          <div className="min-w-0">
            <Badge className="gap-1.5 border border-indigo-300/20 bg-indigo-400/10 px-3 py-1 text-indigo-200 hover:bg-indigo-400/10">
              <Sparkles aria-hidden="true" className="size-3.5" />
              A clearer way to collaborate
            </Badge>
            <h1 className="mt-7 max-w-2xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Great work moves
              <span className="block bg-gradient-to-r from-indigo-300 via-violet-300 to-blue-300 bg-clip-text text-transparent">
                forward together.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              IssueFlow brings projects, priorities, and conversations into one
              calm workspace—so your team can spend less time tracking work and
              more time making progress.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                className="h-11 bg-gradient-to-r from-indigo-500 to-violet-500 px-5 text-white hover:from-indigo-400 hover:to-violet-400"
                nativeButton={false}
                role="link"
                render={<Link href="/register" />}
              >
                Get started free
                <ArrowRight aria-hidden="true" />
              </Button>
              <TryDemoButton
                variant="outline"
                className="h-11 border-border bg-background/40 px-5"
              />
            </div>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
              {["No credit card required", "Secure by default", "Made for teams"].map(
                (label) => (
                  <span key={label} className="inline-flex items-center gap-1.5">
                    <Check aria-hidden="true" className="size-3.5 text-emerald-400" />
                    {label}
                  </span>
                ),
              )}
            </div>
          </div>

          <div
            role="group"
            aria-label="Preview of the IssueFlow Kanban board"
            className="relative min-w-0 rounded-2xl border border-white/10 bg-background/75 p-3 shadow-xl shadow-indigo-950/20 backdrop-blur sm:p-5"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-400/15 text-indigo-300">
                  <Layers3 aria-hidden="true" className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">Website Revamp</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    WEB · Project workspace
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="shrink-0">Sprint 04</Badge>
            </div>
            <div className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-3">
              {columns.map((column, index) => (
                <div
                  key={column.title}
                  className="min-w-0 rounded-xl border border-border/70 bg-card/60 p-2.5 sm:p-3"
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <span className={`size-2 shrink-0 rounded-full ${column.tone}`} />
                      <span className="truncate">{column.title}</span>
                    </span>
                    <span>{String(sampleIssues[index]?.length ?? 0).padStart(2, "0")}</span>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {(sampleIssues[index] ?? []).map((issue) => (
                      <article
                        key={issue.key}
                        className="min-w-0 rounded-lg border border-border/70 bg-background/80 p-3 transition-transform duration-200 hover:-translate-y-0.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[10px] font-medium text-muted-foreground">
                            {issue.key}
                          </span>
                          <span className={`size-1.5 shrink-0 rounded-full ${issue.color}`} />
                        </div>
                        <p className="mt-2 line-clamp-2 min-h-9 text-xs font-medium leading-4">
                          {issue.title}
                        </p>
                        <span className="mt-2 inline-flex max-w-full truncate rounded-md bg-muted px-1.5 py-1 text-[10px] text-muted-foreground">
                          {issue.tag}
                        </span>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/70 pt-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Radio aria-hidden="true" className="size-3.5 text-emerald-400" />
                Team workspace
              </span>
              <span>6 issues in view</span>
            </div>
          </div>
        </div>
        <a
          href="#features"
          className="relative mx-auto mt-10 flex w-fit items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Explore what you can do
          <ArrowDown aria-hidden="true" className="size-3.5" />
        </a>
      </section>

      <section id="features" className="scroll-mt-24 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-indigo-300">Built for the whole workflow</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything your team needs to stay in flow
          </h2>
          <p className="mt-4 leading-7 text-muted-foreground">
            A thoughtful home for the work, the people, and the details that
            bring projects to life.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, description, color }) => (
            <Card
              key={title}
              className="group border-white/8 bg-card/55 transition-all duration-200 hover:-translate-y-1 hover:border-indigo-400/25 hover:bg-card/80"
            >
              <CardContent className="p-5 sm:p-6">
                <span className="grid size-11 place-items-center rounded-xl border border-indigo-400/20 bg-indigo-400/10">
                  <Icon aria-hidden="true" className={`size-5 ${color}`} />
                </span>
                <h3 className="mt-5 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-indigo-300">Simple by design</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            From first issue to finished work
          </h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map(({ number, icon: Icon, title, description }) => (
            <Card key={number} className="border-white/8 bg-card/55">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-indigo-400/10 text-indigo-300">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="font-mono text-sm text-muted-foreground/70">
                    {number}
                  </span>
                </div>
                <h3 className="mt-5 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="relative overflow-hidden rounded-3xl border border-indigo-400/15 bg-gradient-to-br from-indigo-500/15 via-violet-500/10 to-card/50 p-6 sm:p-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-violet-500/15 blur-3xl"
          />
          <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
            <div className="max-w-2xl">
              <Badge className="gap-1.5 border border-indigo-300/20 bg-indigo-400/10 text-indigo-200 hover:bg-indigo-400/10">
                <BellRing aria-hidden="true" className="size-3.5" />
                Work moves, together
              </Badge>
              <h2 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
                A shared picture of progress, as it happens.
              </h2>
              <p className="mt-4 leading-7 text-muted-foreground">
                IssueFlow keeps teammates in sync with real-time project updates.
                See issue changes and conversations arrive without losing focus
                or refreshing your workspace.
              </p>
            </div>
            <div className="mx-auto grid size-32 place-items-center rounded-full border border-indigo-300/20 bg-background/50 md:size-40">
              <div className="grid size-20 place-items-center rounded-full bg-indigo-400/15 text-indigo-300 md:size-24">
                <Waypoints aria-hidden="true" className="size-10 md:size-12" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Technology stack" className="py-10 sm:py-14">
        <div className="flex flex-col items-center gap-5 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Built with a modern, reliable stack
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {stack.map((name) => (
              <Badge
                key={name}
                variant="secondary"
                className="border border-border/70 bg-card/70 px-3 py-1.5 text-xs"
              >
                {name}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="overflow-hidden border-white/8 bg-card/55">
            <CardContent className="flex h-full flex-col justify-between gap-7 p-6 sm:p-8">
              <div>
                <span className="inline-flex items-center gap-2 text-sm font-medium text-indigo-300">
                  <GitBranch aria-hidden="true" className="size-4" />
                  Project walkthrough
                </span>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
                  Take a closer look at IssueFlow
                </h2>
                <p className="mt-3 max-w-xl leading-7 text-muted-foreground">
                  See how projects, issues, and team conversations come together
                  in one focused workspace.
                </p>
              </div>
              {env.demoVideoUrl ? (
                <Button
                  className="w-fit bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-400 hover:to-violet-400"
                  nativeButton={false}
                  role="link"
                  render={
                    <a href={env.demoVideoUrl} target="_blank" rel="noreferrer" />
                  }
                >
                  Watch project walkthrough
                  <ArrowUpRight aria-hidden="true" />
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Walkthrough video coming soon.
                </p>
              )}
              <div className="flex items-start gap-3 rounded-xl border border-amber-300/15 bg-amber-300/5 p-4">
                <Sparkles aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-300" />
                <p className="text-sm leading-6 text-muted-foreground">
                  The live demo uses free-tier services to keep the project
                  accessible. They may be asleep between visits, so the first
                  request can take a little longer.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-indigo-400/15 bg-gradient-to-br from-indigo-500/10 to-violet-500/5">
            <CardContent className="flex h-full flex-col justify-between gap-7 p-6 sm:p-8">
              <div>
                <span className="grid size-11 place-items-center rounded-xl border border-indigo-400/20 bg-indigo-400/10 text-indigo-300">
                  <UsersRound aria-hidden="true" className="size-5" />
                </span>
                <h2 className="mt-5 text-xl font-semibold">
                  Want to see the project come back online?
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  If a free-tier service is paused, reach out and help bring the
                  live demo back up.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-fit border-border bg-background/50"
                nativeButton={false}
                role="link"
                render={
                  <a href={env.linkedInUrl} target="_blank" rel="noreferrer" />
                }
              >
                Connect on LinkedIn
                <ArrowUpRight aria-hidden="true" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <Card className="mb-4 overflow-hidden border-indigo-400/15 bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-transparent">
        <CardContent className="flex flex-col items-start justify-between gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <span className="inline-flex items-center gap-2 text-sm text-indigo-300">
              <CheckSquare aria-hidden="true" className="size-4" />
              A better workspace starts here
            </span>
            <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
              Make your next project easier to run.
            </h2>
          </div>
          <Button
            className="shrink-0 bg-primary text-primary-foreground"
            nativeButton={false}
            role="link"
            render={<Link href="/register" />}
          >
            Create your account
            <ArrowRight aria-hidden="true" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
