import { PaymentProvider } from '@prisma/client'
import { Router, type RequestHandler } from 'express'
import { authenticate } from '../../middleware/auth'
import { validate } from '../../middleware/validate'
import { sendSuccess } from '../../utils/http'
import {
  checkoutSchema,
  executeBkashSchema,
  orderCheckoutParamsSchema,
  paymentIdParamsSchema,
  paymentListQuerySchema,
  providerPaymentSchema,
  verifyPaymentSchema,
} from './payment.schemas'
import { paymentService } from './payment.container'

export const paymentRouter = Router()
paymentRouter.use(authenticate)

paymentRouter.get('/', validate({ query: paymentListQuerySchema }), async (req, res) => {
  const result = await paymentService.listForUser(
    req.auth!.userId,
    req.query as unknown as { page: number; limit: number },
  )
  sendSuccess(res, result.items, 200, result.pagination)
})
paymentRouter.post(
  '/stripe/create-intent',
  validate({ body: providerPaymentSchema }),
  async (req, res) => {
    sendSuccess(
      res,
      await paymentService.checkout(req.auth!.userId, req.body.orderId, PaymentProvider.STRIPE),
      201,
    )
  },
)
paymentRouter.post('/stripe/verify', validate({ body: verifyPaymentSchema }), async (req, res) => {
  sendSuccess(
    res,
    await paymentService.verify(
      req.auth!.userId,
      PaymentProvider.STRIPE,
      req.body.transactionId,
    ),
  )
})
paymentRouter.post(
  '/bkash/create',
  validate({ body: providerPaymentSchema }),
  async (req, res) => {
    sendSuccess(
      res,
      await paymentService.checkout(req.auth!.userId, req.body.orderId, PaymentProvider.BKASH),
      201,
    )
  },
)
paymentRouter.post('/bkash/execute', validate({ body: executeBkashSchema }), async (req, res) => {
  sendSuccess(res, await paymentService.executeBkash(req.auth!.userId, req.body.paymentId))
})
paymentRouter.get(
  '/bkash/query/:paymentId',
  validate({ params: paymentIdParamsSchema }),
  async (req, res) => {
    sendSuccess(
      res,
      await paymentService.verify(
        req.auth!.userId,
        PaymentProvider.BKASH,
        req.params.paymentId as string,
      ),
    )
  },
)

export const checkoutHandler: RequestHandler[] = [
  authenticate,
  validate({ params: orderCheckoutParamsSchema, body: checkoutSchema }),
  async (req, res) => {
    const provider =
      req.body.provider === 'stripe' ? PaymentProvider.STRIPE : PaymentProvider.BKASH
    sendSuccess(
      res,
      await paymentService.checkout(req.auth!.userId, req.params.orderId as string, provider),
      201,
    )
  },
]
