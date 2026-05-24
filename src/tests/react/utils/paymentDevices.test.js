const {jest} = require('@jest/globals')

jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
    select: options => options?.android,
  },
}))

const {describe, expect, it} = global

const {
  isLocalCieloPrintCapableDeviceConfig,
} = require('../../../react/utils/paymentDevices')

describe('paymentDevices local Cielo print support', () => {
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
