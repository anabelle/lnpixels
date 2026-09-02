import { NakaPay } from 'nakapay-sdk';
import crypto from 'crypto';

/** Provider-agnostic payment event fed to the shared webhook processing */
export interface NormalizedPaymentEvent {
  event: string;          // 'payment.completed'
  payment_id: string;
  metadata?: any;
  amount?: number;
}

export interface PaymentsAdapter {
  createInvoice(amount: number, description: string, metadata?: any): Promise<{
    id: string;
    invoice: string;
    payment_hash: string;
  }>;
  verifyWebhook(rawBody: string, signature: string, headers?: Record<string, string | string[] | undefined>): boolean;
  /** Normalize a provider webhook payload; null = ignore. May verify server-side (pull). */
  extractPaymentEvent?(rawBody: string): Promise<NormalizedPaymentEvent | null>;
  /** Reconcile pending invoices against provider state (missed webhooks). */
  pollPendingEvents?(): Promise<NormalizedPaymentEvent[]>;
}

/** Invoice context awaiting settlement. Persisted via PendingInvoiceStore. */
export interface PendingInvoiceRecord {
  metadata: any;
  amount: number;
  description: string;
  paymentRequest?: string;
  createdAt: number;
}

export interface PendingInvoiceHash {
  paymentHash: string;
  entry: PendingInvoiceRecord;
}

/** Pluggable persistence for pending invoices (SQLite in prod, Map in tests/fallback) */
export interface PendingInvoiceStore {
  savePendingInvoice(paymentHash: string, entry: PendingInvoiceRecord): void;
  getPendingInvoice(paymentHash: string): PendingInvoiceRecord | undefined;
  findPendingInvoicesByMemoAmount(memo: string | null, amount: number): PendingInvoiceHash[];
  deletePendingInvoice(paymentHash: string): void;
  listPendingInvoices(): PendingInvoiceHash[];
  purgePendingInvoicesOlderThan(maxAgeMs: number): number;
}

/** In-memory fallback store — same semantics as the SQLite-backed one */
export class MemoryPendingStore implements PendingInvoiceStore {
  private map = new Map<string, PendingInvoiceRecord>();

  savePendingInvoice(paymentHash: string, entry: PendingInvoiceRecord): void {
    this.map.set(paymentHash, entry);
  }

  getPendingInvoice(paymentHash: string): PendingInvoiceRecord | undefined {
    return this.map.get(paymentHash);
  }

  findPendingInvoicesByMemoAmount(memo: string | null, amount: number): PendingInvoiceHash[] {
    const out: PendingInvoiceHash[] = [];
    for (const [paymentHash, entry] of this.map) {
      if ((entry.description || null) === (memo || null) && entry.amount === amount) {
        out.push({ paymentHash, entry });
      }
    }
    return out;
  }

  deletePendingInvoice(paymentHash: string): void {
    this.map.delete(paymentHash);
  }

  listPendingInvoices(): PendingInvoiceHash[] {
    return Array.from(this.map.entries()).map(([paymentHash, entry]) => ({ paymentHash, entry }));
  }

  purgePendingInvoicesOlderThan(maxAgeMs: number): number {
    const cutoff = Date.now() - maxAgeMs;
    let removed = 0;
    for (const [paymentHash, entry] of this.map) {
      if (entry.createdAt < cutoff) { this.map.delete(paymentHash); removed++; }
    }
    return removed;
  }
}

export class NakaPayAdapter implements PaymentsAdapter {
  private nakaPay: NakaPay;
  private processedNonces: Set<string> = new Set();
  private readonly MAX_AGE = 300; // 5 minutes
  private readonly CLEANUP_INTERVAL = 60000; // 1 minute

  constructor() {
    const apiKey = process.env.NAKAPAY_API_KEY;
    console.log('Initializing NakaPay with API key:', apiKey ? '***' + apiKey.slice(-4) : 'NOT FOUND');
    if (!apiKey) {
      throw new Error('NAKAPAY_API_KEY environment variable is required');
    }
    this.nakaPay = new NakaPay(apiKey);
    console.log('NakaPay initialized successfully');
    
    // Cleanup old nonces periodically
    setInterval(() => this.cleanupOldNonces(), this.CLEANUP_INTERVAL);
  }

  private cleanupOldNonces() {
    // Nonces are stored with timestamps in a Map for better cleanup
    // For now, we'll implement a simpler version that just clears occasionally
    if (this.processedNonces.size > 10000) {
      this.processedNonces.clear();
      console.log('Cleared processed nonces due to size limit');
    }
  }

  async createInvoice(amount: number, description: string, metadata?: any) {
    try {
      console.log('Creating invoice with NakaPay:', { amount, description, metadata });
      const paymentRequest = await this.nakaPay.createPaymentRequest({
        amount,
        description,
        destinationWallet: process.env.NAKAPAY_DESTINATION_WALLET || '',
        metadata
      });

      console.log('Invoice created successfully:', paymentRequest);
      return {
        id: paymentRequest.id,
        invoice: paymentRequest.invoice,
        payment_hash: paymentRequest.id // Using id as payment_hash for now
      };
    } catch (error: any) {
      console.error('NakaPay error:', error);
      throw new Error(`Failed to create invoice: ${error.message}`);
    }
  }

  verifyWebhook(rawBody: string, signature: string): boolean {
    const secret = process.env.NAKAPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.error('NAKAPAY_WEBHOOK_SECRET environment variable is required');
      return false;
    }

    try {
      // Parse payload for replay protection
      const payload = JSON.parse(rawBody);
      
      // Check timestamp (prevent replay attacks)
      if (!payload.timestamp) {
        console.error('Missing timestamp in webhook payload');
        return false;
      }
      
      const now = Math.floor(Date.now() / 1000);
      if (now - payload.timestamp > this.MAX_AGE) {
        console.error(`Webhook timestamp too old: ${payload.timestamp}, current: ${now}`);
        return false;
      }

      // Check nonce (prevent duplicate processing)
      if (payload.nonce) {
        if (this.processedNonces.has(payload.nonce)) {
          console.error(`Duplicate nonce detected: ${payload.nonce}`);
          return false;
        }
        this.processedNonces.add(payload.nonce);
      }

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

      // Check if signatures have the same length before using timingSafeEqual
      if (signature.length !== expectedSignature.length) {
        return false;
      }

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      console.error('NakaPay webhook verification error:', error);
      return false;
    }
  }
}

// For testing purposes
export class MockPaymentsAdapter implements PaymentsAdapter {
  async createInvoice(amount: number, description: string, metadata?: any) {
    return {
      id: `mock_${Date.now()}`,
      invoice: `lnbc${amount}...`, // Mock invoice
      payment_hash: `hash_${Date.now()}`
    };
  }

  verifyWebhook(rawBody: string, signature: string): boolean {
    return true; // Mock always returns true
  }
}

/**
 * Blink (Galoy) adapter — https://api.blink.sv/graphql, X-API-KEY auth (scope: Read+Receive).
 * Blink webhooks don't echo metadata, so pending invoice context (paymentHash → metadata)
 * lives in a PendingInvoiceStore — SQLite in production (survives restarts), Map fallback.
 * Webhook signatures follow the Standard Webhooks spec (Svix): v1, HMAC-SHA256,
 * signed content `${svix-id}.${svix-timestamp}.${payload}`, 5-minute tolerance.
 */
export class BlinkAdapter implements PaymentsAdapter {
  private apiKey: string;
  private endpoint: string;
  private walletId: string | null = null;
  private store: PendingInvoiceStore;
  private warnedNoSecret = false;
  private readonly PENDING_MAX_AGE = 24 * 3600 * 1000; // invoices live far less; safety cap

  constructor(store: PendingInvoiceStore = new MemoryPendingStore()) {
    const apiKey = process.env.BLINK_API_KEY;
    if (!apiKey) {
      throw new Error('BLINK_API_KEY environment variable is required');
    }
    this.apiKey = apiKey;
    this.store = store;
    this.endpoint = process.env.BLINK_API_ENDPOINT || 'https://api.blink.sv/graphql';
    const timer = setInterval(() => {
      const removed = this.store.purgePendingInvoicesOlderThan(this.PENDING_MAX_AGE);
      if (removed > 0) console.log(`Blink: purged ${removed} stale pending invoices`);
    }, 10 * 60000);
    timer.unref?.();
  }

  private async graphql(query: string, variables: Record<string, any>): Promise<any> {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': this.apiKey },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) {
      throw new Error(`Blink API Error (${res.status}): ${(await res.text()).slice(0, 200)}`);
    }
    const body = await res.json() as { data?: any; errors?: Array<{ message: string }> };
    if (body.errors?.length) {
      throw new Error(`Blink GraphQL error: ${body.errors.map(e => e.message).join('; ')}`);
    }
    return body.data;
  }

  private async resolveWalletId(): Promise<string> {
    if (this.walletId) return this.walletId;
    if (process.env.BLINK_WALLET_ID) {
      this.walletId = process.env.BLINK_WALLET_ID;
      return this.walletId;
    }
    const data = await this.graphql(
      'query Me { me { defaultAccount { wallets { id walletCurrency } } } }', {}
    );
    const btc = data?.me?.defaultAccount?.wallets?.find((w: any) => w.walletCurrency === 'BTC');
    if (!btc?.id) {
      throw new Error('Blink: no BTC wallet found for this account');
    }
    const id: string = btc.id;
    this.walletId = id;
    console.log('Blink BTC wallet resolved:', id);
    return id;
  }

  async createInvoice(amount: number, description: string, metadata?: any) {
    try {
      const walletId = await this.resolveWalletId();
      const data = await this.graphql(
        `mutation LnInvoiceCreate($input: LnInvoiceCreateInput!) {
          lnInvoiceCreate(input: $input) {
            invoice { paymentRequest paymentHash satoshis }
            errors { message }
          }
        }`,
        { input: { amount, walletId, memo: description } }
      );
      const inv = data?.lnInvoiceCreate?.invoice;
      const errs = data?.lnInvoiceCreate?.errors;
      if (!inv?.paymentRequest || !inv?.paymentHash) {
        throw new Error(errs?.[0]?.message || 'Blink returned no invoice');
      }
      this.store.savePendingInvoice(inv.paymentHash, {
        metadata, amount, description,
        paymentRequest: inv.paymentRequest,
        createdAt: Date.now()
      });
      return {
        id: inv.paymentHash,
        invoice: inv.paymentRequest,
        payment_hash: inv.paymentHash
      };
    } catch (error: any) {
      console.error('Blink error:', error);
      throw new Error(`Failed to create invoice: ${error.message}`);
    }
  }

  verifyWebhook(rawBody: string, signature: string, headers?: Record<string, string | string[] | undefined>): boolean {
    const secret = process.env.BLINK_WEBHOOK_SECRET;
    if (!secret) {
      // Blink callback endpoints may be unsigned (no whsec exposed). Security then
      // relies on the server-side pull verification in extractPaymentEvent().
      if (!this.warnedNoSecret) {
        this.warnedNoSecret = true;
        console.warn('Blink webhook: BLINK_WEBHOOK_SECRET unset — relying on API pull-verification only');
      }
      return true;
    }
    const id = headers?.['svix-id'];
    const ts = Number(headers?.['svix-timestamp']);
    if (!id || !ts) {
      console.error('Blink webhook: missing svix headers');
      return false;
    }
    // Replay protection: 5-minute tolerance (Standard Webhooks spec)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - ts) > 300) {
      console.error(`Blink webhook: timestamp out of range (${ts} vs ${now})`);
      return false;
    }
    const toSign = `${id}.${ts}.${rawBody}`;
    const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
    const expected = crypto.createHmac('sha256', key).update(toSign).digest('base64');
    return String(signature)
      .split(' ')
      .some((part) => {
        const [version, b64] = part.split(',');
        if (version !== 'v1' || !b64) return false;
        const a = Buffer.from(b64, 'base64');
        const b = Buffer.from(expected, 'base64');
        return a.length === b.length && crypto.timingSafeEqual(a, b);
      });
  }

  /** O(1) invoice status query — returns true (PAID), false (PENDING/EXPIRED) or null (unknown/error) */
  private async invoicePaid(paymentRequest: string): Promise<boolean | null> {
    try {
      // NOTE: LnInvoicePaymentStatusInput takes paymentRequest only (walletId is rejected by the API)
      const data = await this.graphql(
        `query S($input: LnInvoicePaymentStatusInput!) {
          lnInvoicePaymentStatus(input: $input) { errors { message } status }
        }`,
        { input: { paymentRequest } }
      );
      const st = data?.lnInvoicePaymentStatus;
      if (st?.errors?.length) throw new Error(st.errors[0].message);
      if (st?.status === 'PAID') return true;
      if (st?.status === 'PENDING' || st?.status === 'EXPIRED') return false;
      return null;
    } catch (err: any) {
      console.error(`Blink invoice status query failed: ${err.message}`);
      return null;
    }
  }

  private async recentTxNodes(first: number): Promise<any[]> {
    const data = await this.graphql(
      `query T($first: Int) { me { defaultAccount { transactions(first: $first) { edges { node {
        id direction status settlementAmount memo
        initiationVia { ... on InitiationViaLn { paymentHash } }
      } } } } } }`,
      { first }
    );
    return data?.me?.defaultAccount?.transactions?.edges?.map((e: any) => e.node) || [];
  }

  /** Server-side truth check: the payment must be a SUCCESS RECEIVE in the account */
  private async verifySettled(paymentHash?: string, expectedAmount?: number, txId?: string): Promise<boolean> {
    try {
      if (paymentHash) {
        // Fast path: ask Blink directly for the invoice status
        const pending = this.store.getPendingInvoice(paymentHash);
        if (pending?.paymentRequest) {
          const paid = await this.invoicePaid(pending.paymentRequest);
          if (paid === true) return true;
          // PAID is definitive; PENDING/EXPIRED/unknown fall through to the tx scan
        }
      }
      // Slow path (intraledger by txId, legacy rows): scan recent transactions
      const nodes = await this.recentTxNodes(20);
      const tx = nodes.find((n) => (paymentHash && n.initiationVia?.paymentHash === paymentHash) || (txId && n.id === txId));
      return !!tx && tx.status === 'SUCCESS' && tx.direction === 'RECEIVE'
        && (expectedAmount === undefined || tx.settlementAmount === expectedAmount);
    } catch (err: any) {
      console.error(`Blink pull-verify failed: ${err.message}`);
      return false;
    }
  }

  async extractPaymentEvent(rawBody: string): Promise<NormalizedPaymentEvent | null> {
    let p: any;
    try {
      p = JSON.parse(rawBody);
    } catch {
      return null;
    }
    if (p.eventType !== 'receive.lightning' && p.eventType !== 'receive.intraledger') return null;
    const tx = p.transaction;
    if (!tx || tx.status !== 'success') return null;

    const hash: string | undefined = tx.initiationVia?.paymentHash;
    let matchHash: string | undefined = hash;
    let entry: PendingInvoiceRecord | undefined = hash ? this.store.getPendingInvoice(hash) : undefined;

    // Intraledger (Blink-to-Blink) payments carry no payment hash: best-effort
    // unique match by memo + amount among pending invoices.
    if (!entry && p.eventType === 'receive.intraledger') {
      const matches = this.store.findPendingInvoicesByMemoAmount(tx.memo || null, tx.settlementAmount);
      if (matches.length === 1) {
        matchHash = matches[0].paymentHash;
        entry = matches[0].entry;
      } else {
        console.warn(`Blink intraledger webhook: ${matches.length} pending matches for memo="${tx.memo}", skipping`);
        return null;
      }
    }

    if (!entry) {
      console.warn(`Blink webhook: no pending invoice for hash=${hash?.slice(0, 16)}...`);
      return null;
    }
    // Anti-forgery: confirm against account state via API before accepting
    // (intraledger has no payment hash — verify by Blink transaction id)
    const verified = hash
      ? await this.verifySettled(hash, entry.amount)
      : await this.verifySettled(undefined, entry.amount, tx.id);
    if (!verified) {
      console.warn(`Blink webhook: pull-verification FAILED for ${hash ? 'hash=' + hash.slice(0, 16) : 'tx=' + String(tx.id).slice(0, 16)} — ignoring`);
      return null;
    }
    if (matchHash) this.store.deletePendingInvoice(matchHash);

    return {
      event: 'payment.completed',
      payment_id: hash || tx.id,
      metadata: entry.metadata,
      amount: tx.settlementAmount
    };
  }

  /**
   * Reconcile: settle pending invoices that were paid but whose webhook was missed
   * (server restart, delivery failure). Truth comes exclusively from the Blink API.
   */
  async pollPendingEvents(): Promise<NormalizedPaymentEvent[]> {
    const events: NormalizedPaymentEvent[] = [];
    const pending = this.store.listPendingInvoices();
    if (pending.length === 0) return events;

    // One tx-list fetch covers rows without a stored paymentRequest (match by hash)
    let nodes: any[] | null = null;
    const loadNodes = async (): Promise<any[]> => {
      if (nodes === null) nodes = await this.recentTxNodes(50);
      return nodes;
    };

    for (const { paymentHash, entry } of pending) {
      if (entry.paymentRequest) {
        if (await this.invoicePaid(entry.paymentRequest) === true) {
          this.store.deletePendingInvoice(paymentHash);
          events.push({ event: 'payment.completed', payment_id: paymentHash, metadata: entry.metadata, amount: entry.amount });
        }
        continue;
      }
      // Legacy row (no paymentRequest): match by hash among recent transactions
      const recent = await loadNodes();
      const tx = recent.find((n) =>
        n.status === 'SUCCESS' && n.direction === 'RECEIVE'
        && n.initiationVia?.paymentHash === paymentHash && n.settlementAmount === entry.amount
      );
      if (tx) {
        this.store.deletePendingInvoice(paymentHash);
        events.push({ event: 'payment.completed', payment_id: paymentHash, metadata: entry.metadata, amount: entry.amount });
      }
    }
    if (events.length > 0) {
      console.log(`Blink reconcile: settled ${events.length} pending invoice(s) missed by webhooks`);
    }
    return events;
  }
}

/** Provider-gated factory: PAYMENTS_PROVIDER override > BLINK_API_KEY > NAKAPAY_API_KEY > Mock */
export function createPaymentsAdapter(store?: PendingInvoiceStore): PaymentsAdapter {
  const provider = (process.env.PAYMENTS_PROVIDER || '').toLowerCase();
  if (provider === 'blink' || (!provider && process.env.BLINK_API_KEY)) {
    return new BlinkAdapter(store);
  }
  if (provider === 'nakapay' || (!provider && process.env.NAKAPAY_API_KEY)) {
    return new NakaPayAdapter();
  }
  return new MockPaymentsAdapter();
}