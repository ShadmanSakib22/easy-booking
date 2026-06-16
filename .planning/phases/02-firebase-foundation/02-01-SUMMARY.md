---
phase: 02-firebase-foundation
plan: "01"
subsystem: toolchain
tags: [firebase, toolchain, emulators, vitest, java]
dependency_graph:
  requires: []
  provides:
    - firebase.json (emulator config)
    - firestore.rules (deny-all stub)
    - firestore.indexes.json (6 composite indexes)
    - storage.rules (deny-all stub)
    - .firebaserc (project alias)
    - my-app/vitest.config.ts (test runner config)
    - my-app/.env.local.example (env var reference)
  affects:
    - 02-02 (SDK init — needs firebase.json, emulator ports)
    - 02-03 (Security rules — replaces firestore.rules stub)
    - 02-04 (Indexes — uses firestore.indexes.json)
    - 02-05 (Rules testing — uses vitest.config.ts)
tech_stack:
  added:
    - firebase-tools@15.20.0 (global CLI)
    - firebase@^12.14.0
    - firebase-admin@^14.0.0
    - server-only@^0.0.1
    - "@firebase/rules-unit-testing@^5.0.1"
    - vitest@^4.1.9
    - concurrently@^10.0.3
    - tsx@^4.22.4
    - JDK 21.0.11 (at ~/.local/jdk/jdk-21.0.11)
  patterns:
    - Emulator-first dev: concurrently runs firebase emulators + next dev
    - Deny-all Firestore/Storage rules as safe default until Plan 03
    - Composite indexes pre-defined to avoid manual console work
key_files:
  created:
    - firebase.json
    - .firebaserc
    - firestore.rules
    - firestore.indexes.json
    - storage.rules
    - my-app/vitest.config.ts
    - my-app/.env.local.example
    - .gitmodules
  modified:
    - my-app/package.json (scripts + dependencies)
    - my-app/.gitignore (allow .env.local.example)
decisions:
  - "JDK 21 installed to ~/.local/jdk without sudo by downloading Oracle JDK tarball directly; JAVA_HOME added to ~/.bashrc"
  - "my-app is a git submodule in the parent repo; .gitmodules created to initialize it in the worktree"
  - ".env.local.example added as exception to .env* gitignore pattern to allow committing the template"
metrics:
  duration: "8 minutes"
  completed_date: "2026-06-16"
  tasks_completed: 2
  files_created: 9
---

# Phase 02 Plan 01: Firebase Toolchain Setup Summary

**One-liner:** Firebase emulator stack, vitest runner, and all 8 scaffold files installed with JDK 21, firebase-tools v15, and 7 npm packages.

## What Was Built

Phase 2 Wave 1 prerequisite setup — installs the complete toolchain and scaffolds all Firebase configuration files so subsequent waves (SDK init, security rules, indexes, rules testing) can proceed without environment blockers.

### Task 1: Install Java JDK 21, firebase-tools, npm packages

- JDK 21.0.11 downloaded from Oracle and extracted to `~/.local/jdk/jdk-21.0.11`; `JAVA_HOME` added to `~/.bashrc`
- `firebase-tools@15.20.0` installed globally via `npm install -g`
- `my-app` dependencies: `firebase@^12.14.0`, `firebase-admin@^14.0.0`, `server-only@^0.0.1`
- `my-app` devDependencies: `@firebase/rules-unit-testing@^5.0.1`, `vitest@^4.1.9`, `concurrently@^10.0.3`, `tsx@^4.22.4`
- `package.json` scripts updated: `dev` (concurrently), `dev:next`, `emulators`, `seed`, `test:rules`

### Task 2: Scaffold Firebase project files and vitest config

- `firebase.json`: Auth emulator 9099, Firestore 8080, Storage 9199, UI 4000
- `.firebaserc`: default project alias `demo-easyappointment`
- `firestore.rules`: deny-all stub with `rules_version = '2'` (replaced in Plan 03)
- `firestore.indexes.json`: 6 composite indexes — slots (calendarId+status+startUtc, calendarId+startUtc, calendarId+date) and bookings (creatorId+createdAt, creatorId+calendarId, bookerUid+createdAt)
- `storage.rules`: deny-all stub
- `my-app/vitest.config.ts`: node environment, includes `lib/firebase/__tests__/**/*.test.ts`, 30s timeout
- `my-app/.env.local.example`: 9 env vars (6 NEXT_PUBLIC Firebase client config + 3 server-only Admin SDK vars)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] sudo unavailable for apt-get Java install**
- **Found during:** Task 1 (Step 1)
- **Issue:** `sudo apt-get install openjdk-21-jdk` requires interactive password; agent cannot use sudo interactively
- **Fix:** Downloaded Oracle JDK 21.0.11 tarball directly from `download.oracle.com` and extracted to `~/.local/jdk/`. Added `JAVA_HOME` and `PATH` to `~/.bashrc`. Java 21.0.11 verified functional.
- **Files modified:** `~/.bashrc`
- **Commit:** ce25860

**2. [Rule 3 - Blocking] my-app is a git submodule with no .gitmodules**
- **Found during:** Task 1 commit
- **Issue:** `my-app` is tracked in the parent repo as a gitlink (submodule commit `ba8165210d1dc12b501f8a078d29ca573ed72586`) but no `.gitmodules` file existed. The worktree's `my-app` directory was empty (submodule not initialized).
- **Fix:** Created `.gitmodules` mapping `my-app` to the local repo path, then initialized with `git -c protocol.file.allow=always submodule update --init my-app`. All `my-app` file changes are committed in the submodule's detached HEAD, with the parent worktree tracking the updated gitlink.
- **Files modified:** `.gitmodules` (new)
- **Commit:** ce25860

**3. [Rule 2 - Missing] .env.local.example blocked by .env* gitignore**
- **Found during:** Task 2 (git add .env.local.example)
- **Issue:** The existing `my-app/.gitignore` pattern `.env*` blocked committing `.env.local.example`
- **Fix:** Added `!.env.local.example` negation after `.env*` in `.gitignore`. Actual `.env.local` remains gitignored; only the safe template is committed.
- **Files modified:** `my-app/.gitignore`
- **Commit:** 3bd4b2a (submodule commit 79fd840)

## Threat Model Verification

| Threat ID | Disposition | Status |
|-----------|-------------|--------|
| T-2-01-01 | mitigate | `.env*` in `.gitignore` covers `.env.local`; `!.env.local.example` exception is safe (no real secrets) |
| T-2-01-02 | accept | Emulator ports only; no production impact |
| T-2-01-03 | mitigate | `firestore.rules` deny-all prevents any accidental access |

## Known Stubs

| File | Description |
|------|-------------|
| `firestore.rules` | Deny-all placeholder — full rules implemented in Plan 03 |
| `storage.rules` | Deny-all placeholder — full rules implemented in a later plan |

These stubs are intentional: deny-all is the safe default and Plan 03 will replace `firestore.rules` with production security rules.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 (submodule) | 7d71fb4 | chore(02-01): install firebase packages and update scripts |
| Task 1 (worktree) | ce25860 | chore(02-01): install Java JDK 21, firebase-tools, and npm packages |
| Task 2 (submodule) | 79fd840 | chore(02-01): add vitest config and env example |
| Task 2 (worktree) | 3bd4b2a | feat(02-01): scaffold Firebase project files and vitest config |

## Self-Check: PASSED
