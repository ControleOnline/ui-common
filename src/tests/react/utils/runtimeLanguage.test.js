const assert = require('node:assert/strict')
const {test} = require('node:test')

const {
  buildTranslationBootstrapKey,
  isTranslationBootstrapReady,
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

test('builds the translation bootstrap key only from language and company context', () => {
  assert.equal(
    buildTranslationBootstrapKey({
      language: ' PT_BR ',
      currentCompanyId: 21,
      defaultCompanyId: 1,
    }),
    'pt-br::21::1',
  )
  assert.equal(
    buildTranslationBootstrapKey({
      language: 'pt-br',
      currentCompanyId: '',
      defaultCompanyId: 1,
    }),
    '',
  )
})

test('keeps authenticated content blocked until the matching translator exists', () => {
  const context = {
    activeKey: 'pt-br::21::1',
    expectedKey: 'pt-br::21::1',
    required: true,
    ready: true,
  }

  assert.equal(
    isTranslationBootstrapReady({
      ...context,
      translator: undefined,
    }),
    false,
  )
  assert.equal(
    isTranslationBootstrapReady({
      ...context,
      activeKey: 'pt-br::3::1',
      translator: {t() {}},
    }),
    false,
  )
  assert.equal(
    isTranslationBootstrapReady({
      ...context,
      ready: false,
      translator: {t() {}},
    }),
    false,
  )
  assert.equal(
    isTranslationBootstrapReady({
      ...context,
      translator: {t() {}},
    }),
    true,
  )
})

test('does not block contexts where translation bootstrap is not required', () => {
  assert.equal(
    isTranslationBootstrapReady({
      required: false,
    }),
    true,
  )
})
