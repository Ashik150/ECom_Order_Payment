import Decimal from 'decimal.js'

export interface PricedOrderItem {
  productId: string
  quantity: number
  unitPrice: Decimal.Value
}

export interface CalculatedOrderItem {
  productId: string
  quantity: number
  price: string
  subtotal: string
}

export interface CalculatedOrder {
  items: CalculatedOrderItem[]
  total: string
}

export class OrderCalculator {
  calculate(items: PricedOrderItem[]): CalculatedOrder {
    const calculatedItems = items.map((item) => {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new Error('Order quantity must be a positive integer')
      }
      const price = new Decimal(item.unitPrice).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
      if (price.isNegative()) throw new Error('Order price cannot be negative')
      return {
        productId: item.productId,
        quantity: item.quantity,
        price: price.toFixed(2),
        subtotal: price.mul(item.quantity).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2),
      }
    })
    const total = calculatedItems
      .reduce((sum, item) => sum.plus(item.subtotal), new Decimal(0))
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
      .toFixed(2)
    return { items: calculatedItems, total }
  }
}
