0;69;44M0;69;44m## AGENTS — TDD red-green protocol for LNPixels

Purpose: Implement the MVP defined in `design.md` using tight, automatable TDD. Keep commits small, stay green, and prevent regressions.

---

Guiding rules
- Source of truth: `design.md`. Mirror its contracts and constants. If ambiguity exists, add a TODO in code and a note in `design.md` without blocking work.
- Always TDD: write a failing test, implement the smallest change, make it green, then refactor. Keep tests fast and deterministic.
- Keep surface minimal: ship the smallest feature slice end-to-end before starting the next.

---

Workflow (red → green → refactor)
1) Plan a 30–60 minute slice: pick one acceptance or unit test from the list below.
2) Red: write a failing test (unit first, integration if contract-level). Commit as `test: …` referencing the section in `design.md`.
3) Green: implement the minimum to pass the test. Commit as `feat: …` or `fix: …`.
4) Refactor: remove duplication, name things per the glossary, keep public APIs stable. Commit as `refactor: …`.
5) Rerun the full test suite. Don’t leave the branch broken.

---

Project structure (implemented)
- `api/` Node 22+, Express, Socket.IO, better-sqlite3, nostr-tools, nakapay-sdk
- `lnpixels-app/` Next.js + React 19 + TypeScript, Zustand, socket.io-client, Testing Library
- `ops/` scripts and CI
- Tests: `api/test/**`, `lnpixels-app/__tests__/**`

Recommended dev deps
- API: Vitest, Supertest, ts-node/tsx, ESLint
- App: Vitest, @testing-library/react, @testing-library/user-event, jsdom, @vitest/coverage-v8

---

Must-have contracts to implement and test
Pricing and rules ✅ IMPLEMENTED
- price() implements base/overwrite rules EXACTLY as in `design.md`.
- Bulk sums per-pixel prices; mapping assigns letters left→right, top→bottom.
- Enforce limits (max rectangle size; min invoice total) per `design.md`.
- ✅ Fixed: Basic pixels now correctly charge 1 sat (was bug where all pixels charged 10 sats)

API endpoints ✅ IMPLEMENTED
- GET /api/pixels returns only set pixels within rect.
- POST /api/invoices validates input, computes price, creates invoice via provider adapter, returns invoice + payment_hash.
- POST /api/invoices/bulk validates rect + optional letters, computes authoritative quote (count and price), returns invoice + payment_hash.
- POST /api/payments/webhook idempotently applies payment: re-validates quote, upserts pixel(s) in a transaction, emits WebSocket events, broadcasts Nostr events.
- GET /api/activity and GET /api/verify/:eventId return data as specified.

Real-time and Nostr ✅ IMPLEMENTED
- WebSocket: `pixel.update` per pixel; `activity.append` optional batch summary.
- Nostr event kind and tags per `design.md`.
- ✅ PaymentModal with QR codes and real-time payment status
- ✅ Professional UI with Lightning Network integration

---

Required test belt (keep green before merging)
Unit tests (API) ✅ IMPLEMENTED
- price():
  - basic, color, color+letter
  - overwrite price rule(s) per `design.md`
  - bulk total = sum of per-pixel prices, including overwrites
- letters mapping: rectangle N×M with string length <, =, > N×M; correct assignment L→R, T→B; extras ignored.
- validators: color hex; x,y integers; letters sanitized and visible; rectangle limits; min total enforced.
- idempotency: duplicate webhook by payment_hash is safe.

Integration tests (API) ✅ IMPLEMENTED
- single pixel flow: POST /invoices → webhook → GET /pixels; WebSocket emission observed.
- bulk flow with letters: POST /invoices/bulk → webhook → GET /pixels; mapping + totals correct; per-pixel events emitted.
- contention: one pixel changes between quote and webhook → bulk apply rejected with retryable error.

Web tests ✅ IMPLEMENTED
- canvas viewport renders only visible set pixels; pan/zoom updates URL.
- purchase panel price preview updates based on selection and letters count (server quote authoritative).
- bulk rectangle selection clamps letters length to selection size in UI.
- ✅ PaymentModal component: 8 comprehensive tests covering modal functionality, QR codes, close handlers, error handling
- ✅ ColorPicker component: 11 tests for UI interactions
- ✅ Canvas integration tests for pixel rendering and selection

Non-functional checks ✅ IMPLEMENTED
- performance: price calc and bulk quote over a 1k-cell rect under a budgeted time locally.
- security: inputs sanitized; no secrets in client bundle.
- ✅ Payment security: NakaPay integration with proper API key handling
- ✅ UI/UX: Professional modal design with accessibility features

---

Mocking/adapters (do not couple tests to externals)
- Payments provider (Nakapay): define an interface `PaymentsAdapter` with methods `createInvoice()` and webhook signature verification. In tests, use an in-memory fake that returns deterministic invoice/payment_hash.
- Nostr: create `NostrBroadcaster` with `publish(event) → event_id`. In tests, return a fixed id; validate event structure.
- Socket.IO: expose an emitter; in tests, spy on emitted events and assert payloads.
- SQLite: for tests, use a temp file DB or in-memory; wrap each test in a transaction or recreate schema.

---

Coding standards
- Types first: TypeScript everywhere. Narrow types for API payloads and DB rows.
- Pure functions for price, mapping, validation; isolate side effects in adapters/services.
- Small modules. One responsibility each. No hidden globals.
- Logs: structured; never leak secrets.

---

Runbook (current implementation)
```bash
# install deps at root using pnpm workspaces
pnpm install

# run API unit + integration tests
cd api && pnpm run test

# run App tests
cd lnpixels-app && pnpm run test

# run full suite (CI equivalent)
pnpm run test

# start development servers
pnpm run dev:api    # API server on port 3000
pnpm run dev:app    # App server on port 3002
pnpm run dev:all    # Start both servers

# payment integration setup
# 1. Add NAKAPAY_API_KEY to api/.env
# 2. Test payment flow: select pixels → click "Purchase Pixels" → scan QR code
# 3. Payment confirmation via webhook updates pixel ownership
```

---

Definition of done for a slice
- New tests added; all tests green locally.
- Contracts unchanged or `design.md` updated atomically with the code.
- No console errors in dev server; lints pass.
- Minimal docs added: README snippet or in-code comments for tricky parts.

---

When blocked or ambiguous
- Add an explicit TODO and a short “Assumption:” comment near the code.
- Prefer the simplest reasonable assumption consistent with `design.md`.
- Leave a note in `design.md` “Open questions” if it impacts behavior.

---

Commit message conventions
- `test: …` add/adjust tests
- `feat: …` implement new capability behind existing contract
- `fix: …` correct behavior; add a regression test first
- `refactor: …` no behavior change; tests remain green

---

CI recommendations (optional)
- Run API and Web tests in parallel jobs.
- Cache node_modules. Upload test results and coverage.
- Fail build on untested changed files in `api/src` and `web/src` (threshold can be modest initially).

---

Payment Integration Status ✅ IMPLEMENTED
- NakaPay SDK integration with Lightning Network payments
- PaymentModal component with QR codes and invoice display
- Real-time payment status via WebSocket
- Professional UI with error handling and user feedback
- Fixed pricing bug: basic pixels now correctly charge 1 sat
- Comprehensive test coverage for payment flows

Current MVP Status: ✅ PRODUCTION READY
- All core features implemented and tested
- Payment system fully functional
- Real-time updates working
- Professional UI/UX
- Comprehensive error handling
- Security best practices implemented

Reminder: ship smallest slices end-to-end. Green before done.
