import { Router } from 'express'
import { prisma } from '../../infrastructure/prisma'
import { authenticate } from '../../middleware/auth'
import { validate } from '../../middleware/validate'
import { sendSuccess } from '../../utils/http'
import { orderListQuerySchema } from '../orders/order.schemas'
import { OrderService } from '../orders/order.service'
import { paymentService } from '../payments/payment.container'
import { paymentListQuerySchema } from '../payments/payment.schemas'

const orders = new OrderService(prisma)
export const userRouter = Router()
userRouter.use(authenticate)

userRouter.get('/me/orders', validate({ query: orderListQuerySchema }), async (req, res) => {
  const result = await orders.listForUser(
    req.auth!.userId,
    req.query as unknown as { page: number; limit: number },
  )
  sendSuccess(res, result.items, 200, result.pagination)
})

userRouter.get('/me/payments', validate({ query: paymentListQuerySchema }), async (req, res) => {
  const result = await paymentService.listForUser(
    req.auth!.userId,
    req.query as unknown as { page: number; limit: number },
  )
  sendSuccess(res, result.items, 200, result.pagination)
})
