import type { CategoryNode } from '../categories/category.service'
import { depthFirstCategoryIds } from './dfs'

function node(id: string, children: CategoryNode[] = [], parentId: string | null = null): CategoryNode {
  return { id, name: id, slug: id, parentId, children }
}

describe('depthFirstCategoryIds', () => {
  it('returns an empty list when the category is absent', () => {
    expect(depthFirstCategoryIds([], 'missing')).toEqual([])
  })

  it('traverses descendants depth-first in deterministic order', () => {
    const tree = [node('root', [node('a', [node('deep', [], 'a')], 'root'), node('b', [], 'root')])]
    expect(depthFirstCategoryIds(tree, 'root')).toEqual(['root', 'a', 'deep', 'b'])
  })

  it('adds parent and sibling branches when starting below the root', () => {
    const tree = [node('root', [node('a', [], 'root'), node('b', [], 'root')])]
    expect(depthFirstCategoryIds(tree, 'a')).toEqual(['a', 'root', 'b'])
  })

  it('respects limits and protects against duplicate or cyclic object paths', () => {
    const root = node('root')
    const child = node('child', [], 'root')
    root.children = [child, child]
    child.children = [root]
    expect(depthFirstCategoryIds([root], 'root', 2)).toEqual(['root', 'child'])
  })
})
