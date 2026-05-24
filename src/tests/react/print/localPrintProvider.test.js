const {jest} = require('@jest/globals')

const mockPrint = jest.fn()

jest.mock('@controleonline/ui-orders/src/react/services/Cielo/Print', () => ({
  CieloPrint: jest.fn().mockImplementation(() => ({
    print: mockPrint,
  })),
}))

const {describe, expect, it, beforeEach} = global

const {
  LOCAL_CIELO_PRINT_UNAVAILABLE_MESSAGE,
  printOnLocalCielo,
} = require('../../../react/print/providers/local')

describe('local print provider', () => {
  beforeEach(() => {
    mockPrint.mockReset()
  })

  it('normalizes missing local Cielo handler errors', async () => {
    mockPrint.mockResolvedValue({
      success: false,
      result:
        'No Activity found to handle Intent { act=android.intent.action.VIEW dat=lio://print/... }',
    })

    await expect(printOnLocalCielo('payload')).rejects.toThrow(
      LOCAL_CIELO_PRINT_UNAVAILABLE_MESSAGE,
    )
  })

  it('keeps explicit provider error messages when available', async () => {
    mockPrint.mockResolvedValue({
      success: false,
      result: 'Papel ausente.',
    })

    await expect(printOnLocalCielo('payload')).rejects.toThrow(
      'Papel ausente.',
    )
  })
})
