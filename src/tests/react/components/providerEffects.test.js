import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {parse} from '@babel/parser';
import traverse from '@babel/traverse';
import expected from './providerEffects.fingerprint.json';

// Protect the unrelated auth/device/bootstrap callbacks while extracting hooks.
// Fingerprints record the approved runtime callbacks, dependencies and hook order.
it.each(['web', 'native'])('preserves bootstrap effects in %s', platform => {
  const root = path.resolve(__dirname, '../../../react/components');
  const provider = parse(fs.readFileSync(path.join(root, `DefaultProvider.${platform}.js`), 'utf8'), {sourceType: 'module', plugins: ['jsx']});
  const hooks = new Map();
  for (const group of ['lifecycle', 'configuration']) {
    const code = fs.readFileSync(path.join(root, `DefaultProvider.${platform}.${group}.js`), 'utf8');
    traverse(parse(code, {sourceType: 'module'}), {FunctionDeclaration(p) {
      const effect = p.node.body.body.find(n => n.expression?.callee?.name === 'useEffect');
      if (effect) hooks.set(p.node.id.name, crypto.createHash('sha256').update(code.slice(effect.start, effect.end)).digest('hex'));
    }});
  }
  const actual = [];
  traverse(provider, {CallExpression(p) {if (hooks.has(p.node.callee.name)) actual.push(hooks.get(p.node.callee.name));}});
  expect(actual).toEqual(expected[platform]);
});
