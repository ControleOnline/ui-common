import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const styles = fs.readFileSync(
  new URL('../../../react/components/AppTypeSwitcher.styles.js', import.meta.url),
  'utf8',
).replace(/\r\n/g, '\n');

test('app type selector modal is 480px wide, centered and never wider than the screen (#1512)', () => {
  const panel = /modalPanel: \{([^}]*)\}/.exec(styles)?.[1] || '';
  assert.match(panel, /width: 480/);
  assert.match(panel, /maxWidth: '100%'/);
  assert.match(panel, /alignSelf: 'center'/);
});
