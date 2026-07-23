import dotenv from 'dotenv'
import { resolve } from 'node:path'
import { z } from 'zod'

dotenv.config({ path: resolve(process.cwd(), '../.env') })
dotenv.config()

const booleanString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true')

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    FRONTEND_URL: z.string().url().default('http://localhost:5173'),
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
    CATEGORY_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
    JWT_SECRET: z.string().min(32),
    JWT_EXPIRES_IN: z.string().default('1h'),
    LOG_LEVEL: z.string().default('info'),
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_PUBLISHABLE_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),
    BKASH_BASE_URL: z.string().url(),
    BKASH_APP_KEY: z.string().min(1),
    BKASH_APP_SECRET: z.string().min(1),
    BKASH_USERNAME: z.string().min(1),
    BKASH_PASSWORD: z.string().min(1),
    BKASH_CALLBACK_URL: z.string().url(),
    PAYMENT_MOCK_MODE: booleanString,
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV === 'production' && value.PAYMENT_MOCK_MODE) {
      context.addIssue({
        code: 'custom',
        path: ['PAYMENT_MOCK_MODE'],
        message: 'Payment mock mode cannot be enabled in production',
      })
    }
  })

export type AppEnv = z.infer<typeof envSchema>

let parsedEnv: AppEnv | undefined

export function getEnv(): AppEnv {
  if (!parsedEnv) {
    const result = envSchema.safeParse(process.env)
    if (!result.success) {
      const fields = result.error.issues.map((issue) => issue.path.join('.')).join(', ')
      throw new Error(`Invalid environment configuration: ${fields}`)
    }
    parsedEnv = result.data
  }
  return parsedEnv
}

export function resetEnvForTests(): void {
  parsedEnv = undefined
}
