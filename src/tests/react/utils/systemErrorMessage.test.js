const assert = require('node:assert/strict')
const test = require('node:test')

const {
  resolveSystemErrorMessage,
} = require('@controleonline/ui-common/src/react/utils/systemErrorMessage')

test('resolveSystemErrorMessage prefers problem-json detail messages when available', () => {
  assert.equal(
    resolveSystemErrorMessage({
      title: 'An error occurred',
      detail: 'Telefone ja cadastrado para outra pessoa.',
    }),
    'Telefone ja cadastrado para outra pessoa.',
  )
})

test('resolveSystemErrorMessage reads canonical hydra error envelopes', () => {
  assert.equal(
    resolveSystemErrorMessage({
      '@type': 'Error',
      'hydra:title': 'An error occurred',
      'hydra:description': 'Pedido sem endereco de entrega valido.',
    }),
    'Pedido sem endereco de entrega valido.',
  )
})

test('resolveSystemErrorMessage reads hydra envelopes nested under response data', () => {
  assert.equal(
    resolveSystemErrorMessage({
      response: {
        data: {
          '@type': 'Error',
          'hydra:description': 'Pedido sem endereco de entrega valido.',
        },
      },
    }),
    'Pedido sem endereco de entrega valido.',
  )
})

test('resolveSystemErrorMessage formats constraint violations into a readable multiline message', () => {
  assert.equal(
    resolveSystemErrorMessage({
      violations: [
        {propertyPath: 'ddd', message: 'DDD invalido.'},
        {propertyPath: 'phone', message: 'Telefone obrigatorio.'},
      ],
    }),
    'DDD invalido.\nTelefone obrigatorio.',
  )
})

test('resolveSystemErrorMessage accepts plain strings and legacy message arrays', () => {
  assert.equal(resolveSystemErrorMessage('Falha ao salvar.'), 'Falha ao salvar.')
  assert.equal(
    resolveSystemErrorMessage({
      message: [{message: 'Primeiro erro'}, {title: 'Segundo erro'}],
    }),
    'Primeiro erro\nSegundo erro',
  )
})

test('resolveSystemErrorMessage reads nested axios response payloads before the transport message', () => {
  assert.equal(
    resolveSystemErrorMessage({
      message: 'Request failed with status code 422',
      response: {
        data: {
          'hydra:description': 'Arquivo com colunas invalidas.',
        },
      },
    }),
    'Arquivo com colunas invalidas.',
  )
})
