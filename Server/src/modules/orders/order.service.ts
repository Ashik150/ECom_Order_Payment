import { OrderStatus, Prisma, ProductStatus, Role } from '@prisma/client'
import type { PrismaClient } from '@prisma/client'
import { AppError } from '../../errors/app-error'
import { OrderCalculator } from './order-calculator'

const orderInclude = {
  items: {
    include: {
      product: { select: { id: true, name: true, sku: true, status: true } },
    },
  },
  payments: {
    select: {
      id: true,
      provider: true,
      transactionId: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.OrderInclude

export class OrderService {
  constructor(
    private readonly database: PrismaClient,
    private readonly calculator = new OrderCalculator(),
  ) {}

  async create(userId: string, input: { items: { productId: string; quantity: number }[] }) {
    const productIds = input.items.map((item) => item.productId)
    const products = await this.database.product.findMany({ where: { id: { in: productIds } } })
    if (products.length !== productIds.length) {
      throw new AppError(404, 'PRODUCT_NOT_FOUND', 'One or more products were not found')
    }

    const productsById = new Map(products.map((product) => [product.id, product]))
    const pricedItems = input.items.map((item) => {
      const product = productsById.get(item.productId)!
      if (product.status !== ProductStatus.ACTIVE) {
        throw new AppError(409, 'PRODUCT_UNAVAILABLE', `${product.name} is not available`)
      }
      if (product.stock < item.quantity) {
        throw new AppError(409, 'INSUFFICIENT_STOCK', `Insufficient stock for ${product.name}`)
      }
      return { ...item, unitPrice: product.price.toString() }
    })
    const calculation = this.calculator.calculate(pricedItems)

    return this.database.$transaction(async (transaction) => {
      const currentProducts = await transaction.product.findMany({
        where: { id: { in: productIds }, status: ProductStatus.ACTIVE },
      })
      const currentById = new Map(currentProducts.map((product) => [product.id, product]))
      for (const item of input.items) {
        const product = currentById.get(item.productId)
        if (!product || product.stock < item.quantity) {
          throw new AppError(409, 'STOCK_CHANGED', 'Product availability changed; review your cart')
        }
      }

      return transaction.order.create({
        data: {
          userId,
          totalAmount: new Prisma.Decimal(calculation.total),
          items: {
            create: calculation.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: new Prisma.Decimal(item.price),
              subtotal: new Prisma.Decimal(item.subtotal),
            })),
          },
        },
        include: orderInclude,
      })
    })
  }

  async listForUser(userId: string, input: { page: number; limit: number }) {
    const where = { userId }
    const [items, total] = await this.database.$transaction([
      this.database.order.findMany({
        where,
        include: orderInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (input.page - 1) * input.limit,
        take: input.limit,
      }),
      this.database.order.count({ where }),
    ])
    return {
      items: items.map(serializeOrder),
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        pages: Math.ceil(total / input.limit),
      },
    }
  }

  async getById(id: string, actor: { userId: string; role: Role }) {
    const order = await this.database.order.findUnique({ where: { id }, include: orderInclude })
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order was not found')
    if (actor.role !== Role.ADMIN && order.userId !== actor.userId) {
      throw new AppError(403, 'ORDER_FORBIDDEN', 'You cannot access this order')
    }
    return serializeOrder(order)
  }

  async cancel(id: string, userId: string) {
    const order = await this.database.order.findFirst({ where: { id, userId } })
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order was not found')
    if (order.status !== OrderStatus.PENDING) {
      throw new AppError(409, 'ORDER_NOT_CANCELABLE', 'Only pending orders can be canceled')
    }
    const updated = await this.database.order.updateMany({
      where: { id, userId, status: OrderStatus.PENDING },
      data: { status: OrderStatus.CANCELED },
    })
    if (!updated.count) throw new AppError(409, 'ORDER_STATE_CHANGED', 'Order state changed')
    return this.getById(id, { userId, role: Role.USER })
  }
}

export function serializeOrder<
  T extends {
    totalAmount: Prisma.Decimal
    items: { price: Prisma.Decimal; subtotal: Prisma.Decimal }[]
  },
>(order: T) {
  return {
    ...order,
    totalAmount: order.totalAmount.toFixed(2),
    items: order.items.map((item) => ({
      ...item,
      price: item.price.toFixed(2),
      subtotal: item.subtotal.toFixed(2),
    })),
  }
}
