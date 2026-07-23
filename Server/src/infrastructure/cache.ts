import { createClient, type RedisClientType } from 'redis'
import { logger } from './logger'

export interface CacheStore {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlSeconds: number): Promise<void>
  delete(key: string): Promise<void>
  disconnect(): Promise<void>
}

export class RedisCacheStore implements CacheStore {
  private client: RedisClientType
  private connecting?: Promise<unknown>

  constructor(url: string) {
    this.client = createClient({
      url,
      socket: { connectTimeout: 1000, reconnectStrategy: false },
    })
    this.client.on('error', (error) => logger.warn({ error }, 'Redis connection error'))
  }

  private async ensureConnected(): Promise<void> {
    if (this.client.isReady) return
    this.connecting ??= this.client.connect().finally(() => {
      this.connecting = undefined
    })
    await this.connecting
  }

  async get(key: string): Promise<string | null> {
    await this.ensureConnected()
    return this.client.get(key)
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.ensureConnected()
    await this.client.set(key, value, { EX: ttlSeconds })
  }

  async delete(key: string): Promise<void> {
    await this.ensureConnected()
    await this.client.del(key)
  }

  async disconnect(): Promise<void> {
    if (this.client.isOpen) await this.client.quit()
  }
}

export class MemoryCacheStore implements CacheStore {
  private readonly entries = new Map<string, { value: string; expiresAt: number }>()

  async get(key: string): Promise<string | null> {
    const entry = this.entries.get(key)
    if (!entry) return null
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key)
      return null
    }
    return entry.value
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.entries.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 })
  }

  async delete(key: string): Promise<void> {
    this.entries.delete(key)
  }

  async disconnect(): Promise<void> {
    this.entries.clear()
  }
}
