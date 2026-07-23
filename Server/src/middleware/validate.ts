import type { RequestHandler } from 'express'
import type { ZodType } from 'zod'

export function validate(
  schemas: Partial<Record<'body' | 'params' | 'query', ZodType>>,
): RequestHandler {
  return (req, _res, next) => {
    if (schemas.body) req.body = schemas.body.parse(req.body)
    if (schemas.params) Object.assign(req.params, schemas.params.parse(req.params))
    if (schemas.query) Object.assign(req.query, schemas.query.parse(req.query))
    next()
  }
}
