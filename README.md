# Ski Surface Spec Extension

![Version](https://img.shields.io/badge/version-0.0.1-blue) ![License](https://img.shields.io/badge/license-MIT-green)

A web application for advanced ski-tour and freeride enthusiasts that augments standard ski specifications with two critical metrics: **ski surface area** and **relative weight (g/cm²)**. The app lets users store their own ski specs, automatically compute the missing parameters and compare up to four models side-by-side – empowering data-driven gear decisions.

---

## Table of Contents

1. [Project Description](#project-description)
2. [Tech Stack](#tech-stack)
3. [Getting Started Locally](#getting-started-locally)
4. [Available Scripts](#available-scripts)
5. [Project Scope](#project-scope)
6. [Project Status](#project-status)
7. [License](#license)

---

## Project Description

Ski Surface Spec Extension solves a common problem: manufacturers rarely publish the **effective surface area** of skis or their **relative weight**. Both numbers are essential for evaluating float in variable snow and finding the best weight-to-performance ratio.

Key capabilities:

- **CRUD ski specifications** – Each length is treated as a separate model.
- **Automatic calculations** – Surface area & relative weight are computed as soon as all required dimensions are provided.
- **Powerful comparison tool** – Select up to four skis and view a responsive comparison table with highlighted key metrics.
- **CSV import/export** – Bulk manage your data with validation and detailed error reporting.
- **Authentication** – Secure, private workspace for every user (Supabase Auth).

---

## Tech Stack

| Layer                     | Technology                                                   |
| ------------------------- | ------------------------------------------------------------ |
| Runtime & Package Manager | Node.js 22 • [pnpm](https://pnpm.io/)                        |
| Frontend                  | [Astro](https://astro.build/) 5 • React 19 • TypeScript 5    |
| Styling                   | Tailwind CSS 4 • Shadcn/ui • clsx / class-variance-authority |
| Backend-as-a-Service      | Supabase (PostgreSQL + Auth)                                 |
| Dev & CI                  | ESLint • Prettier • Husky + lint-staged • GitHub Actions     |
| Hosting                   | DigitalOcean (Docker image)                                  |
| AI Integrations           | Openrouter.ai for model access                               |
| Testing                   | Vitest (unit & integration) • React Testing Library • Playwright (E2E) • axe-core |

---

## Getting Started Locally

### Prerequisites

- **Node.js 22** (see `.nvmrc`)
- **pnpm** (≥ 10.18)

```bash
# clone the repo
git clone https://github.com/your-org/ski-spec-surface.git
cd ski-spec-surface

# install dependencies
pnpm install

# start dev server
pnpm dev
```

> **Environment variables** – Supabase credentials and Openrouter API keys will be required. A sample `.env.example` will be added later.

### Build & Preview

```bash
# create production build
pnpm build

# locally preview the build
pnpm preview
```

---

## Available Scripts

| Script   | Command         | Description                                                                    |
| -------- | --------------- | ------------------------------------------------------------------------------ |
| dev      | `pnpm dev`      | Start Astro dev server with hot-reload                                         |
| build    | `pnpm build`    | Production build to `dist/`                                                    |
| preview  | `pnpm preview`  | Serve the built site locally                                                   |
| astro    | `pnpm astro`    | Run arbitrary [Astro CLI](https://docs.astro.build/en/reference/cli/) commands |
| lint     | `pnpm lint`     | Lint all files using ESLint                                                    |
| lint:fix | `pnpm lint:fix` | Lint and auto-fix problems                                                     |
| format   | `pnpm format`   | Format files using Prettier                                                    |

---

## Project Structure

Key directories and files:

```text
src/
├── components/        # Astro (static) and React (dynamic) components
│   └── ui/           # Shadcn/ui components
├── db/               # Supabase clients and database types
├── layouts/          # Astro layouts
├── lib/              # Services and helpers
│   └── services/     # Business logic services
├── middleware/       # Astro middleware
├── pages/            # Astro pages and API routes
│   └── api/          # API endpoints
├── styles/           # Global CSS
└── types/            # TypeScript type definitions
    ├── db.types.ts   # Database entities (from Supabase)
    └── api.types.ts  # DTOs, schemas, commands, queries, responses
```

---

## Project Scope

### MVP (v1.0)

- Full CRUD of ski specifications
- Auto-calculation of surface area & relative weight
- Compare up to **4** models simultaneously
- CSV import & export with validation
- User authentication & session handling
- Data validation (tip ≥ waist ≤ tail, ranges, etc.)

### Out-of-Scope (post-MVP)

- AI-powered ski search & recommendations
- Public sharing of specs
- > 4 items in comparison view
- Ski outline visualization
- Guest/demo mode, mobile app, external manufacturer DB integrations

---

## Project Status

The project is **early in development (v0.0.1)** – currently focusing on proof-of-concept algorithms and groundwork for the MVP feature set described above. Follow the issue tracker and PRD for up-to-date progress.

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
