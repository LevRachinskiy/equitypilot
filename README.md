# EquityPilot

**Own your next move.** A full-stack equity compensation sandbox with scenario branching, deterministic calculations, and inspectable AI tool calls.

![EquityPilot dashboard](docs/dashboard.png)

## Run locally

Requires **Node.js 22.13+** and npm. No API key or cloud account needed.

```bash
npm ci
npm run dev
```

Open **http://localhost:5173**. The frontend proxies `/api` to the Node service on port 3001. Start with the seeded fictional grant, change assumptions, save a plan, load it from Scenarios, and save a branch. Saved plans persist in SQLite across server restarts; the browser's HttpOnly session cookie grants access for 30 days. Clearing cookies loses access to the demo workspace.

```bash
npm run check       # types, tests, production build
npx playwright install chromium
npm run test:browser # production browser smoke test; captures screenshots
npm run build
APP_ORIGIN=http://localhost:3001 npm start
```

For Windows PowerShell: `$env:APP_ORIGIN="http://localhost:3001"; npm start`.

Production build runs at **http://localhost:3001**. If Node emits an experimental SQLite warning, the engine still runs. Node 22.13+ supports this API without a command-line feature flag.

## What ships

- React 19 + TypeScript dashboard with responsive layouts and editable assumptions.
- RSU settlement / sale, NSO exercise / sale, and ISO exercise-and-hold calculations.
- Side-by-side hold / half / sell comparisons, cash, tax reserve, net worth, and concentration.
- Saved scenario snapshots and parent-child branches in SQLite.
- Express API, Zod validation, scoped ownership, HttpOnly cookies, origin checks, rate limiting, Helmet headers, and metadata-only audit events.
- Local command parser: “sell half at $100”, “hold all”, “sell 25% at $90”.
- Optional live AI: a model chooses bounded tool inputs; the engine generates every displayed number and explanation.
- Calculation trace, JSON export, tests, Dockerfile, Compose, GitHub Actions, and AWS Terraform deployment example.

## Try the demo

1. Default: 2,400 RSUs, $75 settlement price, $90 future price, 50% sale.
2. Net worth should be **$324,800**, cash **$91,800**, reserve **$61,200**.
3. Save “Base case”. Change future price to $60 and save “Downside”.
4. Click either scenario to branch from its snapshot.
5. Ask “sell all at $100” in Assistant, inspect the tool call, then apply it.
6. Open Audit trace and export the JSON for reproducibility.

## Optional live AI

Copy `.env.example` to `.env`, add `OPENAI_API_KEY`, and start the backend with:

```bash
node --env-file=.env --import tsx server/index.ts
```

In another terminal run `npx vite --host 127.0.0.1`. Keep `APP_ORIGIN=http://localhost:5173` for development. `OPENAI_MODEL` defaults to `gpt-4.1-mini`; choose a model available to your account that supports Chat Completions tool calling. No provider key is shipped. The only provider request data is the question and grant type, not the scenario balances. Questions can contain sensitive information, so use fictional data. Provider failures return an error; there is no silent fallback labeled as live AI.

The model calls `calculateScenario` with optional `futurePrice` and `sellPercent`. Zod rejects extra keys and out-of-range arguments. Tax rates cannot be changed by the model. The proposed scenario is displayed separately and must be applied by the user. The narrative is deterministic, so an LLM cannot invent numbers in the displayed answer. This sacrifices conversational breadth for verifiability.

## Docker

```bash
docker compose up --build
```

Open http://localhost:3001. Data persists in a named volume. Compose binds to loopback. For HTTPS deployments set `APP_ORIGIN` to the exact origin and `COOKIE_SECURE=true`. See [deployment](docs/deployment.md).

## Financial scope

This is an **illustrative portfolio project**, not a tax filing engine or an advisor. Rates are user-provided flat assumptions. It excludes payroll taxes, NIIT, state rules, withholding, loss benefits, future investment growth, and actual AMT liability. The horizon is metadata, not an eligibility calculation. All input shares are assumed settled or exercised; no vesting calendar is implemented. RSU settlement is assumed taxable at the entered settlement price.

ISO disposition is rejected because qualifying and disqualifying dispositions need additional dates and basis logic. ISO net worth excludes AMT liability. Cash represents the ending scenario balance, not proof that you can fund exercise or vest taxes before a future sale.

Concept references: [IRS Topic 427](https://www.irs.gov/taxtopics/tc427), [Publication 525](https://www.irs.gov/publications/p525), [Publication 550](https://www.irs.gov/publications/p550). References describe tax concepts; they do not certify these approximations.

## Repository map

```text
src/domain.ts         Shared Zod schema, calculators, trace, deterministic explanation
src/main.tsx          React dashboard, scenario comparison, assistant, audit UI
server/app.ts         HTTP API and security middleware
server/store.ts       SQLite persistence and ownership filters
server/agent.ts       Local parser / live bounded tool selection
server/index.ts       Static production hosting and graceful shutdown
tests/                Financial invariants, API isolation, assistant checks
infra/                Private AWS sandbox template
docs/                 Architecture, security, tradeoffs, deployment, verification
```

Read [architecture](docs/architecture.md), [security](docs/security.md), [tradeoffs](docs/tradeoffs.md), and [verification](docs/verification.md).

## Honest next milestones

1. Account authentication with recoverable identities and explicit data deletion.
2. Versioned, jurisdiction-specific tax rules with published fixtures and date eligibility.
3. PostgreSQL + migrations + background jobs for multiple service instances.
4. Deployed SLO dashboards and failure injection.
5. Vesting schedules, withholding reconciliation, and ISO disposition logic.

No live deployment, AWS credentials, production account auth, or third-party financial connections are included. AWS files are templates requiring your own account and review. Build quality claims should be backed by the checks you run and a deployed demo you operate.

MIT licensed. See LICENSE.
