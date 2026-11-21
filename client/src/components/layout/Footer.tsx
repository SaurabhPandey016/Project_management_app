import Link from "next/link";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CodeXml,
  Mail,
} from "lucide-react";
import { ServiceStatusBadge } from "@/components/common/ServiceStatusBadge";
import { Logo } from "@/components/layout/Logo";
import { env } from "@/lib/env";

const technologies = [
  "Next.js",
  "TypeScript",
  "Express",
  "Prisma",
  "PostgreSQL",
  "Socket.io",
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-white/8 bg-background/45">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.2fr] lg:px-8">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            A calmer, clearer way to move work forward. Keep every issue,
            decision, and teammate in sync.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {technologies.map((technology) => (
              <span
                key={technology}
                className="rounded-full border border-border bg-card/70 px-2.5 py-1 text-[0.68rem] text-muted-foreground"
              >
                {technology}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold">Product</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li>
              <Link className="transition-colors hover:text-foreground" href="/dashboard">
                Dashboard
              </Link>
            </li>
            <li>
              <Link className="transition-colors hover:text-foreground" href="/dashboard">
                Projects
              </Link>
            </li>
            <li>
              <Link className="transition-colors hover:text-foreground" href="/invitations">
                Invitations
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold">Connect</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <a
                className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
                href={env.linkedInUrl}
                target="_blank"
                rel="noreferrer"
              >
                <BriefcaseBusiness aria-hidden="true" className="size-4" />
                LinkedIn
                <ArrowUpRight aria-hidden="true" className="size-3" />
              </a>
            </li>
            <li>
              <a
                className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
                href={env.githubUrl}
                target="_blank"
                rel="noreferrer"
              >
                <CodeXml aria-hidden="true" className="size-4" />
                GitHub
                <ArrowUpRight aria-hidden="true" className="size-3" />
              </a>
            </li>
            <li>
              <a
                className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
                href={`mailto:${env.contactEmail}`}
              >
                <Mail aria-hidden="true" className="size-4" />
                Email
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold">Service status</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Live availability for the API and database.
          </p>
          <div className="mt-4">
            <ServiceStatusBadge />
          </div>
        </div>
      </div>

      <div className="border-t border-border/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-xs text-muted-foreground sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <p>© {currentYear} IssueFlow. All rights reserved.</p>
          <a
            href={env.linkedInUrl}
            target="_blank"
            rel="noreferrer"
            className="w-fit transition-colors hover:text-foreground"
          >
            Made with ❤️ by Saurabh Pandey
          </a>
        </div>
      </div>
    </footer>
  );
}
