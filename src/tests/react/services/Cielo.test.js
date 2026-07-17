const {jest} = require('@jest/globals')

const mockPayment = jest.fn()
const mockFetch = jest.fn()
const mockGetAllStores = jest.fn()

jest.mock('@controleonline-rn/react-native-cielo-payment', () => ({
  payment: (...args) => mockPayment(...args),
}))

jest.mock('@controleonline/ui-common/src/api', () => ({
  api: {
    fetch: (...args) => mockFetch(...args),
  },
}))

jest.mock('@store', () => ({
  getAllStores: (...args) => mockGetAllStores(...args),
}))

jest.mock('@env', () => ({
  env: {
    CIELO: {
      ACCESS_TOKEN: '',
      CLIENT_ID: '',
      EMAIL: '',
      MERCHANT_CODE: '',
    },
  },
}))

const {describe, expect, it, beforeEach} = global

const loadService = () => {
  const serviceModule = require('../../../react/services/Cielo/Cielo')
  return serviceModule.default || serviceModule
}

const runtimeStores = merchantCode => ({
  people: {
    getters: {
      currentCompany: {
        id: 99,
        configs: {
          CIELO: JSON.stringify({
            ACCESS_TOKEN: 'runtime-token',
            CLIENT_ID: 'runtime-client',
            EMAIL: 'runtime@empresa.com',
            ...(merchantCode ? {MERCHANT_CODE: merchantCode} : {}),
          }),
        },
      },
      defaultCompany: {id: 99},
    },
  },
  configs: {
    getters: {
      items: {
        CIELO: JSON.stringify({
          ACCESS_TOKEN: 'runtime-token',
          CLIENT_ID: 'runtime-client',
          EMAIL: 'runtime@empresa.com',
          ...(merchantCode ? {MERCHANT_CODE: merchantCode} : {}),
        }),
      },
    },
  },
})

describe('CieloService', () => {
  beforeEach(() => {
    jest.resetModules()
    mockPayment.mockReset()
    mockFetch.mockReset()
    mockGetAllStores.mockReset()

    mockPayment.mockResolvedValue({
      success: true,
      code: '0',
      result: JSON.stringify({
        status: 'ok',
        payments: [{merchantCode: '0000000000000001'}],
      }),
    })
  })

  it('falls back to the main company private CIELO config', async () => {
    mockGetAllStores.mockReturnValue({
      people: {
        getters: {
          currentCompany: {id: 21, configs: {}},
          defaultCompany: {id: 99},
        },
      },
      configs: {getters: {items: {}}},
    })
    mockFetch.mockResolvedValue({
      member: [
        {
          configKey: 'CIELO',
          configValue: JSON.stringify({
            ACCESS_TOKEN: 'private-token',
            CLIENT_ID: 'private-client',
            EMAIL: 'cielo@principal.com',
            MERCHANT_CODE: '0000000000000001',
          }),
        },
      ],
    })

    const CieloService = loadService()
    await new CieloService().payment('credit', [{name: 'Produto'}], 1250)

    expect(mockFetch).toHaveBeenCalledWith('/configs', {
      params: {
        configKey: 'CIELO',
        people: '/people/99',
        visibility: 'private',
      },
    })
    expect(JSON.parse(mockPayment.mock.calls[0][0])).toMatchObject({
      accessToken: 'private-token',
      clientID: 'private-client',
      email: 'cielo@principal.com',
      merchantCode: '0000000000000001',
      paymentCode: 'credit',
      value: 1250,
    })
  })

  it('sends the configured merchantCode to Cielo', async () => {
    mockGetAllStores.mockReturnValue(runtimeStores('0000000000000001'))

    const CieloService = loadService()
    await new CieloService().payment('debit', [], 500)

    expect(mockFetch).not.toHaveBeenCalled()
    expect(JSON.parse(mockPayment.mock.calls[0][0])).toMatchObject({
      merchantCode: '0000000000000001',
      paymentCode: 'debit',
      value: 500,
    })
  })

  it('keeps the legacy request when merchantCode is not configured', async () => {
    mockGetAllStores.mockReturnValue(runtimeStores(''))

    const CieloService = loadService()
    await new CieloService().payment('debit', [], 500)

    expect(JSON.parse(mockPayment.mock.calls[0][0])).not.toHaveProperty(
      'merchantCode',
    )
  })

  it('rejects a successful response without merchantCode', async () => {
    mockGetAllStores.mockReturnValue(runtimeStores('0000000000000001'))
    mockPayment.mockResolvedValue({
      success: true,
      code: '0',
      result: JSON.stringify({status: 'ok', payments: [{}]}),
    })

    const CieloService = loadService()
    const response = await new CieloService().payment('debit', [], 500)

    expect(response.success).toBe(false)
  })

  it('rejects a successful response from a different merchantCode', async () => {
    mockGetAllStores.mockReturnValue(runtimeStores('0000000000000001'))
    mockPayment.mockResolvedValue({
      success: true,
      code: '0',
      result: JSON.stringify({
        status: 'ok',
        payments: [{merchantCode: '0000000000000002'}],
      }),
    })

    const CieloService = loadService()
    const response = await new CieloService().payment('debit', [], 500)

    expect(response).toMatchObject({
      success: false,
      result:
        'Pagamento processado em estabelecimento Cielo diferente do configurado.',
    })
  })
})
