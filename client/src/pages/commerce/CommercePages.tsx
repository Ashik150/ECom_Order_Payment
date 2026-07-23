import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Minus,
  Plus,
  Smartphone,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, apiErrorMessage } from '../../api/client'
import { ProductVisual } from '../../components/ProductVisual'
import { EmptyState, ErrorState, LoadingState, StatusBadge } from '../../components/ui'
import { useCart } from '../../store/CartContext'
import type { ApiResponse, Order, Payment } from '../../types/api'

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

export function CartPage() {
  const cart = useCart()
  const total = cart.items.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0,
  )
  if (!cart.items.length) {
    return (
      <div className="page-stack">
        <PageTitle title="Your cart" detail="Review quantities before creating an order." />
        <EmptyState title="Your cart is empty" detail="Add a product to begin an order." />
        <Link to="/products" className="primary-button self-start">Browse products</Link>
      </div>
    )
  }
  return (
    <div className="page-stack">
      <PageTitle title="Your cart" detail={`${cart.count} items ready for checkout.`} />
      <div className="split-layout">
        <div className="line-items">
          {cart.items.map(({ product, quantity }) => (
            <article className="line-item" key={product.id}>
              <ProductVisual productKey={product.sku} />
              <div className="line-item-main">
                <Link to={`/products/${product.id}`}><h2>{product.name}</h2></Link>
                <span>{product.sku}</span>
                <strong>BDT {product.price}</strong>
              </div>
              <div className="quantity-control">
                <button className="icon-button" onClick={() => cart.update(product.id, quantity - 1)} aria-label="Decrease quantity"><Minus size={16} /></button>
                <span>{quantity}</span>
                <button className="icon-button" onClick={() => cart.update(product.id, quantity + 1)} aria-label="Increase quantity"><Plus size={16} /></button>
              </div>
              <button className="icon-button danger" onClick={() => cart.remove(product.id)} aria-label={`Remove ${product.name}`}><Trash2 size={17} /></button>
            </article>
          ))}
        </div>
        <aside className="summary-panel">
          <h2>Order estimate</h2>
          <div><span>Items</span><span>{cart.count}</span></div>
          <div><span>Estimated total</span><strong>BDT {total.toFixed(2)}</strong></div>
          <p>The backend recalculates authoritative prices and totals when the order is created.</p>
          <Link className="primary-button full" to="/checkout">Continue to checkout <ChevronRight size={17} /></Link>
        </aside>
      </div>
    </div>
  )
}

export function CheckoutPage() {
  const cart = useCart()
  const navigate = useNavigate()
  const [provider, setProvider] = useState<'stripe' | 'bkash'>('stripe')
  const [order, setOrder] = useState<Order | null>(null)
  const [payment, setPayment] = useState<{
    id: string
    transactionId: string
    clientSecret?: string
    redirectUrl?: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const stripePromise = useMemo(
    () => (stripePublishableKey ? loadStripe(stripePublishableKey) : null),
    [],
  )

  const begin = async () => {
    if (provider === 'stripe' && !stripePublishableKey) {
      setError('Stripe publishable key is not configured')
      return
    }
    setLoading(true)
    setError('')
    try {
      let currentOrder = order
      if (!currentOrder) {
        const response = await api.post<ApiResponse<Order>>('/orders', {
          items: cart.items.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
        })
        currentOrder = response.data.data
        setOrder(currentOrder)
      }
      const response = await api.post<
        ApiResponse<{
          payment: { id: string; transactionId: string }
          clientSecret?: string
          redirectUrl?: string
        }>
      >(`/orders/${currentOrder.id}/checkout`, { provider })
      setPayment({
        ...response.data.data.payment,
        clientSecret: response.data.data.clientSecret,
        redirectUrl: response.data.data.redirectUrl,
      })
    } catch (checkoutError) {
      setError(apiErrorMessage(checkoutError))
    } finally {
      setLoading(false)
    }
  }

  const verifyMockOrBkash = async () => {
    if (!payment) return
    setLoading(true)
    try {
      if (provider === 'stripe') {
        await api.post('/payments/stripe/verify', { transactionId: payment.transactionId })
      } else {
        await api.post('/payments/bkash/execute', { paymentId: payment.transactionId })
      }
      cart.clear()
      navigate(`/orders/${order!.id}`, { replace: true })
    } catch (verifyError) {
      setError(apiErrorMessage(verifyError))
    } finally {
      setLoading(false)
    }
  }

  if (!cart.items.length && !order) {
    return <EmptyState title="Nothing to check out" detail="Add products to your cart first." />
  }
  return (
    <div className="page-stack checkout-page">
      <Link to="/cart" className="back-link"><ArrowLeft size={17} /> Back to cart</Link>
      <PageTitle title="Checkout" detail="Create an order, then complete a provider-verified payment." />
      {error ? <ErrorState message={error} /> : null}
      <div className="checkout-layout">
        <section>
          <h2>Payment method</h2>
          <div className="provider-control">
            <button className={provider === 'stripe' ? 'active' : ''} onClick={() => setProvider('stripe')} disabled={Boolean(payment)}><CreditCard size={20} /><span><strong>Stripe</strong><small>Card payment</small></span></button>
            <button className={provider === 'bkash' ? 'active' : ''} onClick={() => setProvider('bkash')} disabled={Boolean(payment)}><Smartphone size={20} /><span><strong>bKash</strong><small>Mobile checkout</small></span></button>
          </div>
          {!payment ? (
            <button className="primary-button" onClick={begin} disabled={loading}>
              {loading ? 'Preparing payment...' : 'Create order and continue'}
            </button>
          ) : null}
          {payment?.clientSecret && !payment.clientSecret.includes('_mock') ? (
            <Elements stripe={stripePromise} options={{ clientSecret: payment.clientSecret }}>
              <StripeConfirmation
                orderId={order!.id}
                onError={setError}
                onComplete={() => cart.clear()}
              />
            </Elements>
          ) : null}
          {payment && (provider === 'bkash' || payment.clientSecret?.includes('_mock')) ? (
            <div className="payment-ready">
              <CheckCircle2 size={22} />
              <div><strong>Payment session ready</strong><span>{payment.transactionId}</span></div>
              <button className="primary-button" onClick={verifyMockOrBkash} disabled={loading}>
                {provider === 'bkash' ? 'Execute bKash payment' : 'Verify test payment'}
              </button>
            </div>
          ) : null}
        </section>
        <aside className="summary-panel">
          <h2>Order summary</h2>
          {cart.items.map((item) => (
            <div key={item.product.id}><span>{item.product.name} × {item.quantity}</span><span>BDT {(Number(item.product.price) * item.quantity).toFixed(2)}</span></div>
          ))}
          {order ? <div className="summary-total"><span>Server total</span><strong>BDT {order.totalAmount}</strong></div> : null}
        </aside>
      </div>
    </div>
  )
}

function StripeConfirmation({ orderId, onError, onComplete }: { orderId: string; onError: (message: string) => void; onComplete: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const submit = async () => {
    if (!stripe || !elements) return
    setSubmitting(true)
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/orders/${orderId}` },
      redirect: 'if_required',
    })
    if (result.error) {
      onError(result.error.message ?? 'Stripe confirmation failed')
    } else if (result.paymentIntent) {
      await api.post('/payments/stripe/verify', { transactionId: result.paymentIntent.id })
      onComplete()
      window.location.assign(`/orders/${orderId}`)
    }
    setSubmitting(false)
  }
  return (
    <div className="stripe-form">
      <PaymentElement />
      <button className="primary-button" onClick={submit} disabled={!stripe || submitting}>
        {submitting ? 'Confirming...' : 'Confirm card payment'}
      </button>
    </div>
  )
}

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    api.get<ApiResponse<Order[]>>('/users/me/orders')
      .then((response) => setOrders(response.data.data))
      .catch((loadError: unknown) => setError(apiErrorMessage(loadError)))
      .finally(() => setLoading(false))
  }, [])
  return (
    <div className="page-stack">
      <PageTitle title="Orders" detail="Your private order history and current status." />
      {error ? <ErrorState message={error} /> : null}
      {loading ? <LoadingState label="Loading orders" /> : null}
      {!loading && !orders.length ? <EmptyState title="No orders yet" detail="Completed checkouts will appear here." /> : null}
      <div className="data-list">
        {orders.map((order) => (
          <Link to={`/orders/${order.id}`} className="data-row" key={order.id}>
            <div><strong>Order {order.id.slice(0, 8)}</strong><span>{new Date(order.createdAt).toLocaleDateString()}</span></div>
            <span>{order.items.length} products</span>
            <strong>BDT {order.totalAmount}</strong>
            <StatusBadge status={order.status} />
            <ChevronRight size={18} />
          </Link>
        ))}
      </div>
    </div>
  )
}

export function OrderDetailsPage() {
  const { id = '' } = useParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    api.get<ApiResponse<Order>>(`/orders/${id}`)
      .then((response) => setOrder(response.data.data))
      .catch((loadError: unknown) => setError(apiErrorMessage(loadError)))
      .finally(() => setLoading(false))
  }, [id])
  if (loading) return <LoadingState label="Loading order" />
  if (error || !order) return <ErrorState message={error || 'Order not found'} />
  return (
    <div className="page-stack">
      <Link to="/orders" className="back-link"><ArrowLeft size={17} /> Back to orders</Link>
      <header className="page-header"><div><span className="eyebrow">Order {order.id}</span><h1>BDT {order.totalAmount}</h1><p>Created {new Date(order.createdAt).toLocaleString()}</p></div><StatusBadge status={order.status} /></header>
      <div className="line-items">
        {order.items.map((item) => (
          <article className="line-item" key={item.id}>
            <ProductVisual productKey={item.product.sku} />
            <div className="line-item-main"><h2>{item.product.name}</h2><span>{item.product.sku}</span><strong>BDT {item.price} × {item.quantity}</strong></div>
            <strong>BDT {item.subtotal}</strong>
          </article>
        ))}
      </div>
    </div>
  )
}

export function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    api.get<ApiResponse<Payment[]>>('/users/me/payments')
      .then((response) => setPayments(response.data.data))
      .catch((loadError: unknown) => setError(apiErrorMessage(loadError)))
      .finally(() => setLoading(false))
  }, [])
  return (
    <div className="page-stack">
      <PageTitle title="Payments" detail="Provider-verified transactions associated with your orders." />
      {error ? <ErrorState message={error} /> : null}
      {loading ? <LoadingState label="Loading payments" /> : null}
      {!loading && !payments.length ? <EmptyState title="No payments yet" detail="Payment attempts will appear here." /> : null}
      <div className="data-list">
        {payments.map((payment) => (
          <div className="data-row" key={payment.id}>
            <div><strong>{payment.provider}</strong><span>{payment.transactionId ?? 'Awaiting provider ID'}</span></div>
            <span>{new Date(payment.createdAt).toLocaleDateString()}</span>
            <strong>{payment.order ? `BDT ${payment.order.totalAmount}` : ''}</strong>
            <StatusBadge status={payment.status} />
          </div>
        ))}
      </div>
    </div>
  )
}

function PageTitle({ title, detail }: { title: string; detail: string }) {
  return <header className="page-header"><div><span className="eyebrow">Raco Supply</span><h1>{title}</h1><p>{detail}</p></div></header>
}
