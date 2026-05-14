/* global jest */

const {beforeEach, describe, expect, it} = global

const {
  publishSystemError,
  subscribeSystemErrors,
  resetSystemErrorChannel,
  DEFAULT_SYSTEM_ERROR_DEDUPE_WINDOW_MS,
} = require('../../../react/utils/systemErrorChannel')

describe('systemErrorChannel', () => {
  beforeEach(() => {
    resetSystemErrorChannel()
    jest.restoreAllMocks()
  })

  it('queues store and manual errors until the presenter subscribes', () => {
    expect(publishSystemError('Falha ao salvar')).toBe(true)

    const received = []

    const unsubscribe = subscribeSystemErrors(payload => {
      received.push(payload)
    })

    expect(received).toEqual([
      expect.objectContaining({
        message: 'Falha ao salvar',
      }),
    ])

    unsubscribe()
  })

  it('deduplicates the same transient error inside the shared time window', () => {
    const nowSpy = jest.spyOn(Date, 'now')
    nowSpy.mockReturnValue(1000)

    const received = []
    const unsubscribe = subscribeSystemErrors(payload => {
      received.push(payload.message)
    })

    expect(publishSystemError('Erro de sincronizacao')).toBe(true)
    expect(publishSystemError('Erro de sincronizacao')).toBe(false)

    nowSpy.mockReturnValue(1000 + DEFAULT_SYSTEM_ERROR_DEDUPE_WINDOW_MS + 1)

    expect(publishSystemError('Erro de sincronizacao')).toBe(true)
    expect(received).toEqual([
      'Erro de sincronizacao',
      'Erro de sincronizacao',
    ])

    unsubscribe()
  })
})
