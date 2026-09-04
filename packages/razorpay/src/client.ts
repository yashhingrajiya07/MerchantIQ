import { PaymentStatus } from '@merchantiq/data-model';

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  isTestMode?: boolean;
}

export interface RazorpayOrder {
  id: string;
  amount: number; // in paise
  currency: string;
  status: 'created' | 'attempted' | 'paid';
  receipt?: string;
  created_at: number;
}

export interface RazorpayPayment {
  id: string;
  order_id: string;
  amount: number; // in paise
  currency: string;
  status: PaymentStatus;
  method: string;
  fee?: number;
  tax?: number;
  created_at: number;
}

export interface RazorpayRefund {
  id: string;
  payment_id: string;
  amount: number;
  status: 'processed' | 'pending' | 'failed';
  created_at: number;
}

export class RazorpayClient {
  private config: RazorpayConfig;
  private isMockMode: boolean;

  // In-memory mock storage for sandbox testing when external API is unreachable or test keys are placeholder
  private mockOrders = new Map<string, RazorpayOrder>();
  private mockPayments = new Map<string, RazorpayPayment>();
  private mockRefunds = new Map<string, RazorpayRefund>();

  constructor(config: RazorpayConfig) {
    this.config = config;
    this.isMockMode = !config.keyId || config.keyId.includes('placeholder') || config.keyId.includes('sample');
  }

  private getAuthHeader(): string {
    const auth = Buffer.from(`${this.config.keyId}:${this.config.keySecret}`).toString('base64');
    return `Basic ${auth}`;
  }

  /**
   * Fetches an authoritative order from Razorpay Test Mode or Sandbox.
   */
  public async getOrder(orderId: string): Promise<RazorpayOrder | null> {
    if (this.isMockMode) {
      return this.mockOrders.get(orderId) || {
        id: orderId,
        amount: 250000,
        currency: 'INR',
        status: 'paid',
        receipt: 'rec_1001',
        created_at: Math.floor(Date.now() / 1000)
      };
    }

    try {
      const res = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
        headers: { Authorization: this.getAuthHeader() }
      });
      if (!res.ok) return null;
      return (await res.json()) as RazorpayOrder;
    } catch (err) {
      console.warn(`Razorpay API getOrder network failure:`, err);
      return null;
    }
  }

  /**
   * Fetches authoritative payment details and status.
   */
  public async getPayment(paymentId: string): Promise<RazorpayPayment | null> {
    if (this.isMockMode) {
      return this.mockPayments.get(paymentId) || {
        id: paymentId,
        order_id: 'order_test_999',
        amount: 250000,
        currency: 'INR',
        status: PaymentStatus.CAPTURED,
        method: 'upi',
        fee: 590, // ₹5.90 (2% + 18% GST)
        tax: 90,
        created_at: Math.floor(Date.now() / 1000)
      };
    }

    try {
      const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
        headers: { Authorization: this.getAuthHeader() }
      });
      if (!res.ok) return null;
      const data: any = await res.json();
      return {
        id: data.id,
        order_id: data.order_id,
        amount: data.amount,
        currency: data.currency,
        status: data.status as PaymentStatus,
        method: data.method,
        fee: data.fee,
        tax: data.tax,
        created_at: data.created_at
      };
    } catch (err) {
      console.warn(`Razorpay API getPayment network failure:`, err);
      return null;
    }
  }

  /**
   * Creates a test order in Razorpay sandbox.
   */
  public async createTestOrder(amountPaise: number, receipt = `rec_${Date.now()}`): Promise<RazorpayOrder> {
    if (this.isMockMode) {
      const order: RazorpayOrder = {
        id: `order_test_${Date.now().toString(36)}`,
        amount: amountPaise,
        currency: 'INR',
        status: 'created',
        receipt,
        created_at: Math.floor(Date.now() / 1000)
      };
      this.mockOrders.set(order.id, order);
      return order;
    }

    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: this.getAuthHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt
      })
    });

    if (!res.ok) {
      throw new Error(`Razorpay API order creation failed: ${res.statusText}`);
    }

    return (await res.json()) as RazorpayOrder;
  }

  /**
   * Simulates a payment capture in test mode.
   */
  public simulateCapturePayment(orderId: string, amountPaise: number): RazorpayPayment {
    const payment: RazorpayPayment = {
      id: `pay_test_${Date.now().toString(36)}`,
      order_id: orderId,
      amount: amountPaise,
      currency: 'INR',
      status: PaymentStatus.CAPTURED,
      method: 'upi',
      fee: Math.round((amountPaise * 236) / 10000),
      tax: Math.round((amountPaise * 36) / 10000),
      created_at: Math.floor(Date.now() / 1000)
    };
    this.mockPayments.set(payment.id, payment);
    return payment;
  }

  public getMockStatus(): boolean {
    return this.isMockMode;
  }
}
