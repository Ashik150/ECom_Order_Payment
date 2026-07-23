import {
  Box,
  CreditCard,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Package,
  ShoppingBag,
  ShoppingCart,
  Tags,
  UserPlus,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'
import { useCart } from '../store/CartContext'

export function AppLayout() {
  const { user, logout } = useAuth()
  const { count } = useCart()
  const [menuOpen, setMenuOpen] = useState(false)
  const close = () => setMenuOpen(false)

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/products" className="brand" onClick={close}>
          <span className="brand-mark">R</span>
          <span>Raco Supply</span>
        </Link>
        <button
          className="icon-button mobile-menu"
          onClick={() => setMenuOpen((value) => !value)}
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          title={menuOpen ? 'Close navigation' : 'Open navigation'}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <nav className="top-actions">
          <NavLink to="/cart" className="cart-link">
            <ShoppingCart size={18} />
            <span>Cart</span>
            {count ? <b>{count}</b> : null}
          </NavLink>
          {user ? (
            <button className="text-button" onClick={logout}>
              <LogOut size={17} /> Log out
            </button>
          ) : (
            <Link className="primary-button compact" to="/login">
              <LogIn size={17} /> Sign in
            </Link>
          )}
        </nav>
      </header>

      <div className="workspace">
        <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
          <nav onClick={close}>
            <NavLink to="/products">
              <Package size={18} /> Products
            </NavLink>
            <NavLink to="/cart">
              <ShoppingBag size={18} /> Cart
            </NavLink>
            {user ? (
              <>
                <NavLink to="/orders">
                  <Box size={18} /> Orders
                </NavLink>
                <NavLink to="/payments">
                  <CreditCard size={18} /> Payments
                </NavLink>
              </>
            ) : (
              <>
                <NavLink to="/login">
                  <LogIn size={18} /> Sign in
                </NavLink>
                <NavLink to="/register">
                  <UserPlus size={18} /> Register
                </NavLink>
              </>
            )}
            {user?.role === 'ADMIN' ? (
              <div className="nav-section">
                <span>Administration</span>
                <NavLink to="/admin/products">
                  <LayoutDashboard size={18} /> Products
                </NavLink>
                <NavLink to="/admin/categories">
                  <Tags size={18} /> Categories
                </NavLink>
              </div>
            ) : null}
          </nav>
          <div className="sidebar-account">
            <div className="avatar">{user?.name.charAt(0).toUpperCase() ?? 'G'}</div>
            <div>
              <strong>{user?.name ?? 'Guest shopper'}</strong>
              <span>{user?.email ?? 'Browse the catalog'}</span>
            </div>
          </div>
        </aside>
        {menuOpen ? <button className="scrim" aria-label="Close navigation" onClick={close} /> : null}
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
