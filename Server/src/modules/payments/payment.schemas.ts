import { z } from 'zod'

export const checkoutSchema = z.object({
  provider: z.enum(['stripe', 'bkash']),
})

export const orderCheckoutParamsSchema = z.object({ orderId: z.uuid() })

export const providerPaymentSchema = z.object({
  orderId: z.uuid(),
})

export const verifyPaymentSchema = z.object({
  transactionId: z.string().trim().min(1).max(255),
})

export const executeBkashSchema = z.object({
  paymentId: z.string().trim().min(1).max(255),
})

export const paymentIdParamsSchema = z.object({
  paymentId: z.string().trim().min(1).max(255),
})

export const paymentListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})
