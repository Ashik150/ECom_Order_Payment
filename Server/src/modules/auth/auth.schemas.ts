import { z } from 'zod'

const strongPassword = z
  .string()
  .min(10)
  .max(128)
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[0-9]/, 'Password must include a number')
  .regex(/[^A-Za-z0-9]/, 'Password must include a symbol')

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().max(320),
  password: strongPassword,
})

export const loginSchema = z.object({
  email: z.email().max(320),
  password: z.string().min(1).max(128),
})
