import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import pinoHttp from 'pino-http'
import swaggerUi from 'swagger-ui-express'
import { getEnv } from './config/env'
import { openApiDocument } from './docs/openapi'
import { errorHandler, notFoundHandler } from './middleware/error-handler'
import { requestContext } from './middleware/request-context'
import { logger } from './infrastructure/logger'
import { authRouter } from './modules/auth/auth.routes'
import { categoryRouter } from './modules/categories/category.routes'
import { orderRouter } from './modules/orders/order.routes'
import { paymentRouter } from './modules/payments/payment.routes'
import {
  bkashWebhookHandler,
  stripeWebhookHandler,
} from './modules/payments/webhook.handlers'
import { productRouter } from './modules/products/product.routes'
import { userRouter } from './modules/users/user.routes'
import { sendSuccess } from './utils/http'

export function createApp() {
  const env = getEnv()
  const app = express()

  app.disable('x-powered-by')
  app.use(requestContext)
  app.use(pinoHttp({ logger }))
  app.use(helmet())
  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }))
  app.post(
    '/api/webhooks/stripe',
    express.raw({ type: 'application/json', limit: '256kb' }),
    stripeWebhookHandler,
  )
  app.use(express.json({ limit: '256kb' }))
  app.use(express.urlencoded({ extended: false, limit: '64kb' }))

  app.get('/api/health', (_req, res) => {
    sendSuccess(res, { status: 'ok', timestamp: new Date().toISOString() })
  })
  app.get('/api/docs.json', (_req, res) => res.json(openApiDocument))
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument))
  app.use('/api/auth', authRouter)
  app.use('/api/categories', categoryRouter)
  app.use('/api/products', productRouter)
  app.use('/api/orders', orderRouter)
  app.use('/api/payments', paymentRouter)
  app.use('/api/users', userRouter)
  app.post('/api/webhooks/bkash', bkashWebhookHandler)

  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
