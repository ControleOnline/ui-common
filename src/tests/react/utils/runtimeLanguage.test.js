const assert = require('node:assert/strict')
const test = require('node:test')

const {
  normalizeLanguageCode,
  resolveCompanyLanguageCode,
  resolveConfiguredLanguage,
} = require('../../../react/utils/runtimeLanguage')

test('normalizes language separators and casing', () => {
  assert.equal(normalizeLanguageCode(' PT_BR '), 'pt-br')
})

test('reads the current company language from nested company settings first', () => {
  assert.equal(
    resolveCompanyLanguageCode({
      language: {
        locale: 'en_US',
      },
    }),
    'en-us',
  )
})

test('prefers the selected company language over cached config and session values', () => {
  assert.equal(
    resolveConfiguredLanguage({
      currentCompany: {
        language: {
          code: 'en_US',
        },
      },
      defaultCompany: {
        language: {
          code: 'pt_BR',
        },
      },
      currentConfig: {
        language: 'es-es',
      },
      sessionData: {
        language: 'fr-fr',
      },
    }),
    'en-us',
  )
})

test('falls back through default company, config, session and the hardcoded default', () => {
  assert.equal(
    resolveConfiguredLanguage({
      defaultCompany: {
        configs: {
          language: 'de_DE',
        },
      },
    }),
    'de-de',
  )

  assert.equal(
    resolveConfiguredLanguage({
      currentConfig: {
        language: 'it_IT',
      },
    }),
    'it-it',
  )

  assert.equal(
    resolveConfiguredLanguage({
      sessionData: {
        language: 'nl_NL',
      },
    }),
    'nl-nl',
  )

  assert.equal(resolveConfiguredLanguage({}), 'pt-br')
})
