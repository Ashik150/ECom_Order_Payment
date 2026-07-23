import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { prisma } from '../../infrastructure/prisma'
import { authenticate } from '../../middleware/auth'
import { validate } from '../../middleware/validate'
import { sendSuccess } from '../../utils/http'
import { UserService } from '../users/user.service'
import { loginSchema, registerSchema } from './auth.schemas'

const service = new UserService(prisma)
export const authRouter = Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMITED',
    message: 'Too many authentication attempts; please try again later',
    details: [],
  },
})

authRouter.post('/register', authLimiter, validate({ body: registerSchema }), async (req, res) => {
  sendSuccess(res, await service.register(req.body), 201)
})

authRouter.post('/login', authLimiter, validate({ body: loginSchema }), async (req, res) => {
  sendSuccess(res, await service.login(req.body))
})

authRouter.get('/me', authenticate, async (req, res) => {
  sendSuccess(res, await service.getProfile(req.auth!.userId))
})
