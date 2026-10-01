# Verification record

Verified during packaging on Node 24.19.0:

- TypeScript strict check passes.
- 15 tests pass: RSU/NSO fixtures, ISO exclusions, whole-share conservation, price/basis treatment, cent rounding, input bounds, liquidity flags, API owner isolation, parent validation/deletion, cookie attributes, foreign origin rejection, and local tool execution.
- Vite production build passes.
- Chromium desktop and 390px mobile smoke checks pass: save, branch, load, assistant proposal, apply, trace, cookie-backed reload persistence, delete, and no horizontal overflow.
- Production browser smoke is included in `tests/browser.smoke.mjs`; CI installs Chromium before running it.
- npm audit reported zero known vulnerabilities after updates. This is a registry snapshot, not a guarantee of future safety.

Not executed here: live model requests (no key), Docker image build (no Docker daemon), Terraform validation/apply or AWS operation (no account/tooling). These remain explicit deployment checks. The CI recipe builds the Docker image; no claim is made that a remote GitHub run has occurred.

## Reproduce

```bash
npm ci
npm run check
npx playwright install chromium
npm run test:browser
npm audit
```

The browser smoke starts its own production server on port 3001, using a disposable SQLite database and local assistant mode. Stop any existing server on that port first. It updates `docs/dashboard.png` and `docs/mobile.png` with the actual rendered app. SQLite files, sessions, node_modules, environment files and generated dist files are excluded from the source ZIP.
