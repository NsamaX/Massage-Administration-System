# CLAUDE.md — MaS (Massage Administration System)

> Claude Code project guide. Read this file at the start of every conversation.

---

## Project Identity

| Field    | Value                                                                                 |
| -------- | ------------------------------------------------------------------------------------- |
| Name     | MaS (Massage Administration System)                                                   |
| Domain   | Thai massage shop management web system — two roles (Admin/Secretary), sidebar layout |
| Language | TypeScript — strict mode                                                              |
| Runtime  | Next.js 16 App Router + React 19 + Tailwind CSS 4                                     |
| Database | MariaDB via XAMPP (On-Premise) with mysql2                                            |

---

## Quick Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint check
npm run type-check   # tsc --noEmit
npm run graph        # Generate Obsidian dependency graph
```

---

## Source Layout

```
src/
├── app/                        # Next.js App Router — routes & layouts ONLY
│   ├── (main)/                 # Main layout group (sidebar)
│   │   ├── layout.tsx          # Shell with SidebarNav
│   │   ├── dashboard/page.tsx
│   │   ├── appointments/page.tsx   # Admin only
│   │   ├── entry/page.tsx          # Secretary only
│   │   ├── staff/page.tsx
│   │   ├── services/page.tsx
│   │   └── report/page.tsx         # Secretary only
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Root redirect
│   └── globals.css
├── lib/
│   ├── db/
│   │   ├── index.ts            # Drizzle DB connection
│   │   └── schema.ts           # Combined DB schema (aggregates module schemas)
│   └── (shared types)
├── modules/                    # Feature modules — Modular Monolith
│   ├── core/                   # Shared primitives (Layout, SidebarNav, utils)
│   ├── auth/                   # PIN login + role-based access (Admin/Secretary)
│   ├── dashboard/              # Stat cards, today's appointments, room grid
│   ├── appointments/           # Booking form, assignment, status table (Admin only)
│   ├── entry/                  # Secretary enters service/session data (Secretary only)
│   ├── staff/                  # Staff profiles, skill tags
│   ├── services/               # Service cards, price, duration, status
│   └── report/                 # Monthly charts, revenue summary (Secretary only)
└── middleware.ts               # Auth middleware / route protection
```

---

## Module Convention

Every module under `src/modules/<module>/` follows this file pattern:

| File          | Purpose                                                      |
| ------------- | ------------------------------------------------------------ |
| `client.ts`   | Client-side exports: hooks, contexts, client components      |
| `server.ts`   | Server-side exports: server actions, data fetching functions |
| `schema.ts`   | DB table definitions + validation schemas                    |
| `components/` | UI components internal to the module                         |

**Cross-module imports**: Only from `client.ts`, `server.ts`, or `schema.ts` entry points.
Never import from `components/` or internal files of another module.

---

## Key Constraints

- **Modular Monolith**: No deep cross-module imports. Use public entry points only.
- **App Router pages are thin**: Pages call server actions or import from module `client.ts`. No business logic in `app/`.
- **DB schema ownership**: Each module owns its tables. Changes go in the module's `schema.ts`.
- **No new doc files** unless explicitly requested.
- **After significant changes**: Run `npm run type-check` and `npm run graph` to check type safety and architecture.
