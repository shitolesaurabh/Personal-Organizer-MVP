# Personal Organizer

A calm personal organizer for capturing tasks and notes, planning today, and keeping small commitments visible without clutter.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/personal-organizer/src/App.tsx` — main organizer UI and client-side navigation
- `artifacts/personal-organizer/src/index.css` — visual theme and responsive styles
- `lib/api-spec/openapi.yaml` — source of truth for task, note, and summary API contracts
- `artifacts/api-server/src/routes/organizer.ts` — organizer API handlers and starter data
- `lib/db/src/schema/tasks.ts` / `notes.ts` — Drizzle database tables

## Architecture decisions

- The first version is a single-user organizer without authentication; task and note data lives in the shared PostgreSQL database.
- The API is contract-first: OpenAPI generates the React Query client and Zod schemas used by the server and UI.
- Calendar due dates use PostgreSQL `date` values so a task's day is not shifted by timezone conversion.
- Starter examples are inserted lazily on the first organizer read so the initial experience is useful without a separate seed command.

## Product

- Today overview with task counts, completion progress, due-today count, and recent notes
- Create, complete, edit, and delete tasks with priorities and optional due dates
- Browse, search, create, edit, and delete notes
- Responsive desktop sidebar and mobile navigation

## User preferences

No additional preferences recorded.

## Gotchas

- Restart both managed app workflows after changing API contracts or server routes.
- Run `pnpm --filter @workspace/api-spec run codegen` after editing `lib/api-spec/openapi.yaml`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
