import { MemoryCacheStore } from './cache'

describe('MemoryCacheStore', () => {
  it('stores, retrieves, and deletes serialized values', async () => {
    const cache = new MemoryCacheStore()
    await cache.set('key', '{"ok":true}', 60)
    await expect(cache.get('key')).resolves.toBe('{"ok":true}')
    await cache.delete('key')
    await expect(cache.get('key')).resolves.toBeNull()
  })

  it('expires values', async () => {
    jest.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(3000)
    const cache = new MemoryCacheStore()
    await cache.set('key', 'value', 1)
    await expect(cache.get('key')).resolves.toBeNull()
  })
})
