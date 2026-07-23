import { PaymentProvider } from '@prisma/client'
import { PaymentStrategyFactory } from './payment-strategy.factory'
import type { PaymentStrategy } from './payment-strategy'

function strategy(provider: PaymentProvider): PaymentStrategy {
  return {
    provider,
    initiatePayment: jest.fn(),
    verifyPayment: jest.fn(),
    handleWebhook: jest.fn(),
  }
}

describe('PaymentStrategyFactory', () => {
  it('resolves each registered provider without conditional provider logic', () => {
    const stripe = strategy(PaymentProvider.STRIPE)
    const bkash = strategy(PaymentProvider.BKASH)
    const factory = new PaymentStrategyFactory([stripe, bkash])
    expect(factory.resolve(PaymentProvider.STRIPE)).toBe(stripe)
    expect(factory.resolve(PaymentProvider.BKASH)).toBe(bkash)
  })

  it('rejects an unregistered provider', () => {
    expect(() => new PaymentStrategyFactory([]).resolve(PaymentProvider.STRIPE)).toThrow(
      'unsupported',
    )
  })
})
