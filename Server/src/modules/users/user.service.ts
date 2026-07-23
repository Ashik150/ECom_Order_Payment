import type { PrismaClient, Role, User } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt, { type SignOptions } from 'jsonwebtoken'
import { getEnv } from '../../config/env'
import { AppError } from '../../errors/app-error'

export interface PublicUser {
  id: string
  name: string
  email: string
  role: Role
  createdAt: Date
  updatedAt: Date
}

export class UserService {
  constructor(private readonly database: PrismaClient) {}

  async register(input: { name: string; email: string; password: string }): Promise<PublicUser> {
    const email = input.email.trim().toLowerCase()
    const existing = await this.database.user.findUnique({ where: { email }, select: { id: true } })
    if (existing) throw new AppError(409, 'EMAIL_IN_USE', 'An account with this email already exists')

    const passwordHash = await bcrypt.hash(input.password, 12)
    const user = await this.database.user.create({
      data: { name: input.name.trim(), email, passwordHash },
    })
    return this.toPublicUser(user)
  }

  async login(input: { email: string; password: string }): Promise<{
    user: PublicUser
    accessToken: string
  }> {
    const user = await this.database.user.findUnique({
      where: { email: input.email.trim().toLowerCase() },
    })
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect')
    }

    const env = getEnv()
    const accessToken = jwt.sign(
      { role: user.role },
      env.JWT_SECRET,
      {
        subject: user.id,
        expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
      },
    )
    return { user: this.toPublicUser(user), accessToken }
  }

  async getProfile(userId: string): Promise<PublicUser> {
    const user = await this.database.user.findUnique({ where: { id: userId } })
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User was not found')
    return this.toPublicUser(user)
  }

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }
}
