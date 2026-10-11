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
      const providerSource = fs.readFileSync(
        path.resolve(__dirname, '../../../react/components', providerFile),
        'utf8',
      );

      const root = path.resolve(__dirname, '../../../react/components');
      const platform = providerFile.includes('.web.') ? 'web' : 'native';
      const source = providerSource + ['lifecycle', 'configuration'].map(group => fs.readFileSync(path.join(root, `DefaultProvider.${platform}.${group}.js`), 'utf8')).join('\n');
      expect(source).not.toContain('isTenantAdministrativeAuthority');
      expect(source).toMatch(
        /import\s*\{\s*canAdministerCompany\s*\}\s*from\s*['"]@controleonline\/ui-common\/src\/react\/utils\/companyAuthority['"]/,
      );
      expect(source).toMatch(
        /canAdministerCompany\(\{\s*company:\s*currentCompany,\s*mainCompany,\s*user\s*\}\)/,
      );
    },
  );
});
