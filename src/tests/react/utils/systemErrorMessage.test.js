const {describe, expect, it} = global

const {
  resolveSystemErrorMessage,
} = require('../../../react/utils/systemErrorMessage')

describe('systemErrorMessage', () => {
  it('prefers problem-json detail messages when available', () => {
    expect(
      resolveSystemErrorMessage({
        title: 'An error occurred',
        detail: 'Telefone ja cadastrado para outra pessoa.',
      }),
    ).toBe('Telefone ja cadastrado para outra pessoa.')
  })

  it('reads canonical hydra error envelopes', () => {
    expect(
      resolveSystemErrorMessage({
        '@type': 'Error',
        'hydra:title': 'An error occurred',
        'hydra:description': 'Pedido sem endereco de entrega valido.',
      }),
    ).toBe('Pedido sem endereco de entrega valido.')
  })

  it('reads hydra envelopes nested under response data', () => {
    expect(
      resolveSystemErrorMessage({
        response: {
          data: {
            '@type': 'Error',
            'hydra:description': 'Pedido sem endereco de entrega valido.',
          },
        },
      }),
    ).toBe('Pedido sem endereco de entrega valido.')
  })

  it('formats constraint violations into a readable multiline message', () => {
    expect(
      resolveSystemErrorMessage({
        violations: [
          {propertyPath: 'ddd', message: 'DDD invalido.'},
          {propertyPath: 'phone', message: 'Telefone obrigatorio.'},
        ],
      }),
    ).toBe('DDD invalido.\nTelefone obrigatorio.')
  })

  it('accepts plain strings and legacy message arrays', () => {
    expect(resolveSystemErrorMessage('Falha ao salvar.')).toBe('Falha ao salvar.')
    expect(
      resolveSystemErrorMessage({
        message: [{message: 'Primeiro erro'}, {title: 'Segundo erro'}],
      }),
    ).toBe('Primeiro erro\nSegundo erro')
  })
})
