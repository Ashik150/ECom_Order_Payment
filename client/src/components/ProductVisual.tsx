import catalogUrl from '../assets/product-catalog.png'

const positions = ['0% 0%', '100% 0%', '0% 100%', '100% 100%']

export function ProductVisual({
  productKey,
  className = '',
}: {
  productKey: string
  className?: string
}) {
  const knownIndex = productKey.startsWith('ATLAS')
    ? 0
    : productKey.startsWith('ARC')
      ? 1
      : productKey.startsWith('NST')
        ? 2
        : productKey.startsWith('FLD')
          ? 3
          : undefined
  let hash = knownIndex ?? 0
  if (knownIndex === undefined) {
    for (const character of productKey) hash = (hash + character.charCodeAt(0)) % 4
  }
  return (
    <div
      className={`product-visual ${className}`}
      role="img"
      aria-label="Product photograph"
      style={{
        backgroundImage: `url(${catalogUrl})`,
        backgroundPosition: positions[hash],
      }}
    />
  )
}
