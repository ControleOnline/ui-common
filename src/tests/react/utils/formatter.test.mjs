import assert from 'node:assert/strict';
import test from 'node:test';

import Formatter from '../../../utils/formatter.js';

test('formats API datetimes using the numeric offset returned by the backend', () => {
  assert.equal(
    Formatter.formatDateYmdTodmY('2026-07-22T00:00:00-02:00'),
    '22/07/2026',
  );

  assert.equal(
    Formatter.formatDateYmdTodmY('2026-07-22T22:34:22-02:00', true),
    '22/07/2026, 22:34:22',
  );

  assert.equal(
    Formatter.formatDateYmdTodmY('2026-07-22T21:34:22-03:00', true),
    '22/07/2026, 21:34:22',
  );
});

test('repairs mojibake from API text payloads', () => {
  assert.equal(
    Formatter.repairMojibake('NÃ£o, saÃ­da, cobranÃ§a, garÃ§om, conferÃªncia'),
    'Não, saída, cobrança, garçom, conferência',
  );

  assert.equal(
    Formatter.repairMojibake('ProduÃ§Ã£o entrada â†’ trabalhando â†’ pronto'),
    'Produção entrada → trabalhando → pronto',
  );
});
