const assert = require('node:assert/strict')
const test = require('node:test')

const {
  getImportErrorDetail,
  getImportStatusMeta,
  normalizeImportStatus,
  resolveImportLabels,
  resolveImportStatusLabel,
} = require('@controleonline/ui-common/src/react/utils/importStatus')

test('normalizeImportStatus trims and lowercases the raw value', () => {
  assert.equal(normalizeImportStatus('  Processing '), 'processing')
})

test('getImportStatusMeta keeps queued imports flagged as processing', () => {
  const result = getImportStatusMeta({
    status: {
      status: 'queued',
    },
  })

  assert.equal(result.isProcessing, true)
  assert.equal(result.isError, false)
  assert.equal(result.labelKey, 'processing')
})

test('getImportStatusMeta treats invalid imports as errors', () => {
  const result = getImportStatusMeta({
    status: {
      realStatus: 'invalid',
    },
  })

  assert.equal(result.isProcessing, false)
  assert.equal(result.isError, true)
  assert.equal(result.labelKey, 'error')
})

test('getImportErrorDetail returns the first non-empty message candidate', () => {
  assert.equal(
    getImportErrorDetail({
      error: '  ',
      status: {
        description: 'Arquivo fora do padrão',
      },
      message: 'Mensagem menos específica',
    }),
    'Arquivo fora do padrão',
  )
})

test('resolveImportLabels only reads translation keys without hardcoded fallbacks', () => {
  const calls = []
  const labels = resolveImportLabels((...args) => {
    calls.push(args)
    return args.join('.')
  })

  assert.deepEqual(calls, [
    ['imports', 'button', 'refresh'],
    ['imports', 'status', 'processing'],
    ['imports', 'status', 'error'],
    ['imports', 'status', 'done'],
    ['imports', 'status', 'no_status'],
    ['imports', 'message', 'processing_after_upload'],
  ])
  assert.equal(labels.refreshLabel, 'imports.button.refresh')
  assert.equal(labels.processingHelpLabel, 'imports.message.processing_after_upload')
})

test('resolveImportStatusLabel falls back to the raw backend status before the generic empty label', () => {
  assert.equal(
    resolveImportStatusLabel(
      {
        labelKey: 'fallback',
        rawStatus: 'sincronizando',
      },
      {
        noStatusLabel: 'sem status',
      },
    ),
    'sincronizando',
  )
})
