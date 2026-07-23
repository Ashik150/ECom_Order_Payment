import type { CategoryNode } from '../categories/category.service'

export function depthFirstCategoryIds(
  forest: CategoryNode[],
  startId: string,
  limit = Number.POSITIVE_INFINITY,
): string[] {
  const byId = new Map<string, CategoryNode>()
  const parentById = new Map<string, string | null>()
  const indexingStack = [...forest]
  const indexed = new Set<string>()

  while (indexingStack.length) {
    const node = indexingStack.pop()!
    if (indexed.has(node.id)) continue
    indexed.add(node.id)
    byId.set(node.id, node)
    parentById.set(node.id, node.parentId)
    indexingStack.push(...node.children)
  }

  if (!byId.has(startId)) return []

  const result: string[] = []
  const visited = new Set<string>()
  const traverse = (rootId: string): void => {
    const stack = [rootId]
    while (stack.length && result.length < limit) {
      const id = stack.pop()!
      if (visited.has(id)) continue
      visited.add(id)
      result.push(id)
      const children = byId.get(id)?.children ?? []
      for (let index = children.length - 1; index >= 0; index -= 1) {
        const child = children[index]
        if (child) stack.push(child.id)
      }
    }
  }

  traverse(startId)
  let ancestorId = parentById.get(startId) ?? null
  while (ancestorId && result.length < limit) {
    traverse(ancestorId)
    ancestorId = parentById.get(ancestorId) ?? null
  }
  return result
}
