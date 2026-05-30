/* global jest */

const {beforeEach, describe, expect, it} = global

jest.mock('@controleonline/ui-common/src/react/utils/systemErrorChannel', () => ({
  publishSystemError: jest.fn(() => true),
}))

const {publishSystemError} = require('@controleonline/ui-common/src/react/utils/systemErrorChannel')
const {
  bridgeStoreError,
  isStoreErrorMutation,
  shouldSkipStoreErrorMutation,
} = require('../../../react/stores/storeErrorBridge')

describe('storeErrorBridge', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('recognizes store error mutations by suffix and ignores empty payloads', () => {
    expect(isStoreErrorMutation('SET_ERROR', 'Falha')).toBe(true)
    expect(isStoreErrorMutation('LOGIN_SET_ERROR', 'Falha')).toBe(true)
    expect(isStoreErrorMutation('SET_ERROR', '')).toBe(false)
    expect(isStoreErrorMutation('SET_ITEMS', 'Falha')).toBe(false)
  })

  it('allows a caller to suppress the shared visual error for locally handled flows', () => {
    expect(shouldSkipStoreErrorMutation({skipSystemError: true})).toBe(true)
    expect(isStoreErrorMutation('SET_ERROR', 'Falha', {skipSystemError: true})).toBe(false)
  })

  it('publishes canonical visual errors for store mutations', () => {
    expect(
      bridgeStoreError({
        storeName: 'invoice',
        mutationType: 'SET_ERROR',
        error: 'Nao foi possivel gerar a cobranca.',
      }),
    ).toBe(true)

    expect(publishSystemError).toHaveBeenCalledWith(
      'Nao foi possivel gerar a cobranca.',
      expect.objectContaining({
        source: 'store',
        storeName: 'invoice',
        mutationType: 'SET_ERROR',
      }),
    )
  })

  it('does not publish when the store caller opted to handle the error locally', () => {
    expect(
      bridgeStoreError({
        storeName: 'phones',
        mutationType: 'SET_ERROR',
        error: 'Item not found for "/people/30".',
        options: {
          skipSystemError: true,
        },
      }),
    ).toBe(false)

    expect(publishSystemError).not.toHaveBeenCalled()
  })
})
