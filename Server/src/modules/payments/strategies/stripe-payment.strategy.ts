import { randomUUID } from 'node:crypto'
import { PaymentProvider, PaymentStatus } from '@prisma/client'
import Stripe from 'stripe'
import { AppError } from '../../../errors/app-error'
import type {
  InitiatePaymentInput,
  PaymentInitiationResult,
  PaymentStrategy,
  PaymentVerificationResult,
  VerifyPaymentInput,
  WebhookInput,
} from './payment-strategy'

export interface StripeStrategyConfig {
  secretKey: string
  webhookSecret: string
  mockMode: boolean
}

export class StripePaymentStrategy implements PaymentStrategy {
  readonly provider = PaymentProvider.STRIPE
  private readonly stripe: Stripe

  constructor(
    private readonly config: StripeStrategyConfig,
    stripe?: Stripe,
  ) {
    this.stripe = stripe ?? new Stripe(config.secretKey)
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<PaymentInitiationResult> {
    if (this.config.mockMode) {
      const transactionId = `mock_stripe_${randomUUID()}`
      return {
        transactionId,
        status: PaymentStatus.PENDING,
        clientSecret: `${transactionId}_secret_mock`,
        rawResponse: { id: transactionId, status: 'requires_payment_method', mock: true },
      }
    }

    const amount = Math.round(Number(input.amount) * 100)
    const intent = await this.stripe.paymentIntents.create({
      amount,
      currency: input.currency.toLowerCase(),
      metadata: { orderId: input.orderId },
      automatic_payment_methods: { enabled: true },
    })
    return {
      transactionId: intent.id,
      status: mapStripeStatus(intent.status),
      ...(intent.client_secret ? { clientSecret: intent.client_secret } : {}),
      rawResponse: sanitizeStripeObject(intent),
    }
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<PaymentVerificationResult> {
    if (this.config.mockMode && input.transactionId.startsWith('mock_stripe_')) {
      return {
        transactionId: input.transactionId,
        status: PaymentStatus.SUCCESS,
        rawResponse: { id: input.transactionId, status: 'succeeded', mock: true },
      }
    }
    const intent = await this.stripe.paymentIntents.retrieve(input.transactionId)
    return {
      transactionId: intent.id,
      orderId: intent.metadata.orderId,
      status: mapStripeStatus(intent.status),
      rawResponse: sanitizeStripeObject(intent),
    }
  }

  async handleWebhook(input: WebhookInput): Promise<PaymentVerificationResult | null> {
    if (!input.signature) {
      throw new AppError(400, 'STRIPE_SIGNATURE_MISSING', 'Stripe signature is required')
    }

    let event: Stripe.Event
    try {
      event = this.stripe.webhooks.constructEvent(
        input.rawBody,
        input.signature,
        this.config.webhookSecret,
      )
    } catch {
      throw new AppError(400, 'STRIPE_SIGNATURE_INVALID', 'Stripe webhook signature is invalid')
    }

    if (
      event.type !== 'payment_intent.succeeded' &&
      event.type !== 'payment_intent.payment_failed' &&
      event.type !== 'payment_intent.canceled'
    ) {
      return null
    }
    const intent = event.data.object
    return {
      transactionId: intent.id,
      orderId: intent.metadata.orderId,
      status:
        event.type === 'payment_intent.succeeded'
          ? PaymentStatus.SUCCESS
          : PaymentStatus.FAILED,
      rawResponse: { eventId: event.id, eventType: event.type, ...sanitizeStripeObject(intent) },
    }
  }
}

function mapStripeStatus(status: Stripe.PaymentIntent.Status): PaymentStatus {
  if (status === 'succeeded') return PaymentStatus.SUCCESS
  if (status === 'canceled') return PaymentStatus.FAILED
  return PaymentStatus.PENDING
}

function sanitizeStripeObject(intent: Stripe.PaymentIntent): Record<string, unknown> {
  return {
    id: intent.id,
    amount: intent.amount,
    amountReceived: intent.amount_received,
    currency: intent.currency,
    status: intent.status,
    metadata: intent.metadata,
    lastPaymentError: intent.last_payment_error
      ? {
          code: intent.last_payment_error.code,
          declineCode: intent.last_payment_error.decline_code,
          message: intent.last_payment_error.message,
          type: intent.last_payment_error.type,
        }
      : null,
  }
}
