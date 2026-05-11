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
