import { Role } from '@prisma/client'
import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { getEnv } from '../config/env'
import { AppError } from '../errors/app-error'

interface TokenPayload {
  sub: string
  role: Role
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authorization = req.header('authorization')
  if (!authorization?.startsWith('Bearer ')) {
    throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required')
  }

  try {
    const payload = jwt.verify(authorization.slice(7), getEnv().JWT_SECRET) as TokenPayload
    if (!payload.sub || !Object.values(Role).includes(payload.role)) throw new Error('Invalid claims')
    req.auth = { userId: payload.sub, role: payload.role }
    next()
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', 'The access token is invalid or expired')
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required')
    if (!roles.includes(req.auth.role)) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action')
    }
    next()
  }
}
