const {jest} = require('@jest/globals');

const {
  syncBackgroundRuntimeRegistration,
} = require('../../../react/utils/backgroundRuntimeRegistration');

const {describe, expect, it, beforeEach} = global;

const buildModule = () => ({
  clearRegistration: jest.fn(() => Promise.resolve('removed')),
  syncRegistration: jest.fn(() => Promise.resolve('started')),
});

const buildRefs = () => ({
  lastRegistrationIdRef: {current: ''},
  lastRegistrationPayloadRef: {current: ''},
});

describe('backgroundRuntimeRegistration lifecycle', () => {
  let backgroundRuntimeModule;

  beforeEach(() => {
    backgroundRuntimeModule = buildModule();
  });

  it('syncs a valid registration and does not create an unmount cleanup', () => {
    const refs = buildRefs();

    const result = syncBackgroundRuntimeRegistration({
      backgroundRuntimeModule,
      registration: {
        registrationId: 'com.controleonline.manager::device-1::company-1',
        packageName: 'com.controleonline.manager',
        companyId: 'company-1',
        deviceId: 'device-1',
        backgroundEnabled: true,
        socketUrl: 'wss://example.test/socket',
        token: 'session-token',
      },
      ...refs,
    });

    expect(result).toBeUndefined();
    expect(backgroundRuntimeModule.syncRegistration).toHaveBeenCalledTimes(1);
    expect(backgroundRuntimeModule.clearRegistration).not.toHaveBeenCalled();
    expect(refs.lastRegistrationIdRef.current).toBe(
      'com.controleonline.manager::device-1::company-1',
    );
  });

  it('clears the registration when the session becomes invalid', () => {
    const refs = buildRefs();
    const registration = {
      registrationId: 'com.controleonline.manager::device-1::company-1',
      packageName: 'com.controleonline.manager',
      companyId: 'company-1',
      deviceId: 'device-1',
      backgroundEnabled: true,
      socketUrl: 'wss://example.test/socket',
      token: 'session-token',
    };

    syncBackgroundRuntimeRegistration({
      backgroundRuntimeModule,
      registration,
      ...refs,
    });

    expect(backgroundRuntimeModule.syncRegistration).toHaveBeenCalledTimes(1);
    expect(backgroundRuntimeModule.clearRegistration).not.toHaveBeenCalled();

    syncBackgroundRuntimeRegistration({
      backgroundRuntimeModule,
      registration: null,
      ...refs,
    });

    expect(backgroundRuntimeModule.clearRegistration).toHaveBeenCalledTimes(1);
    expect(backgroundRuntimeModule.clearRegistration).toHaveBeenCalledWith(
      'com.controleonline.manager::device-1::company-1',
    );
  });

  it('replaces the previous registration when the company changes', () => {
    const refs = buildRefs();

    syncBackgroundRuntimeRegistration({
      backgroundRuntimeModule,
      registration: {
        registrationId: 'com.controleonline.manager::device-1::company-1',
        packageName: 'com.controleonline.manager',
        companyId: 'company-1',
        deviceId: 'device-1',
        backgroundEnabled: true,
        socketUrl: 'wss://example.test/socket',
        token: 'session-token',
      },
      ...refs,
    });

    syncBackgroundRuntimeRegistration({
      backgroundRuntimeModule,
      registration: {
        registrationId: 'com.controleonline.manager::device-1::company-2',
        packageName: 'com.controleonline.manager',
        companyId: 'company-2',
        deviceId: 'device-1',
        backgroundEnabled: true,
        socketUrl: 'wss://example.test/socket',
        token: 'session-token',
      },
      ...refs,
    });

    expect(backgroundRuntimeModule.clearRegistration).toHaveBeenCalledWith(
      'com.controleonline.manager::device-1::company-1',
    );
    expect(backgroundRuntimeModule.syncRegistration).toHaveBeenCalledTimes(2);
    expect(refs.lastRegistrationIdRef.current).toBe(
      'com.controleonline.manager::device-1::company-2',
    );
  });
});
