import Link from "next/link";
import {
  ArrowRight,
  Check,
  CircleDot,
  Layers3,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const benefits = [
  {
    icon: CircleDot,
    title: "Keep every issue moving",
    description:
      "See status, priority, and ownership at a glance, without losing the detail behind the work.",
  },
  {
    icon: UsersRound,
    title: "Bring your team together",
    description:
      "Invite teammates into a shared project and keep decisions close to the work.",
  },
  {
    icon: ShieldCheck,
    title: "Stay in control",
    description:
      "Role-aware access and secure sessions keep your workspace focused and protected.",
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <section className="relative overflow-hidden rounded-3xl border border-white/8 bg-card/55 px-5 py-14 shadow-2xl shadow-indigo-950/15 sm:px-10 sm:py-20 lg:px-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-32 size-96 rounded-full bg-indigo-500/15 blur-3xl"
        />
        <div className="relative max-w-3xl">
          <Badge className="gap-1.5 border border-indigo-300/20 bg-indigo-400/10 px-3 py-1 text-indigo-200 hover:bg-indigo-400/10">
            <Sparkles aria-hidden="true" className="size-3.5" />
            A clearer way to collaborate
          </Badge>
          <h1 className="mt-7 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            Great work moves
            <span className="block bg-gradient-to-r from-indigo-300 via-violet-300 to-blue-300 bg-clip-text text-transparent">
              forward together.
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
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
              Get started for free
              <ArrowRight aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              className="h-11 border-border bg-background/40 px-5"
              nativeButton={false}
              role="link"
              render={<Link href="/login" />}
            >
              Sign in to your workspace
            </Button>
          </div>
          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            {["No credit card required", "Secure by default", "Made for teams"].map(
              (label) => (
                <span key={label} className="inline-flex items-center gap-1.5">
                  <Check
                    aria-hidden="true"
                    className="size-3.5 text-emerald-400"
                  />
                  {label}
                </span>
              ),
            )}
          </div>
        </div>
        <div className="relative mt-12 max-w-3xl rounded-2xl border border-white/10 bg-background/75 p-4 shadow-xl backdrop-blur sm:p-6">
          <div className="flex items-center justify-between gap-4 border-b border-border/70 pb-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Website Revamp</p>
              <p className="mt-1 text-xs text-muted-foreground">
                WEB · Project workspace
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0">
              Sprint 04
            </Badge>
          </div>
          <div className="grid gap-3 pt-4 sm:grid-cols-3">
            {[
              { label: "To do", count: "04", accent: "bg-slate-400" },
              { label: "In progress", count: "03", accent: "bg-blue-400" },
              { label: "Done", count: "08", accent: "bg-emerald-400" },
            ].map((column) => (
              <div
                key={column.label}
                className="rounded-xl border border-border/70 bg-card/60 p-3"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <span className={`size-2 rounded-full ${column.accent}`} />
                    {column.label}
                  </span>
                  <span>{column.count}</span>
                </div>
                <div className="mt-3 space-y-2">
                  {[0, 1].map((item) => (
                    <div
                      key={item}
                      className="rounded-lg border border-border/70 bg-background/80 p-3"
                    >
                      <div className="h-2 w-14 rounded-full bg-indigo-400/40" />
                      <div className="mt-2 h-2 w-full rounded-full bg-muted" />
                      <div className="mt-1.5 h-2 w-2/3 rounded-full bg-muted/70" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-indigo-300">Less busywork</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything your team needs to stay in flow
          </h2>
          <p className="mt-4 leading-7 text-muted-foreground">
            A thoughtful home for the work, the people, and the details that
            bring projects to life.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {benefits.map(({ icon: Icon, title, description }) => (
            <Card
              key={title}
              className="border-white/8 bg-card/55 transition-colors hover:border-indigo-400/25"
            >
              <CardContent className="p-6">
                <span className="grid size-11 place-items-center rounded-xl border border-indigo-400/20 bg-indigo-400/10 text-indigo-300">
                  <Icon aria-hidden="true" className="size-5" />
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

      <Card className="mb-4 overflow-hidden border-indigo-400/15 bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-transparent">
        <CardContent className="flex flex-col items-start justify-between gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <span className="inline-flex items-center gap-2 text-sm text-indigo-300">
              <Layers3 aria-hidden="true" className="size-4" />
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
