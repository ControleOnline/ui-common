import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const read = name => fs.readFileSync(new URL(name, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('toast error/warning accents come from theme variables, not fixed RGB (#1484)', () => {
  const presentation = read('../../../react/utils/toastPresentation.js');
  assert.match(presentation, /colors\.negative/);
  assert.match(presentation, /colors\.warning/);
  assert.doesNotMatch(presentation, /#(?:DC2626|FFF7F7|FECACA|e67e22)/i);
  const toast = read('../../../react/components/SystemErrorToast.js');
  assert.match(toast, /themeColors\.toastDangerBorder \|\| themeColors\.negative/);
});
