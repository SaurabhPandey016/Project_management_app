# IssueFlow API

The IssueFlow API is an Express 5 and TypeScript service using ESM, Prisma 6, and PostgreSQL. It provides cookie-based authentication, project-scoped REST endpoints, and Socket.IO broadcasts for authorized project rooms.

## Structure

```text
server/
├── prisma/
│   ├── migrations/             # Versioned database migrations
│   ├── schema.prisma           # PostgreSQL models and indexes
│   └── seed.ts                 # Demo users, project, issues, and comments
├── scripts/
│   └── socket-smoke.ts         # Authenticated Socket.IO integration smoke test
├── src/
│   ├── app.ts                  # Express middleware and route registration
│   ├── server.ts               # HTTP/Socket.IO startup and graceful shutdown
│   ├── config/                 # Environment, CORS, and cookie settings
│   ├── lib/                    # Prisma, JWT, errors, logging, helpers
│   ├── middlewares/            # Auth, validation, origin, rate limit, errors
│   ├── modules/                # Routes, controllers, services, validators
│   └── sockets/                # Socket auth, project rooms, presence
├── requests.http               # REST examples (includes failure cases)
└── package.json
```

Each module follows routes → controllers → services → Prisma. Zod schemas validate route parameters and bodies. Services enforce membership and roles; controllers remain focused on HTTP input/output.

## Requirements and setup

- Node.js 20.9 or newer recommended, npm, and PostgreSQL.
- A pooled PostgreSQL connection URL for `DATABASE_URL`.
- A direct connection URL for `DIRECT_URL`, used by Prisma migrations.

From the repository root:

```powershell
Copy-Item server\.env.example server\.env
```

Set the database URLs and a random `JWT_SECRET` of at least 32 characters in `server/.env`. Then:

```bash
cd server
npm install
npm run prisma:generate
npm run prisma:deploy
npm run seed
npm run dev
```

The API listens on `http://localhost:10000` by default. Check `GET http://localhost:10000/api/health`. Health returns HTTP `200` with `db.status` equal to `up` or `down`, so a database pause is distinguishable from an unreachable API.

The seed creates the `WEB` / Website Revamp sample project and demo accounts. The owner login is `demo@issueflow.dev` / `Demo@12345`; use this only with a local or disposable demo database.

## Scripts

| Command                   | Description                                               |
| ------------------------- | --------------------------------------------------------- |
| `npm run dev`             | Run the API with `tsx watch`.                             |
| `npm run build`           | Compile `src/` to `dist/` with TypeScript.                |
| `npm run start`           | Run the compiled `dist/server.js`.                        |
| `npm run lint`            | Run ESLint.                                               |
| `npm run typecheck`       | Run TypeScript without emitting files.                    |
| `npm run prisma:generate` | Generate Prisma Client from the schema.                   |
| `npm run prisma:migrate`  | Create/apply a development migration with Prisma Migrate. |
| `npm run prisma:deploy`   | Apply committed migrations to the configured database.    |
| `npm run seed`            | Upsert the sample users/project/issues/comments.          |
| `npm run socket:smoke`    | Run the Socket.IO smoke test against the local API.       |

After changing `schema.prisma`, regenerate Prisma Client. Commit schema changes and their migration together.

## Environment variables

The API loads `server/.env` through `dotenv` and validates it at startup.

| Variable         | Required | Description                                                        |
| ---------------- | :------: | ------------------------------------------------------------------ |
| `NODE_ENV`       |    No    | `development`, `test`, or `production`; defaults to `development`. |
| `PORT`           |    No    | HTTP port; defaults to `10000`.                                    |
| `DATABASE_URL`   |   Yes    | Pooled PostgreSQL URL used at runtime.                             |
| `DIRECT_URL`     |   Yes    | Direct PostgreSQL URL used by Prisma Migrate.                      |
| `JWT_SECRET`     |   Yes    | Signing secret of at least 32 characters.                          |
| `JWT_EXPIRES_IN` |    No    | JWT lifetime (for example `7d`); defaults to `7d`.                 |
| `CLIENT_URL`     |   Yes    | Exact client origin allowed by CORS and the origin check.          |

Never commit actual credentials. Use the root [`../.env.example`](../.env.example) as a combined variable reference.

## API conventions

All REST endpoints are prefixed with `/api`.

Success:

```json
{ "success": true, "data": {}, "message": "Optional message" }
```

Failure:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": []
  }
}
```

The global error middleware maps Zod validation failures to `400`, Prisma unique conflicts (`P2002`) to `409`, missing Prisma records (`P2025`) to `404`, JWT errors to `401`, and `AppError` to its configured status/code. Unexpected failures are logged and returned as a generic `500`; internal stack traces and Prisma messages are not returned to clients.

Authentication uses an `httpOnly`, `sameSite=lax` cookie named `issueflow_token` (secure in production). Socket.IO uses a short-lived, purpose-specific token from `GET /api/auth/socket-token`; the token is not stored in local storage or returned by login/register.

### Main route groups

| Method(s)                | Path                                                | Purpose                                   | Authorization                                                                                 |
| ------------------------ | --------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| `GET`                    | `/api/health`                                       | API uptime and database status.           | Public                                                                                        |
| `POST`                   | `/api/auth/register`, `/api/auth/login`             | Create session or sign in.                | Public; auth rate-limited                                                                     |
| `POST`                   | `/api/auth/logout`                                  | Clear the session cookie.                 | Cookie if present                                                                             |
| `GET`                    | `/api/auth/me`, `/api/auth/socket-token`            | Read current user or mint a socket token. | Authenticated                                                                                 |
| `GET`, `POST`            | `/api/projects`                                     | List or create projects.                  | Authenticated                                                                                 |
| `GET`, `PATCH`, `DELETE` | `/api/projects/:projectId`                          | Read/update project or delete it.         | Member; update ADMIN+, delete OWNER                                                           |
| `PATCH`, `DELETE`        | `/api/projects/:projectId/members/:userId`          | Change a role or remove/leave.            | OWNER changes roles/removes non-owners; ADMIN removes MEMBER; non-owners may leave themselves |
| `GET`, `POST`            | `/api/projects/:projectId/invitations`              | List/create project invitations.          | ADMIN+                                                                                        |
| `DELETE`                 | `/api/projects/:projectId/invitations/:id`          | Revoke an invitation.                     | ADMIN+                                                                                        |
| `GET`                    | `/api/invitations/mine`                             | List invitations for current user.        | Authenticated                                                                                 |
| `POST`                   | `/api/invitations/:id/accept`, `/decline`           | Respond to own invitation.                | Invitation recipient                                                                          |
| `GET`, `POST`            | `/api/projects/:projectId/issues`                   | List/create issues.                       | Project member                                                                                |
| `GET`                    | `/api/projects/:projectId/board`                    | Return issues grouped by status.          | Project member                                                                                |
| `GET`, `PATCH`, `DELETE` | `/api/projects/:projectId/issues/:issueId`          | Read, edit, or delete an issue.           | Project member; edit/delete additionally role/ownership-gated                                 |
| `PATCH`                  | `/api/projects/:projectId/issues/:issueId/move`     | Update status and position.               | Project member                                                                                |
| `GET`, `POST`            | `/api/projects/:projectId/issues/:issueId/comments` | Read comment tree or add a comment/reply. | Project member                                                                                |
| `PATCH`, `DELETE`        | `/api/projects/:projectId/comments/:commentId`      | Edit or remove a comment.                 | Author to edit; author or project ADMIN/OWNER to delete                                       |

Issue list and board filters support keyword `q`, comma-separated `status`, `priority`, and `type`, plus `assigneeId` (a user ID, `me`, or `unassigned`). List endpoints also accept `sortBy`, `order`, `page`, and `limit` (up to 100). Responses use the common envelope; issue lists return `data.items`, `data.total`, `data.page`, and `data.limit`.

## REST request examples

Open [`requests.http`](requests.http) in VS Code with the REST Client extension. Send the requests in order when they depend on named responses: the file registers users, creates a project, accepts/revokes invitations, exercises issue/comment permissions and ordering, and deletes its test project near the end. Use a disposable database; the owner-login section uses the seeded demo account.

Requests that fail intentionally are labelled `Failure` and demonstrate validation, authentication, authorization, duplicate invitations, invalid assignees, and comment-depth checks. REST Client manages cookies between requests in its local session.

## Socket.IO smoke test

With migrations and seed data applied and the API running, run from `server/`:

```bash
npm run socket:smoke
```

By default the script signs in as the seeded demo owner, selects project key `WEB`, verifies that an invalid-purpose token and unauthorized room join are rejected, then creates an issue over REST and checks that a second socket receives `issue:created`. The test deletes its created issue in a `finally` cleanup.

Optional overrides are read from the process environment:

```powershell
$env:SOCKET_SMOKE_EMAIL = "demo@issueflow.dev"
$env:SOCKET_SMOKE_PASSWORD = "Demo@12345"
$env:SOCKET_SMOKE_PROJECT_KEY = "WEB"
npm run socket:smoke
```

## Deploying to Render

Create a Render **Web Service** for this repository:

1. Set **Root Directory** to `server`.
2. Set **Build Command** to `npm install && npm run prisma:generate && npm run build`.
3. Set **Start Command** to `npm run start`.
4. Configure `NODE_ENV=production`, `DATABASE_URL`, `DIRECT_URL`, a secure random `JWT_SECRET`, `JWT_EXPIRES_IN`, and `CLIENT_URL` (the deployed client origin). Render supplies `PORT`; the server listens on it.
5. Apply committed migrations with `npm run prisma:deploy` as the deployment migration step, before serving traffic.
6. Configure the client’s rewrite and public API/socket URLs with the Render service origin.

Do not run the seed against production unless intentionally creating demo data. Render free services can sleep after inactivity; the client status banner communicates this to visitors.
