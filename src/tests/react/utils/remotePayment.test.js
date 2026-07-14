const {
  buildRemotePaymentResultMessage,
  isRemotePaymentCancellation,
  normalizeRemotePaymentResultStatus,
} = require('../../../react/utils/remotePayment')

const {describe, expect, it} = global

describe('remotePayment result status', () => {
  it.each(['canceled', 'cancelled', 'cancel'])(
    'normalizes the explicit %s status as a cancellation',
    status => {
      expect(normalizeRemotePaymentResultStatus({status})).toBe('canceled')
      expect(isRemotePaymentCancellation({status})).toBe(true)
    },
  )

  it.each([
    'Pagamento PIX cancelado pelo usuario.',
    'Pagamento cancelado pelo usuário',
    'Payment cancelled by user',
    'Payment canceled by customer',
  ])('recognizes legacy cancellation errors: %s', error => {
    const result = {status: 'error', error}

    expect(normalizeRemotePaymentResultStatus(result)).toBe('canceled')
    expect(isRemotePaymentCancellation(result)).toBe(true)
  })

  it.each([
    'Falha de comunicacao com o terminal.',
    'Nao foi possivel cancelar a transacao.',
    'Tempo limite excedido.',
  ])('keeps a real gateway failure as an error: %s', error => {
    const result = {status: 'error', error}

    expect(normalizeRemotePaymentResultStatus(result)).toBe('error')
    expect(isRemotePaymentCancellation(result)).toBe(false)
  })

  it('preserves cancellation when building the remote result message', () => {
    expect(
      buildRemotePaymentResultMessage({
        destinationDeviceId: 'web-7',
        orderId: 123,
        requestKey: '123:158:pix:1',
        status: 'cancelled',
      }),
    ).toMatchObject({
      action: 'pay-result',
      destination: 'web-7',
      order: '123',
      requestKey: '123:158:pix:1',
      status: 'canceled',
    })
  })

  it('keeps successful and unknown results compatible with the existing contract', () => {
    expect(normalizeRemotePaymentResultStatus({status: 'success'})).toBe('success')
    expect(normalizeRemotePaymentResultStatus({status: 'unexpected'})).toBe('error')
  })
})
