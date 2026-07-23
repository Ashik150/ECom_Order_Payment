import type { PaymentProvider } from '@prisma/client'
import { AppError } from '../../../errors/app-error'
import type { PaymentStrategy } from './payment-strategy'

export class PaymentStrategyFactory {
  private readonly strategies: Map<PaymentProvider, PaymentStrategy>

  constructor(strategies: PaymentStrategy[]) {
    this.strategies = new Map(strategies.map((strategy) => [strategy.provider, strategy]))
  }

  resolve(provider: PaymentProvider): PaymentStrategy {
    const strategy = this.strategies.get(provider)
    if (!strategy) {
      throw new AppError(422, 'PAYMENT_PROVIDER_UNSUPPORTED', 'Payment provider is unsupported')
    }
    return strategy
  }
}
