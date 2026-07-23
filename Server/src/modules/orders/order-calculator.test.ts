import { OrderCalculator } from './order-calculator'

describe('OrderCalculator', () => {
  const calculator = new OrderCalculator()

  it('calculates deterministic decimal-safe subtotals and totals', () => {
    expect(
      calculator.calculate([
        { productId: 'one', quantity: 3, unitPrice: '0.10' },
        { productId: 'two', quantity: 2, unitPrice: '19.995' },
      ]),
    ).toEqual({
      items: [
        { productId: 'one', quantity: 3, price: '0.10', subtotal: '0.30' },
        { productId: 'two', quantity: 2, price: '20.00', subtotal: '40.00' },
      ],
      total: '40.30',
    })
  })

  it.each([0, -1, 1.5])('rejects invalid quantity %s', (quantity) => {
    expect(() => calculator.calculate([{ productId: 'one', quantity, unitPrice: '1.00' }]))
      .toThrow('positive integer')
  })

  it('rejects negative prices', () => {
    expect(() =>
      calculator.calculate([{ productId: 'one', quantity: 1, unitPrice: '-0.01' }]),
    ).toThrow('cannot be negative')
  })
})
