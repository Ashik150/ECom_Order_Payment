import { z } from 'zod'

export const orderIdParamsSchema = z.object({ id: z.uuid() })

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.uuid(),
        quantity: z.coerce.number().int().positive().max(10_000),
      }),
    )
    .min(1)
    .max(100)
    .superRefine((items, context) => {
      const seen = new Set<string>()
      items.forEach((item, index) => {
        if (seen.has(item.productId)) {
          context.addIssue({
            code: 'custom',
            path: [index, 'productId'],
            message: 'Each product can appear only once',
          })
        }
        seen.add(item.productId)
      })
    }),
})

export const orderListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})
