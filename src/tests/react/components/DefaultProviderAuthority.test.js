import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, it} from '@jest/globals';

const providerFiles = [
  'DefaultProvider.web.js',
  'DefaultProvider.native.js',
];

describe('DefaultProvider company authority guard', () => {
  it.each(providerFiles)(
    'uses the shared authority helper in %s',
    providerFile => {
      const source = fs.readFileSync(
        path.resolve(__dirname, '../../../react/components', providerFile),
        'utf8',
      );

      expect(source).not.toContain('isTenantAdministrativeAuthority');
      expect(source).toMatch(
        /canAdministerCompany\(\{\s*company:\s*currentCompany,\s*mainCompany,\s*user\s*\}\)/,
      );
    },
  );
});
