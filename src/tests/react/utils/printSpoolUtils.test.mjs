import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {
  resolveSpoolId,
  extractCollectionMembers,
  mergeOpenSpoolCollections,
  resolveRequestedTargetDeviceId,
  resolveRequestedTargetDeviceTypeValue,
} from '../../../react/utils/printSpoolUtils.js';

describe('printSpoolUtils (#628 modularization)', () => {
  it('resolveSpoolId handles number, string, object and @id', () => {
    assert.equal(resolveSpoolId(12), 12);
    assert.equal(resolveSpoolId('spool/34'), 34);
    assert.equal(resolveSpoolId({id: 7}), 7);
    assert.equal(resolveSpoolId({'@id': '/spools/9'}), 9);
    assert.equal(resolveSpoolId(null), null);
  });

  it('extractCollectionMembers supports array, member, hydra:member', () => {
    assert.deepEqual(extractCollectionMembers([1]), [1]);
    assert.deepEqual(extractCollectionMembers({member: [2]}), [2]);
    assert.deepEqual(extractCollectionMembers({'hydra:member': [3]}), [3]);
    assert.deepEqual(extractCollectionMembers({}), []);
  });

  it('mergeOpenSpoolCollections dedupes and sorts by id', () => {
    const merged = mergeOpenSpoolCollections([
      [{id: 3}, {id: 1}],
      [{id: 1}, {id: 2}],
    ]);
    assert.deepEqual(
      merged.map(s => s.id),
      [1, 2, 3],
    );
  });

  it('resolveRequestedTargetDeviceId prefers explicit fields', () => {
    assert.equal(
      resolveRequestedTargetDeviceId({targetDeviceId: 5}, 9),
      '5',
    );
    assert.equal(resolveRequestedTargetDeviceId({}, 9), '9');
  });

  it('resolveRequestedTargetDeviceTypeValue normalizes type', () => {
    assert.equal(
      resolveRequestedTargetDeviceTypeValue({targetDeviceType: 'pdv'}),
      'PDV',
    );
  });
});
