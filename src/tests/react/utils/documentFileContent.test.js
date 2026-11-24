const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveDocumentFileContent } = require('../../../react/utils/documentFileContent');

const toBase64 = text => Buffer.from(text, 'utf8').toString('base64');

test('decodes base64 HTML documents returned by the files API', () => {
  const html = '<h1>Proposta</h1><p>Codex — R$ 260,00 (ação)</p>';
  assert.deepEqual(resolveDocumentFileContent(toBase64(html)), { kind: 'html', content: html });
});

test('keeps plain HTML as is', () => {
  assert.deepEqual(resolveDocumentFileContent('  <p>ok</p>'), { kind: 'html', content: '  <p>ok</p>' });
});

test('treats non-HTML base64 payloads as PDF', () => {
  const pdf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0xff, 0xfe, 0x00]).toString('base64');
  assert.deepEqual(resolveDocumentFileContent(pdf), { kind: 'pdf', content: pdf });
});

test('empty and plain text contents', () => {
  assert.deepEqual(resolveDocumentFileContent(''), { kind: 'empty', content: '' });
  assert.deepEqual(resolveDocumentFileContent(null), { kind: 'empty', content: '' });
  assert.deepEqual(resolveDocumentFileContent('Contrato simples, sem HTML.'), {
    kind: 'text',
    content: 'Contrato simples, sem HTML.',
  });
});
