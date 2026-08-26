import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCopyPayloads,
  buildSourceDeviceOptions,
  executeCopyDeviceConfigs,
  listCopyableConfigKeys,
} from '../../../react/utils/copyDeviceConfigs.js';

const companyId = '42';
const peopleIri = '/people/42';

const sourceRows = [
  {
    id: 1,
    type: 'PDV',
    people: {id: 42},
    device: {id: 10, device: 'src-hash-1', alias: 'Caixa 1'},
    configs: {
      'pos-operation-mode': 'cashier',
      'pos-gateway': 'cielo',
      'printer-enabled': '1',
    },
  },
  {
    id: 2,
    type: 'PRINT',
    people: {id: 42},
    device: {id: 10, device: 'src-hash-1', alias: 'Caixa 1'},
    configs: {'print-network-port': '9100'},
  },
  {
    id: 3,
    type: 'PDV',
    people: {id: 99},
    device: {id: 20, device: 'other-co', alias: 'Outra empresa'},
    configs: {'pos-gateway': 'infinite-pay'},
  },
  {
    id: 4,
    type: 'PDV',
    people: {id: 42},
    device: {id: 30, device: 'dest-hash', alias: 'Destino'},
    configs: {'pos-operation-mode': 'waiter'},
  },
];

test('listCopyableConfigKeys sorts keys from object or JSON string', () => {
  assert.deepEqual(listCopyableConfigKeys({'b-key': '1', 'a-key': '2'}), [
    'a-key',
    'b-key',
  ]);
  assert.deepEqual(
    listCopyableConfigKeys(JSON.stringify({'pos-gateway': 'cielo'})),
    ['pos-gateway'],
  );
});

test('buildSourceDeviceOptions excludes destination and other tenants', () => {
  const options = buildSourceDeviceOptions({
    companyDeviceConfigs: sourceRows,
    companyId,
    destinationDeviceString: 'dest-hash',
  });
  assert.equal(options.length, 1);
  assert.equal(options[0].deviceString, 'src-hash-1');
  assert.equal(options[0].configs.length, 2);
});

test('buildCopyPayloads keeps destination identity and source config keys', () => {
  const payloads = buildCopyPayloads({
    sourceConfigs: sourceRows.filter(r => r.device.device === 'src-hash-1'),
    destinationDeviceString: 'dest-hash',
    peopleIri,
  });
  assert.equal(payloads.length, 2);
  const pdv = payloads.find(p => p.type === 'PDV');
  const print = payloads.find(p => p.type === 'PRINT');
  assert.equal(pdv.device, 'dest-hash');
  assert.equal(pdv.people, peopleIri);
  assert.equal(JSON.parse(pdv.configs)['pos-gateway'], 'cielo');
  assert.deepEqual(pdv.keys, [
    'pos-gateway',
    'pos-operation-mode',
    'printer-enabled',
  ]);
  assert.deepEqual(print.keys, ['print-network-port']);
});

test('executeCopyDeviceConfigs posts one payload per type', async () => {
  const calls = [];
  const addDeviceConfigs = async params => {
    calls.push(params);
    return {ok: true, type: params.type};
  };
  const summary = await executeCopyDeviceConfigs({
    addDeviceConfigs,
    sourceConfigs: sourceRows.filter(r => r.device.device === 'src-hash-1'),
    destinationDeviceString: 'dest-hash',
    peopleIri,
  });
  assert.equal(calls.length, 2);
  assert.ok(calls.every(c => c.device === 'dest-hash'));
  assert.ok(calls.every(c => c.people === peopleIri));
  assert.deepEqual(summary.types.sort(), ['PDV', 'PRINT']);
  assert.ok(summary.keys.includes('pos-gateway'));
  assert.ok(summary.keys.includes('print-network-port'));
});

test('buildCopyPayloads returns empty without dest or people', () => {
  assert.deepEqual(
    buildCopyPayloads({
      sourceConfigs: sourceRows,
      destinationDeviceString: '',
      peopleIri,
    }),
    [],
  );
  assert.deepEqual(
    buildCopyPayloads({
      sourceConfigs: sourceRows,
      destinationDeviceString: 'dest-hash',
      peopleIri: '',
    }),
    [],
  );
});
