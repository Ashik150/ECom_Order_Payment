import { ArrowLeft, Search, ShoppingCart, SlidersHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { api, apiErrorMessage } from '../../api/client'
import { ProductVisual } from '../../components/ProductVisual'
import { EmptyState, ErrorState, LoadingState, StatusBadge } from '../../components/ui'
import { useCart } from '../../store/CartContext'
import type { ApiResponse, Category, Product } from '../../types/api'

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [meta, setMeta] = useState<ApiResponse<Product[]>['meta']>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const search = searchParams.get('search') ?? ''
  const categoryId = searchParams.get('categoryId') ?? ''
  const page = Number(searchParams.get('page') ?? 1)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [productsResponse, categoriesResponse] = await Promise.all([
          api.get<ApiResponse<Product[]>>('/products', {
            params: { search: search || undefined, categoryId: categoryId || undefined, page },
          }),
          api.get<ApiResponse<Category[]>>('/categories'),
        ])
        setProducts(productsResponse.data.data)
        setMeta(productsResponse.data.meta)
        setCategories(categoriesResponse.data.data)
      } catch (loadError) {
        setError(apiErrorMessage(loadError))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [search, categoryId, page])

  const updateParam = (name: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(name, value)
    else next.delete(name)
    if (name !== 'page') next.delete('page')
    setSearchParams(next)
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Workspace essentials</span>
          <h1>Products</h1>
          <p>Thoughtful tools for focused desks and better workdays.</p>
        </div>
        <div className="result-count">{meta?.total ?? 0} active products</div>
      </header>
      <div className="filterbar">
        <label className="searchbox">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => updateParam('search', event.target.value)}
            placeholder="Search products or SKU"
            aria-label="Search products"
          />
        </label>
        <label className="selectbox">
          <SlidersHorizontal size={17} />
          <select
            value={categoryId}
            onChange={(event) => updateParam('categoryId', event.target.value)}
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option value={category.id} key={category.id}>{category.name}</option>
            ))}
          </select>
        </label>
      </div>
      {error ? <ErrorState message={error} /> : null}
      {loading ? <LoadingState label="Loading products" /> : null}
      {!loading && !products.length ? (
        <EmptyState title="No products found" detail="Try a broader search or another category." />
      ) : null}
      <div className="product-grid">
        {products.map((product) => <ProductCard product={product} key={product.id} />)}
      </div>
      {meta && meta.pages > 1 ? (
        <nav className="pagination" aria-label="Product pages">
          <button disabled={page <= 1} onClick={() => updateParam('page', String(page - 1))}>Previous</button>
          <span>Page {page} of {meta.pages}</span>
          <button disabled={page >= meta.pages} onClick={() => updateParam('page', String(page + 1))}>Next</button>
        </nav>
      ) : null}
    </div>
  )
}

export function ProductDetailsPage() {
  const { id = '' } = useParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [recommendations, setRecommendations] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const cart = useCart()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [productResponse, recommendationsResponse] = await Promise.all([
          api.get<ApiResponse<Product>>(`/products/${id}`),
          api.get<ApiResponse<Product[]>>(`/products/${id}/recommendations`),
        ])
        setProduct(productResponse.data.data)
        setRecommendations(recommendationsResponse.data.data)
      } catch (loadError) {
        setError(apiErrorMessage(loadError))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [id])

  if (loading) return <LoadingState label="Loading product" />
  if (error || !product) return <ErrorState message={error || 'Product not found'} />
  return (
    <div className="page-stack">
      <Link className="back-link" to="/products"><ArrowLeft size={17} /> Back to products</Link>
      <section className="product-detail">
        <ProductVisual productKey={product.sku} className="detail-visual" />
        <div className="product-detail-copy">
          <div className="detail-meta">
            <StatusBadge status={product.stock ? 'In stock' : 'Out of stock'} />
            <span>{product.category?.name}</span>
          </div>
          <h1>{product.name}</h1>
          <span className="sku">{product.sku}</span>
          <p>{product.description}</p>
          <div className="detail-purchase">
            <strong>${product.price}</strong>
            <button
              className="primary-button"
              disabled={!product.stock}
              onClick={() => cart.add(product)}
            >
              <ShoppingCart size={18} /> Add to cart
            </button>
          </div>
        </div>
      </section>
      <section>
        <header className="section-header">
          <div><h2>Related products</h2><p>Discovered through the category hierarchy.</p></div>
        </header>
        {recommendations.length ? (
          <div className="product-grid compact-grid">
            {recommendations.map((item) => <ProductCard product={item} key={item.id} />)}
          </div>
        ) : (
          <EmptyState title="No related products yet" detail="Recommendations will appear as the catalog grows." />
        )}
      </section>
    </div>
  )
}

function ProductCard({ product }: { product: Product }) {
  const cart = useCart()
  return (
    <article className="product-card">
      <Link to={`/products/${product.id}`} className="product-image-link">
        <ProductVisual productKey={product.sku} />
      </Link>
      <div className="product-card-body">
        <div className="product-card-meta">
          <span>{product.category?.name ?? 'Workspace'}</span>
          <span>{product.stock} available</span>
        </div>
        <Link to={`/products/${product.id}`}><h2>{product.name}</h2></Link>
        <p>{product.description}</p>
        <div className="product-card-footer">
          <strong>${product.price}</strong>
          <button
            className="icon-button"
            onClick={() => cart.add(product)}
            disabled={!product.stock}
            aria-label={`Add ${product.name} to cart`}
            title="Add to cart"
          >
            <ShoppingCart size={18} />
          </button>
        </div>
      </div>
    </article>
  )
}
