import { PaymentStatus } from '@merchantiq/data-model';
import { RazorpayClient, RazorpayPayment } from './client';

export interface ReconciliationResult {
  paymentId: string;
  internalStatus: PaymentStatus;
  authoritativeStatus: PaymentStatus;
  isDiscrepancy: boolean;
  reconciledStatus: PaymentStatus;
  notes: string;
}

export class PaymentReconciler {
  private client: RazorpayClient;

  constructor(client: RazorpayClient) {
    this.client = client;
  }

  /**
   * Authoritatively reconciles a payment state against Razorpay API.
   * Golden Rule: LLM or client claims are ignored. Authoritative Razorpay API state always wins.
   * If the API is unreachable, marks state as UNKNOWN / RECONCILIATION REQUIRED.
   */
  public async reconcilePayment(
    paymentId: string,
    claimedStatus: PaymentStatus
  ): Promise<ReconciliationResult> {
    const authoritative = await this.client.getPayment(paymentId);

    if (!authoritative) {
      return {
        paymentId,
        internalStatus: claimedStatus,
        authoritativeStatus: PaymentStatus.UNKNOWN,
        isDiscrepancy: true,
        reconciledStatus: PaymentStatus.UNKNOWN,
        notes: 'Authoritative status could not be verified via Razorpay API. State marked UNKNOWN / RECONCILIATION REQUIRED.'
      };
    }

    const isDiscrepancy = authoritative.status !== claimedStatus;
    const reconciledStatus = authoritative.status;

    let notes = 'State matches authoritative Razorpay records.';
    if (isDiscrepancy) {
      notes = `Discrepancy detected! Claimed "${claimedStatus}" overwritten with authoritative Razorpay status "${authoritative.status}".`;
    }

    return {
      paymentId,
      internalStatus: claimedStatus,
      authoritativeStatus: authoritative.status,
      isDiscrepancy,
      reconciledStatus,
      notes
    };
  }
}
