import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const hookFiles = [
  'useDeviceDetailActions.js',
  'useDeviceDetailSaves.js',
];

for (const file of hookFiles) {
  test(`${file} receives currentCompany from deps`, () => {
    const source = readFileSync(
      new URL(`../../../react/pages/Devices/detail/${file}`, import.meta.url),
      'utf8',
    );
    const dependencies = source.match(
      /export default function [^(]+\(deps\)[\s\S]*?const \{([\s\S]*?)\}\s*=\s*deps;/,
    );

    assert.ok(dependencies, `${file} dependency block not found`);
    const block = dependencies[1];
    const hits = block.match(/(?:^|,)\s*currentCompany\s*(?:,|$)/gm) || [];

    assert.equal(
      hits.length,
      1,
      `${file} must destructure currentCompany exactly once`,
    );
    assert.match(source, /currentCompany\?\.id/);
  });
}
