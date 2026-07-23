import { zodResolver } from '@hookform/resolvers/zod'
import { Edit3, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { api, apiErrorMessage } from '../../api/client'
import { EmptyState, ErrorState, Field, LoadingState, StatusBadge } from '../../components/ui'
import type { ApiResponse, Category, Product } from '../../types/api'

const productSchema = z.object({
  name: z.string().trim().min(2),
  sku: z.string().trim().min(2).regex(/^[A-Za-z0-9_-]+$/),
  description: z.string().trim().min(10),
  price: z.coerce.number().min(0),
  stock: z.coerce.number().int().min(0),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  categoryId: z.string().min(1, 'Choose a category'),
})
type ProductFormInput = z.input<typeof productSchema>
type ProductValues = z.output<typeof productSchema>

export function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = () => {
    api.get<ApiResponse<Product[]>>('/products/admin/list', { params: { limit: 100 } })
      .then((response) => setProducts(response.data.data))
      .catch((loadError: unknown) => setError(apiErrorMessage(loadError)))
      .finally(() => setLoading(false))
  }
  useEffect(() => {
    void load()
  }, [])
  const remove = async (product: Product) => {
    if (!window.confirm(`Delete ${product.name}?`)) return
    try {
      await api.delete(`/products/${product.id}`)
      load()
    } catch (deleteError) {
      setError(apiErrorMessage(deleteError))
    }
  }
  return (
    <div className="page-stack">
      <header className="page-header">
        <div><span className="eyebrow">Administration</span><h1>Products</h1><p>Manage catalog availability, pricing, and stock.</p></div>
        <Link className="primary-button" to="/admin/products/new"><Plus size={17} /> New product</Link>
      </header>
      {error ? <ErrorState message={error} /> : null}
      {loading ? <LoadingState label="Loading products" /> : null}
      {!loading && !products.length ? <EmptyState title="No products" detail="Create the first catalog item." /> : null}
      <div className="admin-table">
        <div className="admin-table-head"><span>Product</span><span>Price</span><span>Stock</span><span>Status</span><span>Actions</span></div>
        {products.map((product) => (
          <div className="admin-table-row" key={product.id}>
            <div><strong>{product.name}</strong><span>{product.sku}</span></div>
            <span>${product.price}</span><span>{product.stock}</span><StatusBadge status={product.status} />
            <div className="row-actions">
              <Link className="icon-button" to={`/admin/products/${product.id}/edit`} aria-label={`Edit ${product.name}`}><Edit3 size={17} /></Link>
              <button className="icon-button danger" onClick={() => remove(product)} aria-label={`Delete ${product.name}`}><Trash2 size={17} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ProductFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(Boolean(id))
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormInput, unknown, ProductValues>({
    resolver: zodResolver(productSchema),
    defaultValues: { status: 'ACTIVE', stock: 0, price: 0 },
  })
  useEffect(() => {
    const load = async () => {
      try {
        const categoriesResponse = await api.get<ApiResponse<Category[]>>('/categories')
        setCategories(categoriesResponse.data.data)
        if (id) {
          const response = await api.get<ApiResponse<Product>>(`/products/admin/${id}`)
          const product = response.data.data
          reset({
            name: product.name,
            sku: product.sku,
            description: product.description,
            price: Number(product.price),
            stock: product.stock,
            status: product.status,
            categoryId: product.categoryId,
          })
        }
      } catch (loadError) {
        setError(apiErrorMessage(loadError))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [id, reset])
  const submit = async (values: ProductValues) => {
    setError('')
    try {
      if (id) await api.patch(`/products/${id}`, values)
      else await api.post('/products', values)
      navigate('/admin/products')
    } catch (submitError) {
      setError(apiErrorMessage(submitError))
    }
  }
  if (loading) return <LoadingState label="Loading product" />
  return (
    <div className="page-stack narrow-page">
      <header className="page-header"><div><span className="eyebrow">Administration</span><h1>{id ? 'Edit product' : 'New product'}</h1><p>All prices and stock values are validated again by the API.</p></div></header>
      {error ? <ErrorState message={error} /> : null}
      <form className="editor-form" onSubmit={handleSubmit(submit)}>
        <div className="form-grid">
          <Field label="Name" error={errors.name?.message}><input {...register('name')} /></Field>
          <Field label="SKU" error={errors.sku?.message}><input {...register('sku')} /></Field>
          <Field label="Price" error={errors.price?.message}><input type="number" min="0" step="0.01" {...register('price')} /></Field>
          <Field label="Stock" error={errors.stock?.message}><input type="number" min="0" step="1" {...register('stock')} /></Field>
          <Field label="Status" error={errors.status?.message}><select {...register('status')}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></Field>
          <Field label="Category" error={errors.categoryId?.message}><select {...register('categoryId')}><option value="">Choose category</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></Field>
        </div>
        <Field label="Description" error={errors.description?.message}><textarea rows={6} {...register('description')} /></Field>
        <div className="form-actions"><Link className="secondary-button" to="/admin/products">Cancel</Link><button className="primary-button" disabled={isSubmitting}><Save size={17} /> {isSubmitting ? 'Saving...' : 'Save product'}</button></div>
      </form>
    </div>
  )
}

const categorySchema = z.object({
  name: z.string().trim().min(2),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  parentId: z.string().optional(),
})
type CategoryValues = z.infer<typeof categorySchema>

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Category | null>(null)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CategoryValues>({ resolver: zodResolver(categorySchema) })
  const load = () => api.get<ApiResponse<Category[]>>('/categories').then((response) => setCategories(response.data.data)).catch((loadError: unknown) => setError(apiErrorMessage(loadError)))
  useEffect(() => { void load() }, [])
  const submit = async (values: CategoryValues) => {
    try {
      const payload = { ...values, parentId: values.parentId || null }
      if (editing) await api.patch(`/categories/${editing.id}`, payload)
      else await api.post('/categories', payload)
      setEditing(null)
      reset({ name: '', slug: '', parentId: '' })
      await load()
    } catch (submitError) { setError(apiErrorMessage(submitError)) }
  }
  const startEdit = (category: Category) => {
    setEditing(category)
    reset({ name: category.name, slug: category.slug, parentId: category.parentId ?? '' })
  }
  const remove = async (category: Category) => {
    if (!window.confirm(`Delete ${category.name}?`)) return
    try { await api.delete(`/categories/${category.id}`); await load() }
    catch (deleteError) { setError(apiErrorMessage(deleteError)) }
  }
  return (
    <div className="page-stack">
      <header className="page-header"><div><span className="eyebrow">Administration</span><h1>Categories</h1><p>Maintain the hierarchy used by search and DFS recommendations.</p></div></header>
      {error ? <ErrorState message={error} /> : null}
      <div className="admin-split">
        <form className="editor-form" onSubmit={handleSubmit(submit)}>
          <h2>{editing ? 'Edit category' : 'New category'}</h2>
          <Field label="Name" error={errors.name?.message}><input {...register('name')} /></Field>
          <Field label="Slug" error={errors.slug?.message}><input {...register('slug')} /></Field>
          <Field label="Parent" error={errors.parentId?.message}><select {...register('parentId')}><option value="">Root category</option>{categories.filter((category) => category.id !== editing?.id).map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></Field>
          <div className="form-actions">{editing ? <button type="button" className="secondary-button" onClick={() => { setEditing(null); reset({ name: '', slug: '', parentId: '' }) }}>Cancel</button> : null}<button className="primary-button" disabled={isSubmitting}><Save size={17} /> Save</button></div>
        </form>
        <div className="category-list">
          {categories.map((category) => (
            <div key={category.id}><div><strong>{category.name}</strong><span>{category.slug}</span></div><span>{categories.find((item) => item.id === category.parentId)?.name ?? 'Root'}</span><div className="row-actions"><button className="icon-button" onClick={() => startEdit(category)} aria-label={`Edit ${category.name}`}><Edit3 size={17} /></button><button className="icon-button danger" onClick={() => remove(category)} aria-label={`Delete ${category.name}`}><Trash2 size={17} /></button></div></div>
          ))}
        </div>
      </div>
    </div>
  )
}
