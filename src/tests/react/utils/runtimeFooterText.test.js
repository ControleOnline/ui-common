const assert = require('node:assert/strict')
const {test} = require('node:test')

const {
  getRuntimeFooterRotationEntries,
  getRuntimeFooterText,
  getRuntimeFooterTextLines,
} = require('../../../react/utils/runtimeFooterText')

test('rotates a single footer line then primary without concatenating', () => {
  const line = 'www.controleonline.com (11) 5555-5159'
  const primaryText = 'web (203.0.113.42) / v1.3.6'
  const entries = getRuntimeFooterRotationEntries({
    companyFooterText: line,
    primaryText,
  })

  assert.deepEqual(entries, [line, primaryText])
  assert.equal(entries.some(entry => entry.includes(' • ')), false)
})

test('does not invent rotation entries when footer text is empty', () => {
  assert.deepEqual(
    getRuntimeFooterRotationEntries({
      companyFooterText: '',
      primaryText: 'PDV (229252771069b294) / v1.3.7',
    }),
    ['PDV (229252771069b294) / v1.3.7'],
  )
})

test('keeps multi-line rotation plus primary', () => {
  assert.deepEqual(
    getRuntimeFooterRotationEntries({
      companyFooterText: 'www.site.com\n(11) 99999-9999',
      primaryText: 'web (203.0.113.42) / v1.3.6',
    }),
    ['www.site.com', '(11) 99999-9999', 'web (203.0.113.42) / v1.3.6'],
  )
})

test('reads footer text from currentCompany map configs', () => {
  assert.equal(
    getRuntimeFooterText({
      configs: {
        'device-runtime-footer-text': 'Linha currentCompany',
      },
    }),
    'Linha currentCompany',
  )
})

test('falls back to extra configs when company has no footer text', () => {
  assert.equal(
    getRuntimeFooterText(
      {configs: {}},
      {
        'device-runtime-footer-text': 'Linha defaultCompany',
      },
    ),
    'Linha defaultCompany',
  )
})

test('reads footer text from device_config array configs', () => {
  assert.equal(
    getRuntimeFooterText(null, [
      {configKey: 'other', value: 'ignore'},
      {configKey: 'device-runtime-footer-text', value: 'Linha device_config array'},
    ]),
    'Linha device_config array',
  )
})

test('reads footer text from device_config map configs', () => {
  assert.equal(
    getRuntimeFooterText(undefined, {
      'device-runtime-footer-text': {configValue: 'Linha device_config map'},
    }),
    'Linha device_config map',
  )
})

test('returns empty string when footer text is absent', () => {
  assert.equal(getRuntimeFooterText({configs: {foo: 'bar'}}), '')
  assert.equal(getRuntimeFooterText(null, []), '')
  assert.deepEqual(getRuntimeFooterTextLines(''), [])
})
