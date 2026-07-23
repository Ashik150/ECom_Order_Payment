import { createApp } from './app'
import { getEnv } from './config/env'
import { logger } from './infrastructure/logger'
import { prisma } from './infrastructure/prisma'

const env = getEnv()
const server = createApp().listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'API server listening')
})

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutting down API server')
  server.close(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))
