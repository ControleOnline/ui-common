const normalizeText = value => String(value ?? '').trim()

const normalizeInvoiceType = value => {
  const normalizedValue = normalizeText(value).toLowerCase()
  return normalizedValue || 'invoice'
}

const formatInvoiceTypeLabel = value => {
  const normalizedInvoiceType = normalizeInvoiceType(value)

  const labels = {
    invoice: 'Invoice',
    payment: 'Payment',
    discount: 'Discount',
    tax: 'Tax',
  }

  if (labels[normalizedInvoiceType]) {
    return labels[normalizedInvoiceType]
  }

  return normalizedInvoiceType
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const getInvoicePaymentTypeLabel = invoice =>
  normalizeText(invoice?.paymentType?.paymentType || invoice?.paymentType?.name)

const getInvoicePartyLabel = entity =>
  normalizeText(
    entity?.alias ||
      entity?.name ||
      entity?.fantasy_name ||
      entity?.company ||
      entity?.document,
  )

module.exports = {
  normalizeInvoiceType,
  formatInvoiceTypeLabel,
  getInvoicePaymentTypeLabel,
  getInvoicePartyLabel,
}
