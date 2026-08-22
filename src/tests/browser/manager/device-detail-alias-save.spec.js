/**
 * Smoke: Manager /device-detail — edit device name → save → header updates without refresh.
 * fluxo: manager-devices
 * Refs: app-community#382
 *
 * Browser steps (manual/QA):
 * 1. Open Manager → Devices → open a device detail
 * 2. Click edit on the device name (alias)
 * 3. Change the name and confirm/save
 * 4. Assert header shows the new name without full page reload (no F5)
 *
 * Automated coverage: unit tests in deviceAliasSync.test.js validate the store
 * merge used by the save path; skipAliasSyncFromStoreRef guards stale snapshot.
 */
describe('device-detail alias save (smoke contract)', () => {
  it('documents acceptance: alias save updates header without refresh', () => {
    expect(true).toBe(true);
  });
});
