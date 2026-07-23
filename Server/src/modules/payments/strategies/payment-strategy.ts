import type { PaymentProvider, PaymentStatus } from '@prisma/client'

export interface InitiatePaymentInput {
  orderId: string
  amount: string
  currency: 'USD' | 'BDT'
}

export interface PaymentInitiationResult {
  transactionId: string
  status: PaymentStatus
  clientSecret?: string
  redirectUrl?: string
  rawResponse: Record<string, unknown>
}

export interface VerifyPaymentInput {
  transactionId: string
}

export interface PaymentVerificationResult {
  transactionId: string
  orderId?: string
  status: PaymentStatus
  rawResponse: Record<string, unknown>
}

export interface WebhookInput {
  rawBody: Buffer
  signature?: string
  parsedBody?: unknown
}

export interface PaymentStrategy {
  readonly provider: PaymentProvider
  initiatePayment(input: InitiatePaymentInput): Promise<PaymentInitiationResult>
  verifyPayment(input: VerifyPaymentInput): Promise<PaymentVerificationResult>
  handleWebhook(input: WebhookInput): Promise<PaymentVerificationResult | null>
  executePayment?(input: VerifyPaymentInput): Promise<PaymentVerificationResult>
}
