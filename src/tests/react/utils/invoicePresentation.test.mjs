import assert from 'node:assert/strict';
import test from 'node:test';

import invoicePresentation from '../../../react/utils/invoicePresentation.js';

const {
  formatInvoiceTypeLabel,
  getInvoicePaymentTypeLabel,
  getInvoicePartyLabel,
  normalizeInvoiceType,
} = invoicePresentation;

test('normalizes invoice type and falls back to invoice', () => {
  assert.equal(normalizeInvoiceType(' PAYMENT '), 'payment');
  assert.equal(normalizeInvoiceType(''), 'invoice');
});

test('formats canonical invoice types with stable labels', () => {
  assert.equal(formatInvoiceTypeLabel('discount'), 'Discount');
  assert.equal(formatInvoiceTypeLabel('service_fee'), 'Service Fee');
});

test('reads payment type and party labels from invoice payloads', () => {
  assert.equal(
    getInvoicePaymentTypeLabel({
      paymentType: {
        paymentType: 'Credito',
      },
    }),
    'Credito',
  );

  assert.equal(
    getInvoicePartyLabel({
      alias: 'BRUNA',
      name: 'Bruna Silva',
    }),
    'BRUNA',
  );
});
