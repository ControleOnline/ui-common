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

test('plain-text models are returned decoded as text', () => {
  const text = 'CONTRATO PADRÃO\nCláusula 1 – <nome_contratante> & mais';
  assert.deepEqual(resolveDocumentFileContent(toBase64(text)), { kind: 'text', content: text });
});

test('PDF payloads stay base64 for the viewer', () => {
  const pdf = Buffer.from('%PDF-1.7\n\xff\xfe binary', 'binary').toString('base64');
  assert.deepEqual(resolveDocumentFileContent(pdf), { kind: 'pdf', content: pdf });
});

test('empty contents', () => {
  assert.deepEqual(resolveDocumentFileContent(''), { kind: 'empty', content: '' });
  assert.deepEqual(resolveDocumentFileContent(null), { kind: 'empty', content: '' });
});
