import { ProductStatus } from '@prisma/client'
import type { PrismaClient } from '@prisma/client'
import { AppError } from '../../errors/app-error'
import type { CategoryService } from '../categories/category.service'
import { serializeProduct } from '../products/product.service'
import { depthFirstCategoryIds } from './dfs'

export class RecommendationService {
  constructor(
    private readonly database: PrismaClient,
    private readonly categories: CategoryService,
  ) {}

  async recommend(productId: string, limit: number) {
    const product = await this.database.product.findFirst({
      where: { id: productId, status: ProductStatus.ACTIVE },
      select: { id: true, categoryId: true },
    })
    if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product was not found')

    const categoryIds = depthFirstCategoryIds(await this.categories.getTree(), product.categoryId)
    if (!categoryIds.length) return []

    const categoryRank = new Map(categoryIds.map((id, index) => [id, index]))
    const candidates = await this.database.product.findMany({
      where: {
        id: { not: product.id },
        status: ProductStatus.ACTIVE,
        categoryId: { in: categoryIds },
      },
      include: { category: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    })
    return candidates
      .sort(
        (left, right) =>
          (categoryRank.get(left.categoryId) ?? Number.MAX_SAFE_INTEGER) -
            (categoryRank.get(right.categoryId) ?? Number.MAX_SAFE_INTEGER) ||
          left.name.localeCompare(right.name) ||
          left.id.localeCompare(right.id),
      )
      .slice(0, limit)
      .map(serializeProduct)
  }
}
