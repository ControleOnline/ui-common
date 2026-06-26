const {jest} = require('@jest/globals')

jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
    select: options => options?.android,
  },
}))

const {describe, expect, it} = global

const {
  PAYMENT_TYPE_IDS_CONFIG_KEY,
  filterWalletPaymentTypesByAllowedIds,
  isLocalCieloPrintCapableDeviceConfig,
  resolveDevicePaymentTypeIds,
} = require('../../../react/utils/paymentDevices')

describe('paymentDevices local Cielo print support', () => {
  it('resolves the payment type allowlist from the new config key', () => {
    expect(
      resolveDevicePaymentTypeIds({
        configs: {
          [PAYMENT_TYPE_IDS_CONFIG_KEY]: [1, '2', '/payment_types/3'],
        },
      }),
    ).toEqual(['1', '2', '3'])
  })

  it('returns an empty list when no payment types are configured', () => {
    expect(resolveDevicePaymentTypeIds({})).toEqual([])
  })

  it('filters wallet payment types by association id instead of payment type id', () => {
    const paymentTypes = [
      {
        id: 11,
        wallet: {id: 1, wallet: 'Cielo'},
        paymentType: {id: 5, paymentType: 'Débito'},
      },
      {
        id: 12,
        wallet: {id: 2, wallet: 'Infinite Pay'},
        paymentType: {id: 5, paymentType: 'Débito'},
      },
      {
        id: 13,
        wallet: {id: 2, wallet: 'Infinite Pay'},
        paymentType: {id: 6, paymentType: 'PIX'},
      },
    ]

    expect(
      filterWalletPaymentTypesByAllowedIds(paymentTypes, [11, '13']),
    ).toEqual([paymentTypes[0], paymentTypes[2]])
  })

  it('allows local Cielo print only for PDV devices with Cielo gateway', () => {
    expect(
      isLocalCieloPrintCapableDeviceConfig({
        type: 'PDV',
        configs: {
          'pos-gateway': 'cielo',
        },
      }),
    ).toBe(true)
  })

  it('blocks local Cielo print for non-Cielo and non-PDV devices', () => {
    expect(
      isLocalCieloPrintCapableDeviceConfig({
        type: 'PDV',
        configs: {
          'pos-gateway': 'infinite-pay',
        },
      }),
    ).toBe(false)

    expect(
      isLocalCieloPrintCapableDeviceConfig({
        type: 'PRINT',
        configs: {
          'pos-gateway': 'cielo',
        },
      }),
    ).toBe(false)
  })
})
