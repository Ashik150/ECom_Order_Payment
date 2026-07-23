import { Prisma } from '@prisma/client'
import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../errors/app-error'
import { logger } from '../infrastructure/logger'

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, 'ROUTE_NOT_FOUND', `Route ${req.method} ${req.path} was not found`))
}

export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, _next) => {
  void _next
  let appError: AppError

  if (error instanceof AppError) {
    appError = error
  } else if (error instanceof ZodError) {
    appError = new AppError(
      422,
      'VALIDATION_ERROR',
      'Request validation failed',
      error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    )
  } else if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    appError = new AppError(409, 'RESOURCE_CONFLICT', 'A resource with this value already exists')
  } else {
    appError = new AppError(500, 'INTERNAL_ERROR', 'An unexpected error occurred')
  }

  const log = appError.statusCode >= 500 ? logger.error.bind(logger) : logger.warn.bind(logger)
  log({ error, requestId: req.requestId }, appError.message)

  res.status(appError.statusCode).json({
    success: false,
    message: appError.message,
    code: appError.code,
    details: appError.details,
    requestId: req.requestId,
    ...(process.env.NODE_ENV === 'development' && appError.statusCode >= 500
      ? { debug: error instanceof Error ? error.message : String(error) }
      : {}),
  })
}
