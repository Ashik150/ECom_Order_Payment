import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingState } from '../components/ui'
import { useAuth } from '../store/AuthContext'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <LoadingState label="Restoring your session" />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

export function AdminRoute() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingState label="Checking access" />
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'ADMIN') return <Navigate to="/products" replace />
  return <Outlet />
}
