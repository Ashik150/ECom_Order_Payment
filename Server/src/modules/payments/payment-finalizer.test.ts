import {
  OrderStatus,
  PaymentStatus,
  ProductStatus,
  type PrismaClient,
} from '@prisma/client'
import { PaymentFinalizer } from './payment-finalizer'

function databaseWithPayment(paymentOverrides: Record<string, unknown> = {}) {
  const transaction = {
    payment: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'payment-1',
        orderId: 'order-1',
        status: PaymentStatus.PENDING,
        order: {
          id: 'order-1',
          status: OrderStatus.PENDING,
          items: [{ productId: 'product-1', quantity: 2 }],
        },
        ...paymentOverrides,
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    order: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    product: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
  }
  const database = {
    $transaction: jest.fn(
      async (callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction),
    ),
    payment: { updateMany: jest.fn() },
  } as unknown as PrismaClient
  return { database, transaction }
}

describe('PaymentFinalizer', () => {
  it('claims an order, reduces stock, and marks payment successful atomically', async () => {
    const { database, transaction } = databaseWithPayment()
    const result = await new PaymentFinalizer(database).finalizeSuccess({
      paymentId: 'payment-1',
      transactionId: 'transaction-1',
      rawResponse: { status: 'success' },
    })
    expect(result).toEqual({ alreadyProcessed: false })
    expect(transaction.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'order-1', status: OrderStatus.PENDING },
      data: { status: OrderStatus.PAID },
    })
    expect(transaction.product.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'product-1',
        status: ProductStatus.ACTIVE,
        stock: { gte: 2 },
      },
      data: { stock: { decrement: 2 }, version: { increment: 1 } },
    })
    expect(transaction.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: PaymentStatus.SUCCESS }),
      }),
    )
  })

  it('does not reduce stock for an already successful payment', async () => {
    const { database, transaction } = databaseWithPayment({
      status: PaymentStatus.SUCCESS,
    })
    await expect(
      new PaymentFinalizer(database).finalizeSuccess({
        paymentId: 'payment-1',
        transactionId: 'transaction-1',
        rawResponse: {},
      }),
    ).resolves.toEqual({ alreadyProcessed: true })
    expect(transaction.product.updateMany).not.toHaveBeenCalled()
  })

  it('fails the transaction when stock cannot be reduced', async () => {
    const { database, transaction } = databaseWithPayment()
    transaction.product.updateMany.mockResolvedValue({ count: 0 })
    await expect(
      new PaymentFinalizer(database).finalizeSuccess({
        paymentId: 'payment-1',
        transactionId: 'transaction-1',
        rawResponse: {},
      }),
    ).rejects.toThrow('Stock changed')
    expect(transaction.payment.update).not.toHaveBeenCalled()
  })
})
