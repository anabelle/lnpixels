# LNPixels API

Node.js API for the LNPixels canvas: pixel storage, pricing, and Lightning payments.
**Payments provider: Blink (Galoy)** — migrated from NakaPay (dead platform-wide Aug 30, 2026).

## Stack

- Express 5 + Socket.IO (`/api` namespace)
- better-sqlite3 (WAL) — pixels, activity, and payment state
- Payments: `PaymentsAdapter` interface (`src/payments.ts`) with Blink / NakaPay / Mock implementations behind a provider-gated factory

## Setup

```bash
pnpm install
cp .env.example .env   # fill in BLINK_API_KEY (see below)
pnpm run dev           # tsx src/server.ts
pnpm test              # vitest
pnpm run build         # tsc -> dist/
```

## Payments architecture (Blink)

- Invoices: `LnInvoiceCreate` on the BTC wallet (`BLINK_WALLET_ID`, auto-resolved if unset).
- Webhook `POST /api/blink` (Svix/Standard-Webhooks signature if `BLINK_WEBHOOK_SECRET` is set — Blink doesn't expose webhook secrets, so when unset the payload is **pull-verified** against the account's transactions via the API before accepting; this is the anti-forgery guarantee).
- Invoice context (paymentHash → metadata) is persisted in SQLite (`pending_invoices`) — survives restarts.
- Settlement is atomic: pixels + activity + quote consumption + idempotency marker in one transaction; the pending entry is consumed in that same transaction (provider retries stay viable if the tx fails).
- Reconcile loop (every 5 min): polls `lnInvoicePaymentStatus` for pending invoices and settles paid ones whose webhook was missed.
- Late payment after quote TTL (10 min): money is in the wallet but pixels can't be delivered → row in `payment_incidents`; inspect via `GET /api/admin/incidents` (Bearer `ADMIN_TOKEN`) and deliver manually via `POST /api/admin/restore`.

## Endpoints

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /health` | — | liveness + pixel count |
| `GET /api/pixels?x1&y1&x2&y2` | — | pixels in rectangle |
| `POST /api/invoices` | — | invoice for one pixel (`{x,y,color,letter?}`) |
| `POST /api/invoices/bulk` | — | invoice for a rectangle (`{x1,y1,x2,y2,color,letters?[]}`) |
| `POST /api/invoices/pixels` | — | invoice for a pixel set + optional gift (`{pixels:[{x,y,color,letter?}],giftRecipient?,giftMessage?}`) |
| `POST /api/nakapay` \| `/api/blink` | signature / pull-verify | payment webhooks |
| `GET /api/activity?limit≤100` | — | recent activity feed |
| `GET /api/placements/gifts` | — | recent gifted pixels |
| `GET /api/stats` | — | canvas stats |
| `GET /api/admin/incidents` | Bearer `ADMIN_TOKEN` | payments received without delivery |
| `POST /api/admin/restore` | Bearer `ADMIN_TOKEN` | bulk pixel restore (array of pixels) |
| `POST /api/test-*` | `ENABLE_TEST_ENDPOINTS=1` | test-only emitters (never in prod) |

Validation: coordinates are integers, colors `#RRGGBB`/`#RGB`, letters single alphanumeric, rects ≤ `MAX_RECT_PIXELS` (1000), pixel sets ≤ `MAX_BULK_PIXELS` (1000).

## Environment variables

| Var | Required | Purpose |
|---|---|---|
| `BLINK_API_KEY` | yes (prod) | Blink API key; also selects the provider |
| `BLINK_WALLET_ID` | recommended | BTC wallet UUID (auto-resolved if unset) |
| `BLINK_WEBHOOK_SECRET` | optional | Svix `whsec_…` if you ever obtain one |
| `PAYMENTS_PROVIDER` | optional | force `blink`/`nakapay`; default: auto-detect |
| `ADMIN_TOKEN` | for admin endpoints | Bearer token for `/api/admin/*` (unset = endpoints fail closed) |
| `DB_PATH` | optional | SQLite path (default `./pixels.db`) |
| `ENABLE_TEST_ENDPOINTS` | never in prod | gates `/api/test-*` |
| `MAX_BULK_PIXELS` / `MAX_RECT_PIXELS` | optional | purchase size caps |

## Database

SQLite (WAL) at `DB_PATH`: `pixels`, `activity`, `pending_invoices`, `processed_payments`, `bulk_quotes`, `payment_incidents`. Backups must use the SQLite online backup API (`db.backup()`), never a raw file copy — the `-wal` file holds unmerged commits. Host cron: `developero/bin/backup-canvas.sh` (daily 4:17am, 30d retention).

## Tests

`pnpm test` — 75 tests (`test/blink.test.ts` covers webhook signatures, pull-verification, persistence across restarts, reconcile, incidents).
