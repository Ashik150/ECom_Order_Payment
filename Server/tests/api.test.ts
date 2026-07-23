import { OrderStatus, PaymentStatus, ProductStatus, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import Stripe from 'stripe'
import request from 'supertest'

jest.mock('../src/infrastructure/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), create: jest.fn() },
    category: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    product: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
    },
    order: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    orderItem: { count: jest.fn() },
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
    $disconnect: jest.fn(),
  },
}))

import { createApp } from '../src/app'
import { prisma } from '../src/infrastructure/prisma'

type MockFunction = jest.Mock<Promise<unknown>, unknown[]>
type MockDatabase = {
  user: { findUnique: MockFunction; create: MockFunction }
  category: { findUnique: MockFunction }
  product: { findMany: MockFunction; create: MockFunction }
  order: { findFirst: MockFunction; findUnique: MockFunction }
  payment: { create: MockFunction; findUnique: MockFunction }
  $transaction: MockFunction
}

const database = prisma as unknown as MockDatabase
const app = createApp()
const userId = 'df96353e-95ba-45c3-a91c-1b35370e0876'
const categoryId = '8e7edc0c-a827-47cc-82aa-9cf97aa5ab81'
const productId = 'c4e6bc14-39b9-4f93-833f-7b953437ddc7'
const orderId = '53d513f6-ea69-42be-96b1-ed6776da42fa'

function token(role: Role): string {
  return jwt.sign({ role }, process.env.JWT_SECRET!, { subject: userId, expiresIn: '1h' })
}

describe('REST API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    database.$transaction.mockImplementation(async (input: unknown) => {
      if (Array.isArray(input)) return Promise.all(input)
      return (input as (transaction: typeof prisma) => Promise<unknown>)(prisma)
    })
  })

  it('serves health and OpenAPI documents with request IDs', async () => {
    const health = await request(app).get('/api/health').expect(200)
    expect(health.headers['x-request-id']).toBeTruthy()
    expect(health.body).toMatchObject({ success: true, data: { status: 'ok' } })
    const docs = await request(app).get('/api/docs.json').expect(200)
    expect(docs.body.paths['/api/orders/{orderId}/checkout']).toBeDefined()
  })

  it('returns consistent validation and not-found errors', async () => {
    const invalid = await request(app)
      .post('/api/auth/register')
      .send({ name: 'A', email: 'bad', password: 'weak' })
      .expect(422)
    expect(invalid.body).toMatchObject({ success: false, code: 'VALIDATION_ERROR' })
    await request(app).get('/api/missing').expect(404).expect(({ body }) => {
      expect(body.code).toBe('ROUTE_NOT_FOUND')
    })
  })

  it('registers a user without exposing the password hash', async () => {
    database.user.findUnique.mockResolvedValue(null)
    database.user.create.mockResolvedValue({
      id: userId,
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      passwordHash: 'hidden',
      role: Role.USER,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    })
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ada Lovelace', email: 'ada@example.com', password: 'StrongPass1!' })
      .expect(201)
    expect(response.body.data.passwordHash).toBeUndefined()
    expect(response.body.data.email).toBe('ada@example.com')
  })

  it('rejects duplicate email and invalid login credentials', async () => {
    database.user.findUnique
      .mockResolvedValueOnce({ id: userId })
      .mockResolvedValueOnce({
        id: userId,
        email: 'ada@example.com',
        passwordHash: bcrypt.hashSync('CorrectPass1!', 4),
        role: Role.USER,
      })
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ada Lovelace', email: 'ada@example.com', password: 'StrongPass1!' })
      .expect(409)
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'ada@example.com', password: 'WrongPass1!' })
      .expect(401)
  })

  it('enforces authentication and admin role for product creation', async () => {
    const body = {
      name: 'Product',
      sku: 'SKU-1',
      description: 'A sufficiently detailed product',
      price: 10,
      stock: 2,
      status: ProductStatus.ACTIVE,
      categoryId,
    }
    await request(app).post('/api/products').send(body).expect(401)
    await request(app)
      .post('/api/products')
      .set('authorization', `Bearer ${token(Role.USER)}`)
      .send(body)
      .expect(403)
  })

  it('creates a product for an administrator', async () => {
    database.category.findUnique.mockResolvedValue({ id: categoryId })
    database.product.create.mockResolvedValue({
      id: productId,
      name: 'Product',
      sku: 'SKU-1',
      description: 'A sufficiently detailed product',
      price: { toFixed: () => '10.00' },
      stock: 2,
      status: ProductStatus.ACTIVE,
      categoryId,
      category: { id: categoryId, name: 'Category' },
    })
    await request(app)
      .post('/api/products')
      .set('authorization', `Bearer ${token(Role.ADMIN)}`)
      .send({
        name: 'Product',
        sku: 'SKU-1',
        description: 'A sufficiently detailed product',
        price: 10,
        stock: 2,
        status: ProductStatus.ACTIVE,
        categoryId,
      })
      .expect(201)
  })

  it('rejects invalid quantities before order persistence', async () => {
    await request(app)
      .post('/api/orders')
      .set('authorization', `Bearer ${token(Role.USER)}`)
      .send({ items: [{ productId, quantity: 0 }] })
      .expect(422)
    expect(database.product.findMany).not.toHaveBeenCalled()
  })

  it('prevents access to another user order', async () => {
    database.order.findUnique.mockResolvedValue({
      id: orderId,
      userId: 'f52f8d38-36e9-4fd4-9834-26a2fdbdaae4',
      totalAmount: { toFixed: () => '10.00' },
      status: OrderStatus.PENDING,
      items: [],
      payments: [],
    })
    await request(app)
      .get(`/api/orders/${orderId}`)
      .set('authorization', `Bearer ${token(Role.USER)}`)
      .expect(403)
  })

  it('initiates provider-independent checkout in explicit mock mode', async () => {
    database.order.findFirst.mockResolvedValue({
      id: orderId,
      userId,
      totalAmount: { toFixed: () => '10.00' },
      status: OrderStatus.PENDING,
      payments: [],
    })
    database.payment.create.mockImplementation(async (input: unknown) => {
      const data = (input as { data: Record<string, unknown> }).data
      return {
        id: 'payment-1',
        ...data,
        status: PaymentStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    })
    const response = await request(app)
      .post(`/api/orders/${orderId}/checkout`)
      .set('authorization', `Bearer ${token(Role.USER)}`)
      .send({ provider: 'stripe' })
      .expect(201)
    expect(response.body.data.payment.transactionId).toMatch(/^mock_stripe_/)
  })

  it('rejects an invalid Stripe webhook signature', async () => {
    await request(app)
      .post('/api/webhooks/stripe')
      .set('stripe-signature', 'invalid')
      .set('content-type', 'application/json')
      .send(JSON.stringify({ type: 'payment_intent.succeeded' }))
      .expect(400)
  })

  it('accepts a valid Stripe signature and safely ignores an unknown payment', async () => {
    const payload = JSON.stringify({
      id: 'evt_test',
      object: 'event',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_unknown',
          object: 'payment_intent',
          amount: 1000,
          amount_received: 1000,
          currency: 'bdt',
          status: 'succeeded',
          metadata: { orderId },
          last_payment_error: null,
        },
      },
    })
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET!,
    })
    database.payment.findUnique.mockResolvedValue(null)
    const response = await request(app)
      .post('/api/webhooks/stripe')
      .set('stripe-signature', signature)
      .set('content-type', 'application/json')
      .send(payload)
      .expect(200)
    expect(response.body.data).toEqual({ ignored: true })
  })

  it('verifies bKash callbacks in mock mode before ignoring unknown payments', async () => {
    database.payment.findUnique.mockResolvedValue(null)
    const response = await request(app)
      .post('/api/webhooks/bkash')
      .send({ paymentID: 'mock_bkash_unknown' })
      .expect(200)
    expect(response.body.data).toEqual({ ignored: true })
  })
})
