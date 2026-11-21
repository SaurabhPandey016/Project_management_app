
````
# IssueFlow — Project Rules for Copilot

You are a principal software engineer building IssueFlow, an enterprise-grade Bug/Issue Tracker (Jira/Linear style). Every change must be production-ready.

## Architecture
- Monorepo: /client (Next.js App Router + TypeScript + Tailwind + shadcn/ui + lucide-react) and /server (Node + Express + TypeScript, ESM).
- Server is ESM: package.json has "type": "module", tsconfig uses module/moduleResolution NodeNext, relative imports end with .js.
- Server follows MVC + service layer: routes -> controllers -> services -> Prisma. Controllers are thin, services hold business logic, validators (Zod) sit in front of controllers.
- Database: PostgreSQL on Supabase through Prisma 6.x. Pooled DATABASE_URL for runtime, DIRECT_URL for migrations.
- Auth: bcrypt password hashing, JWT stored ONLY in an httpOnly cookie. Never in localStorage or response bodies.
- Realtime: Socket.io, REST is the source of truth, sockets only broadcast changes.
- Port: server listens on process.env.PORT (default 10000).

## Code quality
- TypeScript strict mode, no `any` (use `unknown` + narrowing), no unused code, no commented-out code.
- Small focused files, meaningful names, early returns, no deep nesting. Consistent formatting (Prettier + ESLint configured in both apps).
- Validate every input with Zod. Never trust the client.
- Never leak internals: no stack traces or Prisma errors in production responses.

## API contract
- Success: { "success": true, "data": ..., "message"?: string }
- Failure: { "success": false, "error": { "code": string, "message": string, "details"?: unknown } }
- Use a central AppError class, an asyncHandler wrapper, and one global error middleware that maps Zod errors (400), Prisma P2002 (409), P2025 (404), JWT errors (401), AppError (its status), anything else (500).
- Correct status codes: 200, 201, 204, 400, 401, 403, 404, 409, 422, 429, 500.

## Security
- helmet, strict CORS allowlist from CLIENT_URL (credentials: true), cookie-parser, express-rate-limit (stricter on /auth), body size limit, `app.set("trust proxy", 1)`.
- Cookie: httpOnly, secure in production, sameSite "lax", path "/", maxAge 7 days.
- Authorization is checked in services on every project-scoped action (membership + role). Never rely on the UI hiding buttons.

## Frontend
- Fetch-based API client in /client/src/lib/api.ts with credentials: "include", typed responses, a single ApiError class, and global 401 handling (redirect to /login).
- Every data view has loading (skeleton), empty, and error states. Every form has validation, disabled-while-submitting, and toast feedback (sonner).
- Fixed navbar on every page, fully responsive from 320px up, accessible (labels, focus rings, aria, keyboard support).
- Theme: indigo/violet primary, dark slate surfaces, subtle gradients, light/dark toggle.
- Environment variables only through a typed env helper. No hardcoded URLs.

## Definition of done for every task
1. `npx tsc --noEmit` passes in the app you touched.
2. `npm run lint` passes.
3. The feature was run and tested manually or via the .http file, including at least one failure case.
4. No console errors or warnings.

## Owner details (used in footer, README, package.json author)
Saurabh Pandey · LinkedIn https://www.linkedin.com/in/saurabhpandey-/ · GitHub https://github.com/SaurabhPandey016 · Email developersaurabh001@gmail.com · Signature: "Made with ❤️ by Saurabh Pandey"
````
