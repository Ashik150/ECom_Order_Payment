import { z } from 'zod'

export const idParamsSchema = z.object({ id: z.uuid() })

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case'),
  parentId: z.uuid().nullable().optional(),
})

export const categoryUpdateSchema = categoryInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field is required',
)
