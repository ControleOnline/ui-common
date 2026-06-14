const {
  isGatewayFreePayment,
  shouldBypassGatewayForPayment,
} = require('../../../react/utils/cashPayment')

const {describe, expect, it} = global

describe('cashPayment gateway bypass rules', () => {
  it('treats DINHEIRO as a gateway-free payment even when a payment code exists', () => {
    const payment = {
      wallet: {id: 1},
      paymentCode: 'DINHEIRO',
      paymentType: {id: 22, paymentType: 'Dinheiro'},
    }

    expect(shouldBypassGatewayForPayment(payment)).toBe(true)
    expect(isGatewayFreePayment(payment)).toBe(true)
  })

  it('treats courtesy voucher as a gateway-free payment', () => {
    const payment = {
      wallet: {id: 1},
      paymentCode: 'VOUCHER_CORTESIA',
      paymentType: {id: 12, paymentType: 'Cartão Gratidão'},
    }

    expect(shouldBypassGatewayForPayment(payment)).toBe(true)
    expect(isGatewayFreePayment(payment)).toBe(true)
  })

  it('keeps card payments integrated when they have a real gateway code', () => {
    const payment = {
      wallet: {id: 1},
      paymentCode: 'CREDITO_AVISTA',
      paymentType: {id: 8, paymentType: 'Crédito à Vista'},
    }

    expect(shouldBypassGatewayForPayment(payment)).toBe(false)
    expect(isGatewayFreePayment(payment)).toBe(false)
  })
})
