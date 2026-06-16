---
phase: 2
slug: firebase-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-16
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (security rules tests via @firebase/rules-unit-testing v5) |
| **Config file** | my-app/vitest.config.ts (Wave 0 installs) |
| **Quick run command** | `cd my-app && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd my-app && npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd my-app && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd my-app && npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green; emulator must be running
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 0 | infra | — | N/A | manual | `firebase --version` | ✅ | ⬜ pending |
| 2-01-02 | 01 | 0 | infra | — | N/A | manual | `java -version` | ✅ | ⬜ pending |
| 2-02-01 | 02 | 1 | AUTH gate | — | N/A | file | `test -f my-app/lib/firebase/client.ts` | ❌ W0 | ⬜ pending |
| 2-02-02 | 02 | 1 | AUTH gate | — | N/A | file | `test -f my-app/lib/firebase/admin.ts` | ❌ W0 | ⬜ pending |
| 2-03-01 | 03 | 2 | BOOK-02 gate | T-2-01 | Unauthenticated write to calendars is denied | unit | `cd my-app && npx vitest run --reporter=verbose` | ❌ W0 | ⬜ pending |
| 2-03-02 | 03 | 2 | BOOK-05 gate | T-2-02 | Non-creator cannot write to slots | unit | `cd my-app && npx vitest run --reporter=verbose` | ❌ W0 | ⬜ pending |
| 2-03-03 | 03 | 2 | AUTH gate | T-2-03 | Creator can read/write own calendar | unit | `cd my-app && npx vitest run --reporter=verbose` | ❌ W0 | ⬜ pending |
| 2-04-01 | 04 | 3 | infra | — | N/A | manual | `firebase emulators:start --only auth,firestore,storage` | ✅ | ⬜ pending |
| 2-04-02 | 04 | 3 | infra | — | N/A | manual | `cd my-app && npm run dev` (emulator + Next.js start) | ❌ W0 | ⬜ pending |
| 2-05-01 | 05 | 4 | infra | — | N/A | script | `cd my-app && npx tsx scripts/seed-emulator.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `my-app/vitest.config.ts` — vitest config with jsdom environment for rules tests
- [ ] `my-app/tests/firestore.rules.test.ts` — stub file for security rules tests
- [ ] Install vitest + @firebase/rules-unit-testing v5 as devDependencies
- [ ] Install firebase-tools globally: `npm install -g firebase-tools`
- [ ] Verify Java JDK 11+ is available (emulator requirement)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Firebase emulators start without errors | Infra SC-4 | Requires running process + port check | Run `firebase emulators:start`, verify UI at localhost:4000 |
| Next.js connects to emulators (no production calls) | Infra SC-1 | Requires browser network inspection | Start dev, open browser DevTools Network tab, confirm no calls to firestore.googleapis.com |
| Admin SDK initializes in Route Handler | Infra SC-1 | Requires HTTP request to trigger | `curl localhost:3000/api/health` (Wave 4 plan adds health endpoint) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
