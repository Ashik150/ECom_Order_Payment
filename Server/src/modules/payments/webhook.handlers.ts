import { PaymentProvider } from '@prisma/client'
import type { RequestHandler } from 'express'
import { sendSuccess } from '../../utils/http'
import { paymentService } from './payment.container'

export const stripeWebhookHandler: RequestHandler = async (req, res) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body))
  const result = await paymentService.processWebhook(PaymentProvider.STRIPE, {
    rawBody,
    signature: req.header('stripe-signature') ?? undefined,
  })
  sendSuccess(res, result)
}

export const bkashWebhookHandler: RequestHandler = async (req, res) => {
  const result = await paymentService.processWebhook(PaymentProvider.BKASH, {
    rawBody: Buffer.from(JSON.stringify(req.body)),
    parsedBody: req.body,
  })
  sendSuccess(res, result)
}
