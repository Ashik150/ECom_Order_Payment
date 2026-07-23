import type { Category, PrismaClient } from '@prisma/client'
import { AppError } from '../../errors/app-error'
import type { CacheStore } from '../../infrastructure/cache'
import { logger } from '../../infrastructure/logger'

export const CATEGORY_TREE_CACHE_KEY = 'categories:tree:v1'

export interface CategoryNode {
  id: string
  name: string
  slug: string
  parentId: string | null
  children: CategoryNode[]
}

export class CategoryService {
  constructor(
    private readonly database: PrismaClient,
    private readonly cache: CacheStore,
    private readonly cacheTtlSeconds: number,
  ) {}

  list(): Promise<Category[]> {
    return this.database.category.findMany({ orderBy: [{ name: 'asc' }, { id: 'asc' }] })
  }

  async getById(id: string): Promise<Category> {
    const category = await this.database.category.findUnique({ where: { id } })
    if (!category) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category was not found')
    return category
  }

  async getTree(): Promise<CategoryNode[]> {
    try {
      const cached = await this.cache.get(CATEGORY_TREE_CACHE_KEY)
      if (cached) return JSON.parse(cached) as CategoryNode[]
    } catch (error) {
      logger.warn({ error }, 'Category cache read failed; using PostgreSQL')
    }

    const tree = buildCategoryTree(await this.list())
    try {
      await this.cache.set(CATEGORY_TREE_CACHE_KEY, JSON.stringify(tree), this.cacheTtlSeconds)
    } catch (error) {
      logger.warn({ error }, 'Category cache write failed; returning database result')
    }
    return tree
  }

  async create(input: { name: string; slug: string; parentId?: string | null }): Promise<Category> {
    if (input.parentId) await this.getById(input.parentId)
    const category = await this.database.category.create({
      data: {
        name: input.name,
        slug: input.slug,
        parentId: input.parentId ?? null,
      },
    })
    await this.invalidateTree()
    return category
  }

  async update(
    id: string,
    input: { name?: string; slug?: string; parentId?: string | null },
  ): Promise<Category> {
    await this.getById(id)
    if (input.parentId !== undefined) await this.assertValidParent(id, input.parentId)
    const category = await this.database.category.update({ where: { id }, data: input })
    await this.invalidateTree()
    return category
  }

  async delete(id: string): Promise<void> {
    await this.getById(id)
    const [childCount, productCount] = await Promise.all([
      this.database.category.count({ where: { parentId: id } }),
      this.database.product.count({ where: { categoryId: id } }),
    ])
    if (childCount || productCount) {
      throw new AppError(
        409,
        'CATEGORY_IN_USE',
        'A category with children or products cannot be deleted',
      )
    }
    await this.database.category.delete({ where: { id } })
    await this.invalidateTree()
  }

  private async assertValidParent(categoryId: string, parentId: string | null): Promise<void> {
    if (!parentId) return
    if (categoryId === parentId) {
      throw new AppError(422, 'CATEGORY_CYCLE', 'A category cannot be its own parent')
    }

    const categories = await this.list()
    const parentById = new Map(categories.map((category) => [category.id, category.parentId]))
    if (!parentById.has(parentId)) {
      throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Parent category was not found')
    }

    const visited = new Set<string>()
    let cursor: string | null = parentId
    while (cursor) {
      if (cursor === categoryId || visited.has(cursor)) {
        throw new AppError(422, 'CATEGORY_CYCLE', 'Category parent would create a cycle')
      }
      visited.add(cursor)
      cursor = parentById.get(cursor) ?? null
    }
  }

  private async invalidateTree(): Promise<void> {
    try {
      await this.cache.delete(CATEGORY_TREE_CACHE_KEY)
    } catch (error) {
      logger.warn({ error }, 'Category cache invalidation failed')
    }
  }
}

export function buildCategoryTree(categories: Category[]): CategoryNode[] {
  const nodes = new Map<string, CategoryNode>()
  for (const category of categories) {
    nodes.set(category.id, {
      id: category.id,
      name: category.name,
      slug: category.slug,
      parentId: category.parentId,
      children: [],
    })
  }

  const roots: CategoryNode[] = []
  const attached = new Set<string>()
  for (const category of categories) {
    const node = nodes.get(category.id)!
    const parent = category.parentId ? nodes.get(category.parentId) : undefined
    if (parent && !wouldCreateTreeCycle(node.id, parent, nodes)) {
      parent.children.push(node)
      attached.add(node.id)
    }
  }
  for (const node of nodes.values()) {
    if (!attached.has(node.id)) roots.push(node)
    node.children.sort(compareCategoryNodes)
  }
  return roots.sort(compareCategoryNodes)
}

function wouldCreateTreeCycle(
  childId: string,
  parent: CategoryNode,
  nodes: Map<string, CategoryNode>,
): boolean {
  const visited = new Set<string>()
  let cursor: CategoryNode | undefined = parent
  while (cursor) {
    if (cursor.id === childId || visited.has(cursor.id)) return true
    visited.add(cursor.id)
    cursor = cursor.parentId ? nodes.get(cursor.parentId) : undefined
  }
  return false
}

function compareCategoryNodes(left: CategoryNode, right: CategoryNode): number {
  return left.name.localeCompare(right.name) || left.id.localeCompare(right.id)
}
