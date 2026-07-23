import { PaymentStatus } from '@prisma/client'
import type { AxiosInstance } from 'axios'
import type Stripe from 'stripe'
import { BkashPaymentStrategy } from './bkash-payment.strategy'
import { StripePaymentStrategy } from './stripe-payment.strategy'

describe('payment provider strategies', () => {
  it('supports explicit Stripe mock mode without contacting Stripe', async () => {
    const stripe = new StripePaymentStrategy({
      secretKey: 'sk_test_mock',
      webhookSecret: 'whsec_mock',
      mockMode: true,
    })
    const initiated = await stripe.initiatePayment({
      orderId: 'order',
      amount: '10.00',
      currency: 'USD',
    })
    expect(initiated.status).toBe(PaymentStatus.PENDING)
    await expect(stripe.verifyPayment({ transactionId: initiated.transactionId })).resolves.toMatchObject({
      status: PaymentStatus.SUCCESS,
    })
  })

  it('normalizes Stripe provider verification', async () => {
    const retrieve = jest.fn().mockResolvedValue({
      id: 'pi_123',
      amount: 5000,
      amount_received: 5000,
      currency: 'usd',
      status: 'succeeded',
      metadata: { orderId: 'order-1' },
      last_payment_error: null,
    })
    const client = { paymentIntents: { retrieve } } as unknown as Stripe
    const strategy = new StripePaymentStrategy(
      { secretKey: 'sk_test_mock', webhookSecret: 'whsec_mock', mockMode: false },
      client,
    )
    await expect(strategy.verifyPayment({ transactionId: 'pi_123' })).resolves.toMatchObject({
      transactionId: 'pi_123',
      orderId: 'order-1',
      status: PaymentStatus.SUCCESS,
    })
  })

  it('caches bKash tokens and queries provider status', async () => {
    const post = jest
      .fn()
      .mockResolvedValueOnce({ data: { id_token: 'token', expires_in: 3600 } })
      .mockResolvedValueOnce({
        data: {
          paymentID: 'bkash-1',
          transactionStatus: 'Completed',
          merchantInvoiceNumber: 'order-1',
        },
      })
      .mockResolvedValueOnce({
        data: { paymentID: 'bkash-1', transactionStatus: 'Completed' },
      })
    const strategy = new BkashPaymentStrategy(
      {
        baseUrl: 'https://example.test',
        appKey: 'key',
        appSecret: 'secret',
        username: 'user',
        password: 'password',
        callbackUrl: 'https://client.test/callback',
        mockMode: false,
      },
      { post } as unknown as AxiosInstance,
    )
    await strategy.verifyPayment({ transactionId: 'bkash-1' })
    await strategy.verifyPayment({ transactionId: 'bkash-1' })
    expect(post).toHaveBeenCalledTimes(3)
    expect(post.mock.calls.filter(([url]) => String(url).includes('/token/grant'))).toHaveLength(1)
  })
})
