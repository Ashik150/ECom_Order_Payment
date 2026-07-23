import dotenv from 'dotenv'
import { resolve } from 'node:path'
import { defineConfig } from 'prisma/config'

dotenv.config({ path: resolve(__dirname, '../.env'), quiet: true })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL is missing from the repository root .env file')
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  engine: 'classic',
  datasource: {
    url: databaseUrl,
  },
})
