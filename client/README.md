# IssueFlow client

The client is a Next.js App Router application with TypeScript, Tailwind CSS, and shadcn/ui. It provides the public landing and auth pages, authenticated dashboard and project workspaces, issue board/list, and responsive project settings.

## Structure

```text
client/src/
├── app/
│   ├── (marketing)/          # Public landing page
│   ├── (auth)/               # Login and registration
│   ├── (app)/                # Dashboard, invitations, project routes
│   ├── error.tsx             # Branded runtime error
│   ├── not-found.tsx         # Branded 404
│   └── layout.tsx            # Metadata, providers, navbar, banner, footer
├── components/
│   ├── common/               # Status banner, status gate, demo action
│   ├── layout/               # Navbar, footer, theme toggle
│   ├── projects/             # Board, filters, list, drawer, comments, settings
│   └── ui/                   # Shared UI primitives
├── hooks/                    # Auth, filters, board, and project socket hooks
├── lib/                      # Typed env, API client, socket, utilities
├── providers/                # Auth, theme, service-status providers
└── types/                    # API and domain types
```

`src/proxy.ts` protects app routes using the session-cookie presence. API authorization is still enforced by the server.

## Requirements and local setup

Node.js 20.9 or newer is recommended. Configure the API and database first; see [`../server/README.md`](../server/README.md).

From the repository root, create the local client config:

```powershell
Copy-Item client\.env.local.example client\.env.local
```

Then run:

```bash
cd client
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The API proxy expects the backend at `http://localhost:10000` by default. `CLIENT_URL` in the server configuration must allow the client origin.

## Scripts

| Command            | Description                                             |
| ------------------ | ------------------------------------------------------- |
| `npm run dev`      | Start the Next.js development server.                   |
| `npm run build`    | Create the optimized production build.                  |
| `npm run start`    | Serve the production build (run `npm run build` first). |
| `npm run lint`     | Run ESLint.                                             |
| `npx tsc --noEmit` | Type-check the client without emitting files.           |

## Environment variables

The client reads local variables from `client/.env.local`. Values in the example are development defaults; use your deployed API origin outside local development.

| Variable                     |      Required      | Purpose                                                                                                                                          |
| ---------------------------- | :----------------: | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_API_URL`        |         No         | API origin used for the status provider’s direct health ping; defaults to `http://localhost:10000`. Do not append `/api`.                        |
| `NEXT_PUBLIC_SOCKET_URL`     |         No         | Socket.IO server origin; defaults to `http://localhost:10000`.                                                                                   |
| `BACKEND_URL`                | Yes for deployment | Server-side Next.js rewrite target for `/api/:path*`; defaults to the public API URL or local API when unset. Use the API origin without `/api`. |
| `NEXT_PUBLIC_DEMO_VIDEO_URL` |         No         | Walkthrough URL. If empty, the UI shows that a video is coming soon.                                                                             |
| `NEXT_PUBLIC_LINKEDIN_URL`   |         No         | LinkedIn contact link.                                                                                                                           |
| `NEXT_PUBLIC_GITHUB_URL`     |         No         | GitHub contact link.                                                                                                                             |
| `NEXT_PUBLIC_CONTACT_EMAIL`  |         No         | Contact email.                                                                                                                                   |

**Build-time public variables:** Next.js embeds `NEXT_PUBLIC_*` values into the client bundle during `npm run build`. To change the demo video URL or any other public variable on Vercel, update the project’s environment variable and redeploy/rebuild; changing the value alone does not update an existing deployment. Keep secrets out of `NEXT_PUBLIC_*` variables.

## Service status system

`ServiceStatusProvider` checks `${NEXT_PUBLIC_API_URL}/api/health` directly, rather than relying on the Next.js `/api` rewrite. It uses an 8-second request timeout, retries every 5 seconds for up to 90 seconds while waking, polls every 60 seconds when live, and pauses checks while the browser tab is hidden.

The UI reports:

- **Checking / Waking:** the API has not yet responded; the banner shows elapsed time and wake-up progress.
- **Live:** the API and database are available.
- **Database paused:** the API responded, but its database check reports down.
- **Offline:** the retry window ended without a usable health response; visitors can retry manually.

Login, registration, and demo actions are gated until the service is live. API network failures and gateway errors (502/503/504) trigger recovery checks and the status banner. When configured, the banner and walkthrough section link to `NEXT_PUBLIC_DEMO_VIDEO_URL`; visitors can also contact the project owner through LinkedIn.

## Deploying to Vercel

1. Import the repository into Vercel and set **Root Directory** to `client`.
2. Use `npm run build` as the build command and `npm run start` as the production start command (Vercel’s Next.js preset normally detects these automatically).
3. Configure `BACKEND_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`, and the optional contact/video values. Public `NEXT_PUBLIC_*` variables must be present for the production build.
4. Deploy, then set the API’s `CLIENT_URL` to the final Vercel origin. If using preview domains, ensure the API’s strict CORS allowlist is configured for the origin being tested.
5. Verify the app, `GET /api/health`, cookie-based sign-in, and Socket.IO connection using the deployed origins.

The API and database are deployed separately; see [`../server/README.md`](../server/README.md). Free-tier service sleep or database pause is expected to be communicated by the status UI rather than presented as a blank page.

Issue search is case-insensitive, matches every word across issue titles, descriptions, and keys, and updates results without a full route navigation. The API uses PostgreSQL trigram indexes for substring matching.
