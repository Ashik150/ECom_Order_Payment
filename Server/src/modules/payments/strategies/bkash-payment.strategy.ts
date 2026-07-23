import { randomUUID } from 'node:crypto'
import { PaymentProvider, PaymentStatus } from '@prisma/client'
import axios, { type AxiosInstance } from 'axios'
import { AppError } from '../../../errors/app-error'
import type {
  InitiatePaymentInput,
  PaymentInitiationResult,
  PaymentStrategy,
  PaymentVerificationResult,
  VerifyPaymentInput,
  WebhookInput,
} from './payment-strategy'

export interface BkashStrategyConfig {
  baseUrl: string
  appKey: string
  appSecret: string
  username: string
  password: string
  callbackUrl: string
  mockMode: boolean
}

export class BkashPaymentStrategy implements PaymentStrategy {
  readonly provider = PaymentProvider.BKASH
  private token?: { value: string; expiresAt: number }

  constructor(
    private readonly config: BkashStrategyConfig,
    private readonly http: AxiosInstance = axios.create({
      baseURL: config.baseUrl,
      timeout: 15_000,
    }),
  ) {}

  async initiatePayment(input: InitiatePaymentInput): Promise<PaymentInitiationResult> {
    if (this.config.mockMode) {
      const transactionId = `mock_bkash_${randomUUID()}`
      return {
        transactionId,
        status: PaymentStatus.PENDING,
        redirectUrl: `${this.config.callbackUrl}?paymentID=${encodeURIComponent(transactionId)}`,
        rawResponse: { paymentID: transactionId, transactionStatus: 'Initiated', mock: true },
      }
    }

    const response = await this.http.post(
      '/tokenized/checkout/create',
      {
        mode: '0011',
        payerReference: input.orderId,
        callbackURL: this.config.callbackUrl,
        amount: input.amount,
        currency: input.currency,
        intent: 'sale',
        merchantInvoiceNumber: input.orderId,
      },
      { headers: await this.authorizedHeaders() },
    )
    const raw = asRecord(response.data)
    const transactionId = String(raw.paymentID ?? '')
    if (!transactionId) throw providerError('bKash did not return a payment ID', raw)
    return {
      transactionId,
      status: mapBkashStatus(raw.transactionStatus),
      ...(raw.bkashURL ? { redirectUrl: String(raw.bkashURL) } : {}),
      rawResponse: sanitizeBkash(raw),
    }
  }

  async executePayment(input: VerifyPaymentInput): Promise<PaymentVerificationResult> {
    if (this.config.mockMode && input.transactionId.startsWith('mock_bkash_')) {
      return this.mockSuccess(input.transactionId)
    }
    const response = await this.http.post(
      '/tokenized/checkout/execute',
      { paymentID: input.transactionId },
      { headers: await this.authorizedHeaders() },
    )
    return this.normalize(input.transactionId, asRecord(response.data))
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<PaymentVerificationResult> {
    if (this.config.mockMode && input.transactionId.startsWith('mock_bkash_')) {
      return this.mockSuccess(input.transactionId)
    }
    const response = await this.http.post(
      '/tokenized/checkout/payment/status',
      { paymentID: input.transactionId },
      { headers: await this.authorizedHeaders() },
    )
    return this.normalize(input.transactionId, asRecord(response.data))
  }

  async handleWebhook(input: WebhookInput): Promise<PaymentVerificationResult | null> {
    const body = asRecord(input.parsedBody)
    const transactionId = String(body.paymentID ?? body.paymentId ?? '')
    if (!transactionId) {
      throw new AppError(422, 'BKASH_PAYMENT_ID_MISSING', 'bKash callback requires a payment ID')
    }
    return this.verifyPayment({ transactionId })
  }

  private async authorizedHeaders(): Promise<Record<string, string>> {
    const token = await this.getToken()
    return { authorization: token, 'x-app-key': this.config.appKey }
  }

  private async getToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 30_000) return this.token.value
    const response = await this.http.post(
      '/tokenized/checkout/token/grant',
      { app_key: this.config.appKey, app_secret: this.config.appSecret },
      {
        headers: {
          username: this.config.username,
          password: this.config.password,
          'content-type': 'application/json',
        },
      },
    )
    const raw = asRecord(response.data)
    const value = String(raw.id_token ?? '')
    if (!value) throw providerError('bKash authentication failed', raw)
    const expiresIn = Number(raw.expires_in ?? 3600)
    this.token = { value, expiresAt: Date.now() + expiresIn * 1000 }
    return value
  }

  private normalize(transactionId: string, raw: Record<string, unknown>): PaymentVerificationResult {
    return {
      transactionId: String(raw.paymentID ?? transactionId),
      orderId: raw.merchantInvoiceNumber ? String(raw.merchantInvoiceNumber) : undefined,
      status: mapBkashStatus(raw.transactionStatus),
      rawResponse: sanitizeBkash(raw),
    }
  }

  private mockSuccess(transactionId: string): PaymentVerificationResult {
    return {
      transactionId,
      status: PaymentStatus.SUCCESS,
      rawResponse: { paymentID: transactionId, transactionStatus: 'Completed', mock: true },
    }
  }
}

function mapBkashStatus(status: unknown): PaymentStatus {
  const normalized = String(status ?? '').toLowerCase()
  if (normalized === 'completed' || normalized === 'success') return PaymentStatus.SUCCESS
  if (['failed', 'cancelled', 'canceled'].includes(normalized)) return PaymentStatus.FAILED
  return PaymentStatus.PENDING
}

function sanitizeBkash(raw: Record<string, unknown>): Record<string, unknown> {
  const { id_token: _token, refresh_token: _refresh, ...safe } = raw
  void _token
  void _refresh
  return safe
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function providerError(message: string, raw: Record<string, unknown>): AppError {
  return new AppError(502, 'BKASH_PROVIDER_ERROR', message, [
    {
      statusCode: raw.statusCode,
      statusMessage: raw.statusMessage,
      errorCode: raw.errorCode,
      errorMessage: raw.errorMessage,
    },
  ])
}
