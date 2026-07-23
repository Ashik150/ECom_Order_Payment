import { ProductStatus } from '@prisma/client'
import { z } from 'zod'

export const productIdParamsSchema = z.object({ id: z.uuid() })

export const productInputSchema = z.object({
  name: z.string().trim().min(2).max(180),
  sku: z.string().trim().min(2).max(80).regex(/^[A-Za-z0-9_-]+$/),
  description: z.string().trim().min(10).max(5000),
  price: z.coerce.number().finite().min(0).max(9999999999.99),
  stock: z.coerce.number().int().min(0).max(2_147_483_647),
  status: z.enum(ProductStatus).default(ProductStatus.ACTIVE),
  categoryId: z.uuid(),
})

export const productUpdateSchema = productInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field is required',
)

export const productListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().max(180).optional(),
  categoryId: z.uuid().optional(),
  status: z.enum(ProductStatus).optional(),
})

export const recommendationQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(20).default(6),
})
