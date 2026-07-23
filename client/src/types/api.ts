export type Role = 'ADMIN' | 'USER'
export type ProductStatus = 'ACTIVE' | 'INACTIVE'
export type OrderStatus = 'PENDING' | 'PAID' | 'CANCELED'
export type PaymentProvider = 'STRIPE' | 'BKASH'
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED'

export interface ApiResponse<T> {
  success: true
  data: T
  meta?: { page: number; limit: number; total: number; pages: number }
}

export interface User {
  id: string
  name: string
  email: string
  role: Role
}

export interface Category {
  id: string
  name: string
  slug: string
  parentId: string | null
  children?: Category[]
}

export interface Product {
  id: string
  name: string
  sku: string
  description: string
  price: string
  stock: number
  status: ProductStatus
  categoryId: string
  category?: Category
}

export interface OrderItem {
  id: string
  productId: string
  quantity: number
  price: string
  subtotal: string
  product: Pick<Product, 'id' | 'name' | 'sku' | 'status'>
}

export interface Order {
  id: string
  userId: string
  totalAmount: string
  status: OrderStatus
  items: OrderItem[]
  payments: Payment[]
  createdAt: string
  updatedAt: string
}

export interface Payment {
  id: string
  orderId: string
  provider: PaymentProvider
  transactionId: string | null
  status: PaymentStatus
  createdAt: string
  updatedAt: string
  order?: Pick<Order, 'id' | 'totalAmount' | 'status' | 'createdAt'>
}
