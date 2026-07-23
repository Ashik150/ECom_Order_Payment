import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '../layouts/AppLayout'
import { AdminCategoriesPage, AdminProductsPage, ProductFormPage } from '../pages/admin/AdminPages'
import { LoginPage, RegisterPage } from '../pages/auth/AuthPages'
import {
  CartPage,
  CheckoutPage,
  OrderDetailsPage,
  OrdersPage,
  PaymentsPage,
} from '../pages/commerce/CommercePages'
import { ProductDetailsPage, ProductsPage } from '../pages/products/ProductPages'
import { AdminRoute, ProtectedRoute } from './guards'

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/products" replace /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'products', element: <ProductsPage /> },
      { path: 'products/:id', element: <ProductDetailsPage /> },
      { path: 'cart', element: <CartPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'checkout', element: <CheckoutPage /> },
          { path: 'orders', element: <OrdersPage /> },
          { path: 'orders/:id', element: <OrderDetailsPage /> },
          { path: 'payments', element: <PaymentsPage /> },
        ],
      },
      {
        element: <AdminRoute />,
        children: [
          { path: 'admin/products', element: <AdminProductsPage /> },
          { path: 'admin/products/new', element: <ProductFormPage /> },
          { path: 'admin/products/:id/edit', element: <ProductFormPage /> },
          { path: 'admin/categories', element: <AdminCategoriesPage /> },
        ],
      },
      { path: '*', element: <Navigate to="/products" replace /> },
    ],
  },
])
