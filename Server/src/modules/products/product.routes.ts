import { Role } from '@prisma/client'
import { Router } from 'express'
import { getEnv } from '../../config/env'
import { RedisCacheStore } from '../../infrastructure/cache'
import { prisma } from '../../infrastructure/prisma'
import { authenticate, requireRole } from '../../middleware/auth'
import { validate } from '../../middleware/validate'
import { sendSuccess } from '../../utils/http'
import { CategoryService } from '../categories/category.service'
import { RecommendationService } from '../recommendations/recommendation.service'
import {
  productIdParamsSchema,
  productInputSchema,
  productListQuerySchema,
  productUpdateSchema,
  recommendationQuerySchema,
} from './product.schemas'
import { ProductService } from './product.service'

const env = getEnv()
const categoryService = new CategoryService(
  prisma,
  new RedisCacheStore(env.REDIS_URL),
  env.CATEGORY_CACHE_TTL_SECONDS,
)
const service = new ProductService(prisma)
const recommendations = new RecommendationService(prisma, categoryService)
export const productRouter = Router()

productRouter.get(
  '/admin/list',
  authenticate,
  requireRole(Role.ADMIN),
  validate({ query: productListQuerySchema }),
  async (req, res) => {
    const result = await service.list({
      ...(req.query as unknown as Parameters<ProductService['list']>[0]),
      isAdmin: true,
    })
    sendSuccess(res, result.items, 200, result.pagination)
  },
)
productRouter.get(
  '/admin/:id',
  authenticate,
  requireRole(Role.ADMIN),
  validate({ params: productIdParamsSchema }),
  async (req, res) => sendSuccess(res, await service.getById(req.params.id as string, true)),
)
productRouter.get('/', validate({ query: productListQuerySchema }), async (req, res) => {
  const result = await service.list(
    req.query as unknown as Parameters<ProductService['list']>[0],
  )
  sendSuccess(res, result.items, 200, result.pagination)
})
productRouter.get(
  '/:id/recommendations',
  validate({ params: productIdParamsSchema, query: recommendationQuerySchema }),
  async (req, res) =>
    sendSuccess(
      res,
      await recommendations.recommend(
        req.params.id as string,
        (req.query as unknown as { limit: number }).limit,
      ),
    ),
)
productRouter.get('/:id', validate({ params: productIdParamsSchema }), async (req, res) => {
  sendSuccess(res, await service.getById(req.params.id as string))
})
productRouter.post(
  '/',
  authenticate,
  requireRole(Role.ADMIN),
  validate({ body: productInputSchema }),
  async (req, res) => sendSuccess(res, await service.create(req.body), 201),
)
productRouter.patch(
  '/:id',
  authenticate,
  requireRole(Role.ADMIN),
  validate({ params: productIdParamsSchema, body: productUpdateSchema }),
  async (req, res) => sendSuccess(res, await service.update(req.params.id as string, req.body)),
)
productRouter.delete(
  '/:id',
  authenticate,
  requireRole(Role.ADMIN),
  validate({ params: productIdParamsSchema }),
  async (req, res) => {
    await service.delete(req.params.id as string)
    res.status(204).send()
  },
)
