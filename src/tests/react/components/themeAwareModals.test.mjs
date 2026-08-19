import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');

const FORBIDDEN_COLOR = /#[0-9a-fA-F]{3,8}\b|\brgba?\s*\(|\bwhite\b|\bblack\b/i;

function loadSource(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

test('ConfirmModal.js sources colors only from themeStore getters.colors', () => {
  const src = loadSource('react/components/ConfirmModal.js');
  assert.match(src, /themeStore\.getters\.colors|themeColors/);
  assert.match(src, /modalOverlay|modalBackground|buttonBackground/);
  assert.doesNotMatch(
    src.replace(/transparent/g, ''),
    FORBIDDEN_COLOR,
    'ConfirmModal.js must not hardcode colors',
  );
});

test('ConfirmModal.styles.js createStyles uses only palette tokens', () => {
  const src = loadSource('react/components/ConfirmModal.styles.js');
  assert.match(src, /palette\.modalOverlay/);
  assert.match(src, /palette\.modalBackground/);
  assert.match(src, /palette\.buttonBackground/);
  assert.match(src, /palette\.buttonText/);
  // strip comments and the word transparent (Modal prop, not a color literal in styles)
  const stripped = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/transparent/gi, '');
  assert.doesNotMatch(stripped, FORBIDDEN_COLOR);
});

test('SystemErrorToast.js sources colors only from themeStore getters.colors', () => {
  const src = loadSource('react/components/SystemErrorToast.js');
  assert.match(src, /themeStore\.getters\.colors|themeColors/);
  assert.match(src, /toastDangerBackground|toastDangerText/);
  assert.doesNotMatch(
    src.replace(/transparent/g, ''),
    FORBIDDEN_COLOR,
    'SystemErrorToast.js must not hardcode colors',
  );
});

test('SystemErrorToast.styles.js createStyles uses only palette tokens', () => {
  const src = loadSource('react/components/SystemErrorToast.styles.js');
  assert.match(src, /palette\.toastDangerBackground/);
  assert.match(src, /palette\.toastDangerText/);
  const stripped = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/transparent/gi, '');
  assert.doesNotMatch(stripped, FORBIDDEN_COLOR);
});
