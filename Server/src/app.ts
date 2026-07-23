import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import pinoHttp from 'pino-http'
import { getEnv } from './config/env'
import { errorHandler, notFoundHandler } from './middleware/error-handler'
import { requestContext } from './middleware/request-context'
import { logger } from './infrastructure/logger'
import { authRouter } from './modules/auth/auth.routes'
import { categoryRouter } from './modules/categories/category.routes'
import { orderRouter } from './modules/orders/order.routes'
import { productRouter } from './modules/products/product.routes'
import { sendSuccess } from './utils/http'

export function createApp() {
  const env = getEnv()
  const app = express()

  app.disable('x-powered-by')
  app.use(requestContext)
  app.use(pinoHttp({ logger }))
  app.use(helmet())
  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }))
  app.use(express.json({ limit: '256kb' }))
  app.use(express.urlencoded({ extended: false, limit: '64kb' }))

  app.get('/api/health', (_req, res) => {
    sendSuccess(res, { status: 'ok', timestamp: new Date().toISOString() })
  })
  app.use('/api/auth', authRouter)
  app.use('/api/categories', categoryRouter)
  app.use('/api/products', productRouter)
  app.use('/api/orders', orderRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
