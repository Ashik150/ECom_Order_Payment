import { Router } from 'express'
import { prisma } from '../../infrastructure/prisma'
import { authenticate } from '../../middleware/auth'
import { validate } from '../../middleware/validate'
import { sendSuccess } from '../../utils/http'
import { createOrderSchema, orderIdParamsSchema, orderListQuerySchema } from './order.schemas'
import { OrderService } from './order.service'

const service = new OrderService(prisma)
export const orderRouter = Router()

orderRouter.use(authenticate)
orderRouter.post('/', validate({ body: createOrderSchema }), async (req, res) => {
  sendSuccess(res, await service.create(req.auth!.userId, req.body), 201)
})
orderRouter.get('/', validate({ query: orderListQuerySchema }), async (req, res) => {
  const result = await service.listForUser(
    req.auth!.userId,
    req.query as unknown as { page: number; limit: number },
  )
  sendSuccess(res, result.items, 200, result.pagination)
})
orderRouter.get('/:id', validate({ params: orderIdParamsSchema }), async (req, res) => {
  sendSuccess(res, await service.getById(req.params.id as string, req.auth!))
})
orderRouter.patch(
  '/:id/cancel',
  validate({ params: orderIdParamsSchema }),
  async (req, res) => {
    sendSuccess(res, await service.cancel(req.params.id as string, req.auth!.userId))
  },
)
