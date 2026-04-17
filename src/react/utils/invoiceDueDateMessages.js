export const resolveInvoiceInvalidDateFormatMessage = () =>
  global.t?.t('invoice', 'validation', 'Use o formato DD/MM/YYYY ou YYYY-MM-DD')

export const resolveInvoiceSingleDatePlaceholder = () =>
  global.t?.t('invoice', 'placeholder', 'DD/MM/YYYY')

export const resolveInvoiceRangeLabel = () =>
  global.t?.t('invoice', 'label', 'Vencimento (início/fim)')

export const resolveInvoiceRangeStartPlaceholder = () =>
  global.t?.t('invoice', 'placeholder', 'Início: DD/MM/YYYY')

export const resolveInvoiceRangeEndPlaceholder = () =>
  global.t?.t('invoice', 'placeholder', 'Fim: DD/MM/YYYY')
