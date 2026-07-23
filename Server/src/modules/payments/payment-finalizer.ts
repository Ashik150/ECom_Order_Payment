import {
  OrderStatus,
  PaymentStatus,
  Prisma,
  ProductStatus,
  type PrismaClient,
} from '@prisma/client'
import { AppError } from '../../errors/app-error'

export class PaymentFinalizer {
  constructor(private readonly database: PrismaClient) {}

  async finalizeSuccess(input: {
    paymentId: string
    transactionId: string
    rawResponse: Record<string, unknown>
  }): Promise<{ alreadyProcessed: boolean }> {
    return this.database.$transaction(
      async (transaction) => {
        const payment = await transaction.payment.findUnique({
          where: { id: input.paymentId },
          include: { order: { include: { items: true } } },
        })
        if (!payment) throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Payment was not found')
        if (payment.status === PaymentStatus.SUCCESS || payment.order.status === OrderStatus.PAID) {
          return { alreadyProcessed: true }
        }
        if (payment.order.status !== OrderStatus.PENDING) {
          throw new AppError(409, 'ORDER_NOT_PAYABLE', 'Only pending orders can be paid')
        }

        const claimed = await transaction.order.updateMany({
          where: { id: payment.orderId, status: OrderStatus.PENDING },
          data: { status: OrderStatus.PAID },
        })
        if (!claimed.count) return { alreadyProcessed: true }

        for (const item of payment.order.items) {
          const reduced = await transaction.product.updateMany({
            where: {
              id: item.productId,
              status: ProductStatus.ACTIVE,
              stock: { gte: item.quantity },
            },
            data: {
              stock: { decrement: item.quantity },
              version: { increment: 1 },
            },
          })
          if (!reduced.count) {
            throw new AppError(
              409,
              'INSUFFICIENT_STOCK',
              'Stock changed before payment completion; the payment requires reconciliation',
            )
          }
        }

        await transaction.payment.update({
          where: { id: payment.id },
          data: {
            transactionId: input.transactionId,
            status: PaymentStatus.SUCCESS,
            rawResponse: input.rawResponse as Prisma.InputJsonValue,
            processedAt: new Date(),
          },
        })
        return { alreadyProcessed: false }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
  }

  async markFailed(
    paymentId: string,
    rawResponse: Record<string, unknown>,
  ): Promise<void> {
    await this.database.payment.updateMany({
      where: { id: paymentId, status: PaymentStatus.PENDING },
      data: {
        status: PaymentStatus.FAILED,
        rawResponse: rawResponse as Prisma.InputJsonValue,
        processedAt: new Date(),
      },
    })
  }
}
