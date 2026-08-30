export function getCachedEnvironment(cache, key, create) {
  if (!cache.has(key)) cache.set(key, create())
  return cache.get(key)
}
