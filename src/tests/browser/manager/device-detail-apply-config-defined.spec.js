/**
 * Static smoke: DeviceDetail loader declares applyCurrentDeviceConfig + useFocusEffect.
 * fluxo: device-configuracao
 * Refs: app-community#706
 */
const fs = require('fs');
const path = require('path');
const {expect, test} = require('playwright/test');

const FLOW_ID = 'device-configuracao';
const loaderPath = path.resolve(
  __dirname,
  '../../../react/pages/Devices/detail/useDeviceDetailLoaders.js',
);
const stateAPath = path.resolve(
  __dirname,
  '../../../react/pages/Devices/detail/useDeviceDetailStateA.js',
);

test('device-configuracao #706 loader refs are declared', async () => {
  const loader = fs.readFileSync(loaderPath, 'utf8');
  const stateA = fs.readFileSync(stateAPath, 'utf8');
  expect(loader).toContain('useFocusEffect');
  expect(loader).toContain('const applyCurrentDeviceConfig = useCallback');
  expect(loader).toContain('currentCompany');
  expect(loader).toContain('displayStore');
  expect(loader).toContain('printerStore');
  expect(stateA).toMatch(/displayStore,/);
  expect(stateA).toMatch(/printerStore,/);
  expect(FLOW_ID).toBe('device-configuracao');
});
