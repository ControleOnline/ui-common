const {jest} = require('@jest/globals')

jest.mock('../../../react/utils/screenMetrics', () => ({
  appendScreenMetrics: configs => configs,
  hasScreenMetricsChanges: () => false,
}))

const {
  buildProviderManagedDeviceConfigs,
  DEVICE_ANDROID_KIOSK_ENABLED_CONFIG_KEY,
  DISPLAY_SIZE_CONFIG_KEY,
  DISPLAY_SIZE_DEFAULT,
  DISPLAY_SIZE_MAX,
  DISPLAY_SIZE_MIN,
  DISPLAY_SIDE_BREAK_CONFIG_KEY,
  POS_AUTO_PRINT_ENABLED_CONFIG_KEY,
  POS_CASH_MANAGEMENT_MODE_CONFIG_KEY,
  POS_DELIVERY_ENABLED_CONFIG_KEY,
  POS_OPERATION_MODE_CONFIG_KEY,
  isPosSingleItemMode,
  isPosAutoPrintEnabled,
  isPosCashRegisterClosed,
  isPosCashRegisterOpen,
  isPosCounterMode,
  isPosDeliveryEnabled,
  isPosSelfServiceMode,
  isDisplaySideBreakEnabled,
  normalizeDisplaySize,
  resolveDisplaySize,
  resolvePosCashManagementMode,
  resolvePosOperationMode,
  resolvePosPrintMode,
  shouldEnableAndroidKioskMode,
  shouldUsePosCashRegisterLifecycle,
  isPosTotemMode,
} = require('../../../react/config/deviceConfigBootstrap')

const {describe, expect, it} = global

describe('deviceConfigBootstrap POS operation helpers', () => {
  it('normalizes balcão as counter and treats counter as self service', () => {
    const configs = {
      [POS_OPERATION_MODE_CONFIG_KEY]: 'balcao',
    }

    expect(resolvePosOperationMode(configs)).toBe('counter')
    expect(isPosCounterMode(configs)).toBe(true)
    expect(isPosSelfServiceMode(configs)).toBe(true)
  })

  it('normalizes venda unitaria as single-item mode', () => {
    const configs = {
      [POS_OPERATION_MODE_CONFIG_KEY]: 'venda unitaria',
    }

    expect(resolvePosOperationMode(configs)).toBe('single-item')
    expect(isPosSingleItemMode(configs)).toBe(true)
    expect(isPosSelfServiceMode(configs)).toBe(false)
  })

  it('keeps counter auto print disabled by default and allows explicit enablement', () => {
    const counterConfigs = {
      [POS_OPERATION_MODE_CONFIG_KEY]: 'counter',
    }

    expect(isPosAutoPrintEnabled(counterConfigs)).toBe(false)

    expect(
      isPosAutoPrintEnabled({
        ...counterConfigs,
        [POS_AUTO_PRINT_ENABLED_CONFIG_KEY]: '1',
      }),
    ).toBe(true)
  })

  it('defaults non-counter modes to auto print enabled', () => {
    expect(
      isPosAutoPrintEnabled({
        [POS_OPERATION_MODE_CONFIG_KEY]: 'cashier',
      }),
    ).toBe(true)
  })

  it('resolves counter daily close mode and skips cash register lifecycle', () => {
    const configs = {
      [POS_OPERATION_MODE_CONFIG_KEY]: 'counter',
      [POS_CASH_MANAGEMENT_MODE_CONFIG_KEY]: 'daily',
    }

    expect(resolvePosCashManagementMode(configs)).toBe('daily')
    expect(shouldUsePosCashRegisterLifecycle(configs)).toBe(false)
    expect(isPosCashRegisterOpen(configs)).toBe(true)
    expect(isPosCashRegisterClosed(configs)).toBe(false)
  })

  it('requires cash register lifecycle for counter with open/close policy', () => {
    const closedConfigs = {
      [POS_OPERATION_MODE_CONFIG_KEY]: 'counter',
      [POS_CASH_MANAGEMENT_MODE_CONFIG_KEY]: 'cash-register',
      'cash-wallet-closed-id': 1,
    }

    expect(shouldUsePosCashRegisterLifecycle(closedConfigs)).toBe(true)
    expect(isPosCashRegisterClosed(closedConfigs)).toBe(true)

    expect(
      isPosCashRegisterOpen({
        ...closedConfigs,
        'cash-wallet-closed-id': 0,
      }),
    ).toBe(true)
  })

  it('keeps empty configs open until the runtime loads the real cash register state', () => {
    expect(isPosCashRegisterOpen({})).toBe(true)
    expect(isPosCashRegisterClosed({})).toBe(false)
  })

  it('keeps configs without cash-wallet-closed-id open during provider bootstrap', () => {
    const configs = {
      [POS_OPERATION_MODE_CONFIG_KEY]: 'cashier',
      'config-version': '1.0.0',
      'pos-gateway': 'cielo',
    }

    expect(isPosCashRegisterOpen(configs)).toBe(true)
    expect(isPosCashRegisterClosed(configs)).toBe(false)
  })

  it('preserves a manually configured pos gateway during provider sync', () => {
    const {nextConfigs, needsUpdate} = buildProviderManagedDeviceConfigs({
      appVersion: '1.3.74',
      configs: {
        'config-version': '1.3.74',
        'pos-gateway': 'cielo',
      },
      deviceInfo: {
        isEmulator: true,
        manufacturer: 'Google',
      },
    })

    expect(nextConfigs['pos-gateway']).toBe('cielo')
    expect(needsUpdate).toBe(false)
  })

  it('keeps totem without cash register lifecycle and normalizes print mode', () => {
    const configs = {
      [POS_OPERATION_MODE_CONFIG_KEY]: 'totem',
      'print-mode': 'form',
    }

    expect(resolvePosOperationMode(configs)).toBe('totem')
    expect(isPosTotemMode(configs)).toBe(true)
    expect(shouldUsePosCashRegisterLifecycle(configs)).toBe(false)
    expect(resolvePosPrintMode(configs)).toBe('form')
  })

  it('does not accept the legacy kiosk operation mode value', () => {
    expect(
      resolvePosOperationMode({
        [POS_OPERATION_MODE_CONFIG_KEY]: 'kiosk',
      }),
    ).toBe('')
    expect(
      isPosTotemMode({
        [POS_OPERATION_MODE_CONFIG_KEY]: 'kiosk',
      }),
    ).toBe(false)
  })

  it('defaults display size to 5 and clamps the configured range to 1..10', () => {
    expect(resolveDisplaySize({})).toBe(DISPLAY_SIZE_DEFAULT)
    expect(
      resolveDisplaySize({
        [DISPLAY_SIZE_CONFIG_KEY]: '1',
      }),
    ).toBe(DISPLAY_SIZE_MIN)
    expect(
      normalizeDisplaySize('18'),
    ).toBe(DISPLAY_SIZE_MAX)
  })

  it('treats display side break as an explicit boolean flag', () => {
    expect(isDisplaySideBreakEnabled({})).toBe(false)
    expect(
      isDisplaySideBreakEnabled({
        [DISPLAY_SIDE_BREAK_CONFIG_KEY]: '1',
      }),
    ).toBe(true)
  })

  it('does not enable Android kiosk without the explicit device flag', () => {
    expect(
      shouldEnableAndroidKioskMode({
        appType: 'POS',
        configs: {
          [POS_OPERATION_MODE_CONFIG_KEY]: 'totem',
        },
        platform: 'android',
      }),
    ).toBe(false)

    expect(
      shouldEnableAndroidKioskMode({
        appType: 'POS',
        configs: {
          [POS_OPERATION_MODE_CONFIG_KEY]: 'totem',
        },
        platform: 'android',
      }),
    ).toBe(false)
  })

  it('respects the explicit Android kiosk flag independently of the operation mode', () => {
    expect(
      shouldEnableAndroidKioskMode({
        appType: 'POS',
        configs: {
          [POS_OPERATION_MODE_CONFIG_KEY]: 'counter',
          [DEVICE_ANDROID_KIOSK_ENABLED_CONFIG_KEY]: '1',
        },
        platform: 'android',
      }),
    ).toBe(true)

    expect(
      shouldEnableAndroidKioskMode({
        appType: 'POS',
        configs: {
          [POS_OPERATION_MODE_CONFIG_KEY]: 'totem',
          [DEVICE_ANDROID_KIOSK_ENABLED_CONFIG_KEY]: '0',
        },
        platform: 'android',
      }),
    ).toBe(false)

    expect(
      shouldEnableAndroidKioskMode({
        appType: 'MANAGER',
        configs: {
          [POS_OPERATION_MODE_CONFIG_KEY]: 'counter',
          [DEVICE_ANDROID_KIOSK_ENABLED_CONFIG_KEY]: '1',
        },
        platform: 'android',
      }),
    ).toBe(false)

    expect(
      shouldEnableAndroidKioskMode({
        appType: 'POS',
        configs: {
          [POS_OPERATION_MODE_CONFIG_KEY]: 'counter',
          [DEVICE_ANDROID_KIOSK_ENABLED_CONFIG_KEY]: '1',
        },
        platform: 'web',
      }),
    ).toBe(false)
  })

  it('keeps delivery enabled by default and respects explicit disablement', () => {
    expect(isPosDeliveryEnabled({})).toBe(true)
    expect(
      isPosDeliveryEnabled({
        [POS_DELIVERY_ENABLED_CONFIG_KEY]: '0',
      }),
    ).toBe(false)
    expect(
      isPosDeliveryEnabled({
        [POS_DELIVERY_ENABLED_CONFIG_KEY]: '1',
      }),
    ).toBe(true)
  })
})
