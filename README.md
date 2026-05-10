# MaS — Massage Administration System

A web-based administration system for Thai massage parlors, developed using a **Modular Monolith** architecture to ensure clear code boundaries and easy scalability.

---

## Tech Stack

| Layer     | Technology                     |
| --------- | ------------------------------ |
| Framework | Next.js 16 (App Router)        |
| Language  | TypeScript (strict)            |
| UI        | React 19 + Tailwind CSS 4      |
| Database  | MariaDB via XAMPP (On-Premise) |
| DB Client | mysql2                         |
| Icons     | Lucide React                   |

---

## System Setup

### Prerequisites

- Node.js (LTS recommended)
- XAMPP (with MySQL/MariaDB enabled)

### Database Configuration

1. Open XAMPP → Start **MySQL**.
2. Access phpMyAdmin → Create database: `mas`

### Development Commands

```bash
npm install      # Install dependencies
npm run dev      # Start development server
```

### Deployment (Production — Mini PC)

```bash
npm ci
npm run build
npm run start
```

---

## Scripts

| Command                    | Action                                                |
| :------------------------- | :---------------------------------------------------- |
| `npm run dev`              | Dev server                                            |
| `npm run build`            | Production build                                      |
| `npm run lint`             | ESLint check                                          |
| `npm run type-check`       | TypeScript check (`tsc --noEmit`)                     |
| `npm run graph`            | Generate Obsidian dependency graph + `.VIOLATIONS.md` |

---

## Project Structure

```
src/
├── app/           # Next.js App Router — routes & layouts only
├── modules/       # Feature modules (Modular Monolith)
│   ├── core/      # Shared: Layout, SidebarNav, utils
│   ├── auth/      # PIN login + role-based access
│   ├── dashboard/ # Today's overview: stat cards, room grid
│   ├── appointments/ # Bookings/assignments/status tracking (admin only)
│   ├── entry/     # Secretary enters service/session data (secretary only)
│   ├── staff/     # Staff management, skill tags
│   ├── services/  # Service management, price, duration
│   ├── report/    # Monthly reports (secretary only)
│   └── users/     # User account management (admin only)
├── lib/
│   └── db/        # mysql2 connection pool
└── middleware.ts  # Auth middleware / route protection
```

Each module follows the pattern: `client.ts` | `server.ts` | `schema.ts`.

---

## Role-based Page Access

| Page         | Dev | Admin | Staff |
| :----------- | :-: | :---: | :---: |
| แดชบอร์ด    |  ✓  |   ✓   |   ✓   |
| นัดหมาย      |  ✓  |   —   |   ✓   |
| ลงข้อมูล     |  ✓  |   ✓   |   —   |
| พนักงาน      |  ✓  |   ✓   |   ✓   |
| บริการ       |  ✓  |   ✓   |   —   |
| รายงาน       |  ✓  |   ✓   |   —   |
| ผู้ใช้งาน    |  ✓  |   ✓   |   —   |

---

## Claude Code — AI Assistant

This project uses **Claude Code** as the primary AI assistant. Claude automatically reads `CLAUDE.md` at the root — there is no need to re-introduce the project in every new conversation.
