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
  /** Normalize a provider webhook payload; null = ignore */
  extractPaymentEvent?(rawBody: string): NormalizedPaymentEvent | null;
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
 * Blink webhooks don't echo metadata, so we keep a local paymentHash→metadata map
 * filled at invoice creation and consumed by extractPaymentEvent().
 * Webhook signatures follow the Standard Webhooks spec (Svix): v1, HMAC-SHA256,
 * signed content `${svix-id}.${svix-timestamp}.${payload}`, 5-minute tolerance.
 */
export class BlinkAdapter implements PaymentsAdapter {
  private apiKey: string;
  private endpoint: string;
  private walletId: string | null = null;
  // paymentHash → invoice context awaiting webhook
  private pendingByHash = new Map<string, { metadata: any; amount: number; description: string; createdAt: number }>();
  private readonly PENDING_MAX_AGE = 24 * 3600 * 1000; // invoices live far less; safety cap
  private readonly PENDING_MAX_SIZE = 5000;

  constructor() {
    const apiKey = process.env.BLINK_API_KEY;
    if (!apiKey) {
      throw new Error('BLINK_API_KEY environment variable is required');
    }
    this.apiKey = apiKey;
    this.endpoint = process.env.BLINK_API_ENDPOINT || 'https://api.blink.sv/graphql';
    const timer = setInterval(() => this.purgePending(), 10 * 60000);
    timer.unref?.();
  }

  private purgePending() {
    const cutoff = Date.now() - this.PENDING_MAX_AGE;
    for (const [hash, entry] of this.pendingByHash) {
      if (entry.createdAt < cutoff) this.pendingByHash.delete(hash);
    }
    while (this.pendingByHash.size > this.PENDING_MAX_SIZE) {
      const first = this.pendingByHash.keys().next().value;
      if (first === undefined) break;
      this.pendingByHash.delete(first);
    }
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
      this.pendingByHash.set(inv.paymentHash, { metadata, amount, description, createdAt: Date.now() });
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
      console.error('BLINK_WEBHOOK_SECRET environment variable is required');
      return false;
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

  extractPaymentEvent(rawBody: string): NormalizedPaymentEvent | null {
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
    let entry = hash ? this.pendingByHash.get(hash) : undefined;

    // Intraledger (Blink-to-Blink) payments carry no payment hash: best-effort
    // unique match by memo + amount among pending invoices.
    if (!entry && p.eventType === 'receive.intraledger') {
      const matches = [...this.pendingByHash.entries()].filter(
        ([, e]) => e.description === (tx.memo || null) && e.amount === tx.settlementAmount
      );
      if (matches.length === 1) {
        entry = matches[0][1];
      } else {
        console.warn(`Blink intraledger webhook: ${matches.length} pending matches for memo="${tx.memo}", skipping`);
        return null;
      }
    }

    if (!entry) {
      console.warn(`Blink webhook: no pending invoice for hash=${hash?.slice(0, 16)}...`);
      return null;
    }
    if (hash) this.pendingByHash.delete(hash);

    return {
      event: 'payment.completed',
      payment_id: hash || tx.id,
      metadata: entry.metadata,
      amount: tx.settlementAmount
    };
  }
}

/** Provider-gated factory: PAYMENTS_PROVIDER override > BLINK_API_KEY > NAKAPAY_API_KEY > Mock */
export function createPaymentsAdapter(): PaymentsAdapter {
  const provider = (process.env.PAYMENTS_PROVIDER || '').toLowerCase();
  if (provider === 'blink' || (!provider && process.env.BLINK_API_KEY)) {
    return new BlinkAdapter();
  }
  if (provider === 'nakapay' || (!provider && process.env.NAKAPAY_API_KEY)) {
    return new NakaPayAdapter();
  }
  return new MockPaymentsAdapter();
}