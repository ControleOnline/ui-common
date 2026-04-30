const PROCESSING_IMPORT_STATUSES = ['pending', 'processing', 'queued', 'uploading', 'uploaded']
const ERROR_IMPORT_STATUSES = ['error', 'failed', 'failure', 'invalid']
const SUCCESS_IMPORT_STATUSES = ['done', 'success', 'completed', 'processed', 'finished']

function normalizeImportStatus(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function getImportStatusMeta(item) {
  const rawStatus =
    item?.status?.realStatus ||
    item?.status?.status ||
    item?.status?.name ||
    ''
  const normalizedStatus = normalizeImportStatus(rawStatus)

  if (PROCESSING_IMPORT_STATUSES.includes(normalizedStatus)) {
    return {
      isProcessing: true,
      isError: false,
      labelKey: 'processing',
      rawStatus,
      backgroundColor: '#FEF3C7',
      textColor: '#B45309',
    }
  }

  if (ERROR_IMPORT_STATUSES.includes(normalizedStatus)) {
    return {
      isProcessing: false,
      isError: true,
      labelKey: 'error',
      rawStatus,
      backgroundColor: '#FEE2E2',
      textColor: '#B91C1C',
    }
  }

  if (SUCCESS_IMPORT_STATUSES.includes(normalizedStatus)) {
    return {
      isProcessing: false,
      isError: false,
      labelKey: 'done',
      rawStatus,
      backgroundColor: '#DCFCE7',
      textColor: '#15803D',
    }
  }

  return {
    isProcessing: false,
    isError: false,
    labelKey: 'fallback',
    rawStatus,
    backgroundColor: '#E2E8F0',
    textColor: '#475569',
  }
}

function getImportErrorDetail(item) {
  const candidates = [
    item?.error,
    item?.errorMessage,
    item?.status?.message,
    item?.status?.description,
    item?.status?.detail,
    item?.detail,
    item?.message,
  ]

  return candidates.find(candidate => String(candidate || '').trim()) || ''
}

function resolveImportLabels(translate) {
  return {
    refreshLabel: translate?.('imports', 'button', 'refresh'),
    processingLabel: translate?.('imports', 'status', 'processing'),
    errorLabel: translate?.('imports', 'status', 'error'),
    doneLabel: translate?.('imports', 'status', 'done'),
    noStatusLabel: translate?.('imports', 'status', 'no_status'),
    processingHelpLabel: translate?.('imports', 'message', 'processing_after_upload'),
  }
}

function resolveImportStatusLabel(statusMeta, labels = {}) {
  if (statusMeta?.labelKey === 'processing') return labels.processingLabel
  if (statusMeta?.labelKey === 'error') return labels.errorLabel
  if (statusMeta?.labelKey === 'done') return labels.doneLabel
  return statusMeta?.rawStatus || labels.noStatusLabel
}

module.exports = {
  getImportErrorDetail,
  getImportStatusMeta,
  normalizeImportStatus,
  resolveImportLabels,
  resolveImportStatusLabel,
}
