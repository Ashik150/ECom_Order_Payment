import { randomUUID } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const incomingId = req.header('x-request-id')
  req.requestId = incomingId && incomingId.length <= 100 ? incomingId : randomUUID()
  res.setHeader('x-request-id', req.requestId)
  next()
}
