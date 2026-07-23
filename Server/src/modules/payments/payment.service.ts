import {
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
} from '@prisma/client'
import type { Prisma, PrismaClient } from '@prisma/client'
import { AppError } from '../../errors/app-error'
import { logger } from '../../infrastructure/logger'
import type { PaymentFinalizer } from './payment-finalizer'
import type { PaymentStrategyFactory } from './strategies/payment-strategy.factory'

export class PaymentService {
  constructor(
    private readonly database: PrismaClient,
    private readonly strategies: PaymentStrategyFactory,
    private readonly finalizer: PaymentFinalizer,
  ) {}

  async checkout(userId: string, orderId: string, provider: PaymentProvider) {
    const order = await this.database.order.findFirst({
      where: { id: orderId, userId },
      include: { payments: { where: { status: PaymentStatus.SUCCESS }, take: 1 } },
    })
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order was not found')
    if (order.status !== OrderStatus.PENDING || order.payments.length) {
      throw new AppError(409, 'ORDER_NOT_PAYABLE', 'Only unpaid pending orders can be checked out')
    }

    const strategy = this.strategies.resolve(provider)
    const initiated = await strategy.initiatePayment({
      orderId: order.id,
      amount: order.totalAmount.toFixed(2),
      currency: provider === PaymentProvider.BKASH ? 'BDT' : 'USD',
    })
    const payment = await this.database.payment.create({
      data: {
        orderId,
        provider,
        transactionId: initiated.transactionId,
        status: initiated.status,
        rawResponse: initiated.rawResponse as Prisma.InputJsonValue,
      },
    })
    return {
      payment: serializePayment(payment),
      clientSecret: initiated.clientSecret,
      redirectUrl: initiated.redirectUrl,
    }
  }

  async verify(userId: string, provider: PaymentProvider, transactionId: string) {
    const payment = await this.findOwnedPayment(userId, provider, transactionId)
    if (payment.status === PaymentStatus.SUCCESS) {
      return { payment: serializePayment(payment), alreadyProcessed: true }
    }
    const result = await this.strategies.resolve(provider).verifyPayment({ transactionId })
    await this.applyVerification(payment.id, result)
    return {
      payment: serializePayment(
        await this.database.payment.findUniqueOrThrow({ where: { id: payment.id } }),
      ),
      alreadyProcessed: false,
    }
  }

  async executeBkash(userId: string, transactionId: string) {
    const payment = await this.findOwnedPayment(userId, PaymentProvider.BKASH, transactionId)
    const strategy = this.strategies.resolve(PaymentProvider.BKASH)
    if (!strategy.executePayment) {
      throw new AppError(500, 'PAYMENT_CONFIGURATION_ERROR', 'bKash execute is unavailable')
    }
    const result = await strategy.executePayment({ transactionId })
    await this.applyVerification(payment.id, result)
    return serializePayment(
      await this.database.payment.findUniqueOrThrow({ where: { id: payment.id } }),
    )
  }

  async processWebhook(
    provider: PaymentProvider,
    input: { rawBody: Buffer; signature?: string; parsedBody?: unknown },
  ): Promise<{ ignored: boolean; alreadyProcessed?: boolean }> {
    const result = await this.strategies.resolve(provider).handleWebhook(input)
    if (!result) return { ignored: true }
    const payment = await this.database.payment.findUnique({
      where: { transactionId: result.transactionId },
    })
    if (!payment) {
      logger.warn(
        { provider, transactionId: result.transactionId },
        'Webhook did not match an internal payment',
      )
      return { ignored: true }
    }
    const finalized = await this.applyVerification(payment.id, result)
    return { ignored: false, alreadyProcessed: finalized.alreadyProcessed }
  }

  async listForUser(userId: string, input: { page: number; limit: number }) {
    const where = { order: { userId } }
    const [items, total] = await this.database.$transaction([
      this.database.payment.findMany({
        where,
        include: {
          order: { select: { id: true, totalAmount: true, status: true, createdAt: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (input.page - 1) * input.limit,
        take: input.limit,
      }),
      this.database.payment.count({ where }),
    ])
    return {
      items: items.map((payment) => ({
        ...serializePayment(payment),
        order: {
          ...payment.order,
          totalAmount: payment.order.totalAmount.toFixed(2),
        },
      })),
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        pages: Math.ceil(total / input.limit),
      },
    }
  }

  private async findOwnedPayment(
    userId: string,
    provider: PaymentProvider,
    transactionId: string,
  ) {
    const payment = await this.database.payment.findFirst({
      where: { transactionId, provider, order: { userId } },
    })
    if (!payment) throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Payment was not found')
    return payment
  }

  private async applyVerification(
    paymentId: string,
    result: {
      transactionId: string
      status: PaymentStatus
      rawResponse: Record<string, unknown>
    },
  ): Promise<{ alreadyProcessed: boolean }> {
    if (result.status === PaymentStatus.SUCCESS) {
      return this.finalizer.finalizeSuccess({
        paymentId,
        transactionId: result.transactionId,
        rawResponse: result.rawResponse,
      })
    }
    if (result.status === PaymentStatus.FAILED) {
      await this.finalizer.markFailed(paymentId, result.rawResponse)
    } else {
      await this.database.payment.update({
        where: { id: paymentId },
        data: { rawResponse: result.rawResponse as Prisma.InputJsonValue },
      })
    }
    return { alreadyProcessed: false }
  }
}

export function serializePayment<T extends { rawResponse: unknown }>(payment: T) {
  return { ...payment, rawResponse: payment.rawResponse ?? null }
}
