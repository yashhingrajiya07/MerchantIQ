import test from 'node:test';
import assert from 'node:assert/strict';
import {
  verifyWebhookSignature,
  generateTestWebhookSignature,
  WebhookDeduplicator,
  RazorpayClient,
  PaymentReconciler
} from '../../packages/razorpay/src';
import { PaymentStatus } from '../../packages/data-model/src';

test('Razorpay signatures: validates authentic webhook signature and rejects forged payloads', () => {
  const secret = 'webhook_secret_key_merchantiq_2026';
  const payload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_test_12345',
          amount: 250000,
          status: 'captured'
        }
      }
    }
  });

  const validSignature = generateTestWebhookSignature(payload, secret);
  assert.equal(verifyWebhookSignature(payload, validSignature, secret), true);

  // Forged payload with altered amount
  const tamperedPayload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_test_12345',
          amount: 999999, // tampered!
          status: 'captured'
        }
      }
    }
  });
  assert.equal(verifyWebhookSignature(tamperedPayload, validSignature, secret), false);

  // Invalid secret
  assert.equal(verifyWebhookSignature(payload, validSignature, 'wrong_secret'), false);
});

test('Razorpay idempotency: deduplicates duplicate webhook events by x-razorpay-event-id', () => {
  const deduplicator = new WebhookDeduplicator();
  const eventId = 'evt_test_unique_998811';

  // First delivery
  const first = deduplicator.recordEvent(eventId, 'payment.captured', 'Payment of ₹2,500 captured');
  assert.equal(first.isDuplicate, false);
  assert.equal(first.record.status, 'RECEIVED');

  deduplicator.markProcessed(eventId);

  // Second delivery (duplicate retry from gateway)
  const second = deduplicator.recordEvent(eventId, 'payment.captured', 'Payment of ₹2,500 captured');
  assert.equal(second.isDuplicate, true);
  assert.equal(second.record.status, 'DUPLICATE');
});

test('Payment Reconciler: reconciles authoritative payment state from Razorpay API', async () => {
  const client = new RazorpayClient({
    keyId: 'rzp_test_sampleMerchantId99',
    keySecret: 'rzp_test_secretKeyForBuildathon99',
    webhookSecret: 'merchantiq_webhook_secret_key_demo_2026'
  });

  const reconciler = new PaymentReconciler(client);

  // Simulate payment capture in sandbox
  const mockPayment = client.simulateCapturePayment('order_999', 250000);

  // Verify authoritative reconciliation
  const result = await reconciler.reconcilePayment(mockPayment.id, PaymentStatus.CAPTURED);
  assert.equal(result.isDiscrepancy, false);
  assert.equal(result.reconciledStatus, PaymentStatus.CAPTURED);

  // If internal claimed state was 'failed' (discrepancy), authoritative state wins
  const discrepancyResult = await reconciler.reconcilePayment(mockPayment.id, PaymentStatus.FAILED);
  assert.equal(discrepancyResult.isDiscrepancy, true);
  assert.equal(discrepancyResult.reconciledStatus, PaymentStatus.CAPTURED);
});
