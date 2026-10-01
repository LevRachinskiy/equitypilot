# Security model

This application is for fictional data. It has private demo sessions, not verified user identities or a recoverable account login.

Implemented: random HttpOnly SameSite=Strict session cookies; session hashes in storage; ownership filters on every scenario operation; same-origin browser mutation checks; JSON-only mutations; Zod bounds; parameterized SQL; body size limit; rate limits; CSP and Helmet; provider secret isolated on the server; timeout for model calls; error metadata without prompt or balance logs; non-root Docker process; loopback-only Compose.

Scenario financial inputs are plaintext in the SQLite file. File permissions and volume access matter. Terraform uses encrypted EBS for storage but this does not implement field-level encryption. Session hashes are credentials scoped to a database owner. There is no “encrypted sensitive fields” claim.

Limitations: no MFA/account recovery, no full audit ingestion API, no multi-instance rate-limit store, no external bank connection, no compliance certification, no protection from all prompt injection. Model arguments are constrained but could still select a plausible price that the user did not ask for. Therefore the UI shows proposals before applying them, and the model never changes rates or directly persists anything.

Before inviting real users: adopt an identity provider, enforce HTTPS and secure cookies, define backups and retention, implement account-level deletion, restrict data access, move secrets into a secret store, add observability and dependency scanning, and perform a threat-model review. None of these are prerequisites for running the included local demo with fictional data.
