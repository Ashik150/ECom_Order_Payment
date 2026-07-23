import {
  Prisma,
  ProductStatus,
  type Product,
} from '@prisma/client'
import type { PrismaClient } from '@prisma/client'
import { AppError } from '../../errors/app-error'

export interface ProductInput {
  name: string
  sku: string
  description: string
  price: number
  stock: number
  status: ProductStatus
  categoryId: string
}

export class ProductService {
  constructor(private readonly database: PrismaClient) {}

  async list(input: {
    page: number
    limit: number
    search?: string
    categoryId?: string
    status?: ProductStatus
    isAdmin?: boolean
  }) {
    const where: Prisma.ProductWhereInput = {
      status: input.isAdmin ? input.status : ProductStatus.ACTIVE,
      ...(input.categoryId ? { categoryId: input.categoryId } : {}),
      ...(input.search
        ? {
            OR: [
              { name: { contains: input.search, mode: 'insensitive' } },
              { sku: { contains: input.search, mode: 'insensitive' } },
              { description: { contains: input.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }
    const [items, total] = await this.database.$transaction([
      this.database.product.findMany({
        where,
        include: { category: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (input.page - 1) * input.limit,
        take: input.limit,
      }),
      this.database.product.count({ where }),
    ])
    return {
      items: items.map(serializeProduct),
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        pages: Math.ceil(total / input.limit),
      },
    }
  }

  async getById(id: string, includeInactive = false) {
    const product = await this.database.product.findFirst({
      where: { id, ...(includeInactive ? {} : { status: ProductStatus.ACTIVE }) },
      include: { category: true },
    })
    if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product was not found')
    return serializeProduct(product)
  }

  async create(input: ProductInput) {
    await this.assertCategory(input.categoryId)
    return serializeProduct(
      await this.database.product.create({
        data: { ...input, sku: input.sku.toUpperCase(), price: new Prisma.Decimal(input.price) },
        include: { category: true },
      }),
    )
  }

  async update(id: string, input: Partial<ProductInput>) {
    await this.assertExists(id)
    if (input.categoryId) await this.assertCategory(input.categoryId)
    return serializeProduct(
      await this.database.product.update({
        where: { id },
        data: {
          ...input,
          ...(input.sku ? { sku: input.sku.toUpperCase() } : {}),
          ...(input.price !== undefined ? { price: new Prisma.Decimal(input.price) } : {}),
        },
        include: { category: true },
      }),
    )
  }

  async delete(id: string): Promise<void> {
    await this.assertExists(id)
    const orderItems = await this.database.orderItem.count({ where: { productId: id } })
    if (orderItems) {
      throw new AppError(
        409,
        'PRODUCT_IN_USE',
        'A product referenced by an order cannot be deleted; mark it inactive instead',
      )
    }
    await this.database.product.delete({ where: { id } })
  }

  private async assertExists(id: string): Promise<Product> {
    const product = await this.database.product.findUnique({ where: { id } })
    if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product was not found')
    return product
  }

  private async assertCategory(categoryId: string): Promise<void> {
    const category = await this.database.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    })
    if (!category) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category was not found')
  }
}

export function serializeProduct<T extends Product & { category?: unknown }>(product: T) {
  return {
    ...product,
    price: product.price.toFixed(2),
  }
}
