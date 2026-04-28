const {jest} = require('@jest/globals')

jest.mock('../../../react/utils/screenMetrics', () => ({
  appendScreenMetrics: configs => configs,
  hasScreenMetricsChanges: () => false,
}))

const {
  DISPLAY_SIDE_BREAK_CONFIG_KEY,
  DISPLAY_SIZE_CONFIG_KEY,
  POS_AUTO_PRINT_ENABLED_CONFIG_KEY,
  POS_CASH_MANAGEMENT_MODE_CONFIG_KEY,
  POS_OPERATION_MODE_CONFIG_KEY,
  isDisplaySideBreakEnabled,
  isPosAutoPrintEnabled,
  isPosCashRegisterClosed,
  isPosCashRegisterOpen,
  isPosCounterMode,
  isPosSelfServiceMode,
  resolveDisplaySize,
  resolvePosCashManagementMode,
  resolvePosOperationMode,
  resolvePosPrintMode,
  shouldUsePosCashRegisterLifecycle,
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

  it('keeps kiosk without cash register lifecycle and normalizes print mode', () => {
    const configs = {
      [POS_OPERATION_MODE_CONFIG_KEY]: 'kiosk',
      'print-mode': 'form',
    }

    expect(shouldUsePosCashRegisterLifecycle(configs)).toBe(false)
    expect(resolvePosPrintMode(configs)).toBe('form')
  })

  it('defaults display size to 5 and clamps the configured range to 1..10', () => {
    expect(resolveDisplaySize({})).toBe(5)
    expect(
      resolveDisplaySize({
        [DISPLAY_SIZE_CONFIG_KEY]: '1',
      }),
    ).toBe(1)
    expect(
      resolveDisplaySize({
        [DISPLAY_SIZE_CONFIG_KEY]: '18',
      }),
    ).toBe(10)
  })

  it('treats display side break as an explicit boolean flag', () => {
    expect(isDisplaySideBreakEnabled({})).toBe(false)
    expect(
      isDisplaySideBreakEnabled({
        [DISPLAY_SIDE_BREAK_CONFIG_KEY]: '1',
      }),
    ).toBe(true)
  })
})
