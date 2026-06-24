import Stripe from 'stripe';
import { db } from './db';
import { invoices } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export class PaymentHandler {
  /**
   * Create a payment intent for an invoice
   */
  static async createPaymentIntent(invoiceId: string, amount: number, currency: string = 'usd') {
    try {
      // Get invoice details
      const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
      
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Create payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata: {
          invoiceId,
          invoiceNumber: invoice.invoiceNumber,
        },
        description: `Payment for invoice ${invoice.invoiceNumber}`,
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw new Error('Failed to create payment intent');
    }
  }

  /**
   * Confirm a payment and update invoice status
   */
  static async confirmPayment(paymentIntentId: string) {
    try {
      // Retrieve the payment intent
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        // Update invoice status to paid
        await db
          .update(invoices)
          .set({
            status: 'paid',
            paidAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(invoices.id, paymentIntent.metadata.invoiceId));

        return {
          success: true,
          amount: paymentIntent.amount / 100, // Convert from cents
          currency: paymentIntent.currency,
          paymentMethod: paymentIntent.payment_method_types[0],
        };
      } else {
        throw new Error(`Payment failed: ${paymentIntent.status}`);
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw new Error('Failed to confirm payment');
    }
  }

  /**
   * Process a refund
   */
  static async processRefund(paymentIntentId: string, amount?: number) {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        ...(amount && { amount: Math.round(amount * 100) }), // Convert to cents
      });

      return {
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
      };
    } catch (error) {
      console.error('Error processing refund:', error);
      throw new Error('Failed to process refund');
    }
  }

  /**
   * Get payment history for an invoice
   */
  static async getPaymentHistory(invoiceId: string) {
    try {
      const paymentIntents = await stripe.paymentIntents.list({
        limit: 100,
      });

      const invoicePayments = paymentIntents.data.filter(
        (pi) => pi.metadata.invoiceId === invoiceId
      );

      return invoicePayments.map((payment) => ({
        id: payment.id,
        amount: payment.amount / 100,
        currency: payment.currency,
        status: payment.status,
        created: new Date(payment.created * 1000),
        paymentMethod: payment.payment_method_types[0],
      }));
    } catch (error) {
      console.error('Error getting payment history:', error);
      throw new Error('Failed to get payment history');
    }
  }
}

// Webhook handler for Stripe events
export async function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await PaymentHandler.confirmPayment(paymentIntent.id);
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object as Stripe.PaymentIntent;
      console.log('Payment failed:', failedPayment.id);
      // Handle failed payment (send notification, update status, etc.)
      break;

    case 'charge.refunded':
      const refund = event.data.object as Stripe.Charge;
      console.log('Refund processed:', refund.id);
      // Handle refund (update invoice status, send notification, etc.)
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}
