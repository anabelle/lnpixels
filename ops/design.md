## LNPixels v2.0 — Minimal, viral, automatable design

One-line: Buy pixels with Lightning. Paint an infinite canvas. Broadcast to Nostr. No accounts, no personal data.

This document trims to the smallest lovable product, uses consistent terms, removes redundancy, and adds precise contracts so it can be implemented and tested quickly.

---

## 1) Product at a glance

- Goal: A cypherpunk pixel art canvas where purchases are pixels. Pay sats → paint → event is publicly verifiable.
- Non-goals (v2.0 MVP): No user accounts, no moderation system, no images upload, no on-chain verification, no complex socials beyond Nostr broadcast.
- Principles: Zero-friction, privacy-first, Bitcoin-native, decentralized discovery, viral by default.

Glossary
- Pixel: Smallest unit at coordinate (x,y)
- Purchase: A Lightning payment to set color/letter for a pixel
- Overwrite: A purchase on an already-set pixel
- Sats: Integer number of satoshis (pricing unit)
- Event: Signed Nostr event describing a purchase

---

## 2) MVP Scope (ship fast)

User stories (must-have)
- As a visitor, I can pan/zoom an infinite canvas and see pixels in view.
- As a visitor, I can pick one pixel, choose a color (and optional single letter), see price, and generate a Lightning invoice.
- As a visitor, I can select a rectangle area (bulk), apply a single color and optionally assign letters across the area, get one invoice for all selected pixels, and paint them on confirmation.
- When payment is confirmed, the pixel updates in real time for all viewers.
- Each purchase emits a signed Nostr event that anyone can verify.
- I can share a URL that opens the canvas at specific x,y,zoom.

Out of scope (defer)
- Freeform/lasso bulk selection; per-pixel different colors in one bulk; per-letter different colors; trending; minimap; pixel signing via Nostr for ownership;

Virality hooks in MVP
- Real-time activity feed pane (last N purchases with links).
- Shareable coordinate URLs.
- Signed Nostr broadcasts to multiple public relays.

Success criteria
- TTI to first painted pixel < 60s on a fresh session.
- p95 pixel fetch round-trip < 250ms for 1k x 1k viewport.
- Payment to visible update < 3s (subject to provider confirmation latency).

---

## 3) Architecture (simple by default)

High-level
- Single-page app (React + TS) talking to a single Node API over REST + WebSocket.
- SQLite for persistence. Socket.IO for real-time. Nostr for broadcast.
- Lightning via Nakapay using server-side API + webhook/callback.

Tech choices
- Frontend: React 18 + TypeScript, Vite, Tailwind, shadcn/ui, Zustand, socket.io-client, nostr-tools.
- Backend: Node 18+, Express, Socket.IO, better-sqlite3 or sqlite3, nostr-tools. Use native fetch to call Nakapay REST.
- Deployment: Single VPS, Docker optional, HTTPS via reverse proxy.

Repository layout (proposed)
- web/ — React app
- api/ — Express server
- ops/ — infra scripts and docs

---

## 4) Data model and invariants

SQLite schema (minimal)
```
CREATE TABLE IF NOT EXISTS pixels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  color TEXT NOT NULL CHECK (length(color)=7 AND substr(color,1,1)='#'),
  letter TEXT CHECK (letter IS NULL OR length(letter)=1),
  sats INTEGER NOT NULL CHECK (sats > 0),
  created_at INTEGER NOT NULL,
  payment_hash TEXT UNIQUE,   -- Lightning payment hash or invoice id
  event_id TEXT,              -- Nostr event id
  UNIQUE(x, y)
);

CREATE INDEX IF NOT EXISTS idx_pixels_xy ON pixels(x, y);
CREATE INDEX IF NOT EXISTS idx_pixels_created ON pixels(created_at);
```

Invariants
- One row per coordinate. Overwrites update existing row fields and created_at; keep history out-of-scope for MVP.
- Color is hex #RRGGBB. Letter is optional single UTF-8 grapheme (best-effort single-char validation).
- sats is the amount paid for the last mutation.

---

## 5) Pricing and rules

Base pricing
- Basic pixel: 1 sat
- Color pixel: 10 sats
- Color + letter: 100 sats

Overwrite rule (per pixel)
- 2x last sold price for any type

Bulk pricing (MVP constraints)
- Rectangle only; all selected pixels share the same color; optional letters string may be provided.
- Total price = sum of per-pixel prices using the rules above (computed per coordinate).
- Limits: max 1,000 pixels per bulk request; minimum invoice total = 1 sats (to avoid dust/fees issues).
- Letters mapping: letters are assigned left-to-right, top-to-bottom across the rectangle (natural reading order). If fewer letters than cells, remaining cells are color-only; if more, extras are ignored.

---

## 6) API contracts (precise, small)

All responses are JSON; errors include { error: { code, message } }.

- GET /api/pixels?x1=&y1=&x2=&y2=
  - Purpose: Fetch current pixels in an inclusive rect.
  - 200 { pixels: [{ x, y, color, letter, sats, created_at }] }

- POST /api/invoices
  - Body: { x, y, color, letter|null }
  - 200 { invoice: string, payment_hash: string, price_sats: number }
  - 409 { error } if (x,y) invalid or reserved in-flight

- POST /api/invoices/bulk
  - Body: { rect: { x1, y1, x2, y2 }, color, letters?: string }
  - Constraints: rectangle only; one color; optional letters string (assigned L→R, top→bottom). Extras are ignored; missing letters yield color-only cells.
  - 200 { invoice, payment_hash, price_sats, count, count_lettered }
  - 413/422 on size or validation errors.

- POST /api/payments/webhook  (provider callback)
  - Body: { payment_hash: string, settled: boolean, sats_paid: number }
  - 200 on success; server will validate and apply mutation if price satisfied.

- GET /api/activity?limit=50
  - 200 { events: [{ x,y,color,letter,sats,created_at,event_id }] }

- GET /api/verify/:eventId
  - 200 { valid: boolean, event?: object }

WebSocket events
- pixel.update { x, y, color, letter, sats, created_at }
- activity.append { x, y, summary: string, created_at, event_id }

Notes
- Bulk limited to rectangle + one color (letters optional) for MVP; extend later if needed.
- Rate-limit POST /api/invoices by IP.
- Rate-limit POST /api/invoices/bulk by IP and size; enforce max count.

---

## 7) Lightning payment flow

1) Client requests invoice for (x,y,color,letter). Server computes price using current DB state to know if overwrite applies.
2) Server creates invoice via Nakapay and returns { invoice, payment_hash, price_sats }.
3) Payment confirmation arrives via webhook (or server polls if webhook unavailable). Do not claim “on-chain” verification; rely on provider settlement.
4) On confirmed and amount >= expected price, server:
   - Upserts pixel row.
   - Emits pixel.update over WebSocket.
   - Broadcasts signed Nostr event to relays; stores event_id.

Bulk specifics
- Invoice creation stores a quote for the rectangle, resolved letters mapping, and a hash of current versions of targeted pixels (optimistic concurrency).
- On webhook, server re-validates that targeted pixels haven’t changed since quote; if they have, mark as failed and return a retryable error to client.
- On success, upsert all pixels in a single transaction and emit per-pixel pixel.update; optionally emit a single activity.append summary for the batch.

Error modes
- Underpaid or expired invoice → no change; mark failed.
- Duplicate webhook → idempotent by payment_hash.
- Contention: If two invoices target same (x,y), whichever settles first wins; the other remains visible as paid but not applied (out-of-scope to refund in MVP).

---

## 8) Nostr events (contract)

Event kind: 30078

Tags
- ["x", "<int>"]
- ["y", "<int>"]
- ["color", "#RRGGBB"]
- ["letter", "A"]  (omit if null)
- ["sats", "<int>"]
- ["type", "purchase"]
- ["payment_hash", "<hash>"]

Content
- "Pixel (x,y) updated"

Relays
- Post to at least 3 relays. Failures are retried with backoff. Store final event_id when accepted by any relay.

Keys
- App has a dedicated keypair stored server-side. No user keys required for MVP.

---

## 9) Client UX (pared down)

Canvas
- Virtualized view that renders only visible pixels; pan/zoom; coordinate readout.
- Zoom 1–10; URL reflects state: /?x=..&y=..&z=..

Purchase panel
- Pixel type selection (basic, color, color+text)
- Color picker and single-letter input with its own color appear or disappear according to selected type.
- Shows computed price and an invoice QR + copy button.
- Status: awaiting payment → confirmed → painted.

Bulk selection
- Drag to select a rectangle; shows count and total price preview (one color for all; optional letters string input, max length updated to current selection).
- Letters are assigned left-to-right, top-to-bottom across the rectangle; overflow letters are ignored.
- Generate a single invoice for the selection; on success, the region paints and recent changes stream in.

Activity panel
- Live list of last N purchases with tap-to-center links.

Mobile
- Pan + pinch-to-zoom; simple single-pixel purchase flow. PWA deferred.

---

## 10) Performance budgets

- Pixel fetch for 1k x 1k rect returns ≤ 50k cells (sparse only): server returns only set pixels.
- WebSocket messages ≤ 1KB per pixel.update.
- DB writes ≤ 1 per confirmed payment.
- Server memory O(number of connections) with heartbeat pings.

Implementation notes
- Use canvas 2D initially; introduce WebGL only if needed.
- Use worker only if main-thread paint time > 16ms at p95.
- For large rectangles, compute selection count and pricing server-side; client previews are estimates until invoice quote is returned.
- For letters, split the input into Unicode grapheme clusters (best-effort) to support emoji and accented characters; fall back to code points if needed.

---

## 11) Security and privacy

- No personal data stored. No cookies needed; use localStorage for UI prefs only.
- Validate inputs: integers for x,y; hex color; single-character letter.
 - Rate limit invoice creation; basic IP throttling.
 - Enforce max rectangle size and minimum invoice totals to avoid abuse and dust payments.
 - Validate letters length vs selection and strip control characters; reject invisible-only inputs.
- Don’t echo internal errors; log with request id.
- Secrets via environment variables; never ship keys to client.

---

## 12) Metrics and observability

- Business: conversions (invoice created → settled), pixels/day, unique payers (proxied by unique payment_hash count).
- Performance: p95 API latency for pixels and invoices; payment-confirmation-to-paint latency.
- Reliability: webhook success rate; relay publish success.

---

## 13) Delivery plan (2-week MVP)

Week 1
- API skeleton (GET /pixels, POST /invoices, webhook).
- SQLite schema + price function + idempotency.
- Bare canvas render with pan/zoom and sparse fetch.
- WebSocket pixel.update broadcast.
- Bulk: rectangle selection UI skeleton + POST /api/invoices/bulk (color+optional letters) + price preview.

Week 2
- Invoice flow end-to-end with Nakapay sandbox.
- Activity list + Nostr broadcast + verify endpoint.
- Mobile polish + URL share.
- Stabilize: limits, errors, metrics, docs.
- Bulk: optimistic concurrency check on webhook, transactional upsert, per-pixel WebSocket emission, and letter mapping tests.

Definition of done (MVP)
- A stranger can load the site, buy a pixel, see it paint within 3s, and share a link that opens on that pixel. The purchase appears in the activity feed and on Nostr.

---

## 14) Backlog (automatable tasks)

- Web: Implement canvas viewport with sparse rendering and URL state.
- Web: Purchase panel with price preview and invoice QR.
- API: Price calculator, overwrite detection, POST /invoices.
 - API: Bulk price calculator (rectangle), POST /invoices/bulk with max size and min total, letter mapping order.
- API: Webhook handler with idempotency by payment_hash.
- API: Upsert pixel and emit pixel.update.
- API: Nostr key management and event broadcast.
- API: GET /pixels (rect), GET /activity (last N), GET /verify/:eventId.
- Ops: .env template; start scripts; health endpoint.
- Tests: Unit tests for price function, input validation; integration test for invoice→webhook→pixel flow (mock provider).
 - Tests: Bulk happy path (with/without letters), contention (pixels change between quote and webhook), size limits, min total enforcement, mapping order correctness.

---

## 15) Open questions and risks

- Payment provider details: Nakapay webhook payloads and auth semantics; retries and deduplication.
- Overwrite fairness: Losing payer experience (message in UI? optional).
- Relay reliability: Minimum set of relays for initial launch.
- Abuse: Pixel sniping and automated griefing; do we introduce minimal per-IP cooldown?

---

## 16) Appendix: Minimal request/response samples

POST /api/invoices (request)
```
{ "x": 10, "y": 20, "color": "#ff0000", "letter": "A" }
```

POST /api/invoices (response)
```
{ "invoice": "lnbc1...", "payment_hash": "abc123", "price_sats": 9000 }
```

Webhook (provider → server)
```
{ "payment_hash": "abc123", "settled": true, "sats_paid": 9000 }
```

pixel.update (WebSocket)
```
{ "x":10, "y":20, "color":"#ff0000", "letter":"A", "sats":9000, "created_at": 1730000000 }
```

Nostr event (simplified)
```
{
  "kind": 30078,
  "tags": [["x","10"],["y","20"],["color","#ff0000"],["letter","A"],["sats","9000"],["type","purchase"],["payment_hash","abc123"]],
  "content": "Pixel (10,20) updated",
  "created_at": 1730000000,
  "pubkey": "...",
  "id": "...",
  "sig": "..."
}
```
