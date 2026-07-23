import type { Response } from 'express'

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: Record<string, unknown>,
): void {
  res.status(statusCode).json({ success: true, data, ...(meta ? { meta } : {}) })
}

export function serializeDecimal<T extends { toString(): string }>(value: T): string {
  return value.toString()
}
