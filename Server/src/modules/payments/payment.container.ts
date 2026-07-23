import { getEnv } from '../../config/env'
import { prisma } from '../../infrastructure/prisma'
import { PaymentFinalizer } from './payment-finalizer'
import { PaymentService } from './payment.service'
import { BkashPaymentStrategy } from './strategies/bkash-payment.strategy'
import { PaymentStrategyFactory } from './strategies/payment-strategy.factory'
import { StripePaymentStrategy } from './strategies/stripe-payment.strategy'

const env = getEnv()

export const paymentStrategies = new PaymentStrategyFactory([
  new StripePaymentStrategy({
    secretKey: env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    mockMode: env.PAYMENT_MOCK_MODE,
  }),
  new BkashPaymentStrategy({
    baseUrl: env.BKASH_BASE_URL,
    appKey: env.BKASH_APP_KEY,
    appSecret: env.BKASH_APP_SECRET,
    username: env.BKASH_USERNAME,
    password: env.BKASH_PASSWORD,
    callbackUrl: env.BKASH_CALLBACK_URL,
    mockMode: env.PAYMENT_MOCK_MODE,
  }),
])

export const paymentService = new PaymentService(
  prisma,
  paymentStrategies,
  new PaymentFinalizer(prisma),
)
