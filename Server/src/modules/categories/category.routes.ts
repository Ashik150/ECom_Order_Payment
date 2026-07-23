import { Role } from '@prisma/client'
import { Router } from 'express'
import { getEnv } from '../../config/env'
import { RedisCacheStore } from '../../infrastructure/cache'
import { prisma } from '../../infrastructure/prisma'
import { authenticate, requireRole } from '../../middleware/auth'
import { validate } from '../../middleware/validate'
import { sendSuccess } from '../../utils/http'
import { categoryInputSchema, categoryUpdateSchema, idParamsSchema } from './category.schemas'
import { CategoryService } from './category.service'

const env = getEnv()
const service = new CategoryService(
  prisma,
  new RedisCacheStore(env.REDIS_URL),
  env.CATEGORY_CACHE_TTL_SECONDS,
)
export const categoryRouter = Router()

categoryRouter.get('/', async (_req, res) => sendSuccess(res, await service.list()))
categoryRouter.get('/tree', async (_req, res) => sendSuccess(res, await service.getTree()))
categoryRouter.get('/:id', validate({ params: idParamsSchema }), async (req, res) => {
  sendSuccess(res, await service.getById(req.params.id as string))
})
categoryRouter.post(
  '/',
  authenticate,
  requireRole(Role.ADMIN),
  validate({ body: categoryInputSchema }),
  async (req, res) => sendSuccess(res, await service.create(req.body), 201),
)
categoryRouter.patch(
  '/:id',
  authenticate,
  requireRole(Role.ADMIN),
  validate({ params: idParamsSchema, body: categoryUpdateSchema }),
  async (req, res) => sendSuccess(res, await service.update(req.params.id as string, req.body)),
)
categoryRouter.delete(
  '/:id',
  authenticate,
  requireRole(Role.ADMIN),
  validate({ params: idParamsSchema }),
  async (req, res) => {
    await service.delete(req.params.id as string)
    res.status(204).send()
  },
)
