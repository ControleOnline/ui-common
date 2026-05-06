const assert = require('node:assert/strict')
const test = require('node:test')

const {
  getRuntimeFooterDebugInfo,
  getRuntimeFooterNativeIdentifierCandidates,
  getRuntimeFooterPrimaryText,
  getRuntimeFooterStoredVersion,
  getRuntimeFooterWebHost,
} = require('../../../react/utils/runtimeFooter')

const originalLocationDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'location')

const setLocation = value => {
  Object.defineProperty(globalThis, 'location', {
    configurable: true,
    enumerable: true,
    writable: true,
    value,
  })
}

const restoreLocation = () => {
  if (originalLocationDescriptor) {
    Object.defineProperty(globalThis, 'location', originalLocationDescriptor)
    return
  }

  delete globalThis.location
}

test('appends the current host for web runtime devices', () => {
  setLocation({hostname: '10.0.0.15'})

  try {
    assert.equal(
      getRuntimeFooterPrimaryText({
        device: {
          alias: 'app',
          appVersion: '1.3.6',
          deviceType: 'web',
          id: 'web-12',
        },
        appVersion: '1.3.6',
        deviceConfig: {
          configs: {
            'config-version': '1.3.5',
          },
        },
      }),
      'web (10.0.0.15) / v1.3.6',
    )

    const debugInfo = getRuntimeFooterDebugInfo({
      device: {
        alias: 'app',
        appVersion: '1.3.6',
        deviceType: 'web',
        id: 'web-12',
      },
      appVersion: '1.3.6',
      deviceConfig: {
        configs: {
          'config-version': '1.3.5',
        },
      },
    })

    assert.equal(debugInfo.runtimeDetailSource, 'location.hostname')
  } finally {
    restoreLocation()
  }
})

test('normalizes localhost to the loopback address on web', () => {
  setLocation({hostname: 'localhost'})

  try {
    assert.equal(getRuntimeFooterWebHost(), '127.0.0.1')
  } finally {
    restoreLocation()
  }
})

test('reads the persisted config-version for non-web runtimes', () => {
  assert.equal(
    getRuntimeFooterStoredVersion({
      configs: JSON.stringify({
        'config-version': '1.3.5',
      }),
    }),
    'v1.3.5',
  )

  assert.equal(
    getRuntimeFooterPrimaryText({
      device: {
        alias: 'PDV',
        appVersion: '1.3.7',
        deviceType: 'android',
        id: 'native-12',
      },
      appVersion: '1.3.6',
      deviceConfig: {
        device: {
          device: '229252771069b294',
        },
        configs: {
          'config-version': '1.3.5',
        },
      },
    }),
    'PDV (229252771069b294) / v1.3.7',
  )
})

test('prefers the backend device identifier used by the devices page', () => {
  assert.equal(
    getRuntimeFooterPrimaryText({
      device: {
        alias: 'PDV',
        appVersion: '1.3.7',
        deviceType: 'android',
        id: 'd41ac8afb9f178eb',
      },
      appVersion: '1.3.6',
      deviceConfig: {
        device: {
          device: '229252771069b294',
          metadata: {
            app: {
              version: '1.3.7',
            },
          },
        },
        configs: {
          'config-version': '1.3.7',
        },
      },
    }),
    'PDV (229252771069b294) / v1.3.7',
  )

  const debugInfo = getRuntimeFooterDebugInfo({
    device: {
      alias: 'PDV',
      appVersion: '1.3.7',
      deviceType: 'android',
      id: 'd41ac8afb9f178eb',
    },
    appVersion: '1.3.6',
    deviceConfig: {
      device: {
        device: '229252771069b294',
        metadata: {
          app: {
            version: '1.3.7',
          },
        },
      },
      configs: {
        'config-version': '1.3.7',
      },
    },
  })

  assert.equal(debugInfo.versionLabel, 'v1.3.7')
  assert.equal(debugInfo.displayName, 'PDV (229252771069b294)')
  assert.equal(debugInfo.runtimeDetail, '229252771069b294')
  assert.equal(debugInfo.runtimeDetailSource, 'device_config.device.device')
  assert.equal(debugInfo.versionCandidates[0]?.source, 'device_config.device.metadata.app.version')
  assert.equal(debugInfo.rawValues.deviceId, 'd41ac8afb9f178eb')
  assert.equal(debugInfo.rawValues.storedDeviceIdentifier, '229252771069b294')
})

test('falls back to the local device id when the backend identifier is unavailable', () => {
  const candidates = getRuntimeFooterNativeIdentifierCandidates({
    device: {
      id: 'local-device-99',
    },
    deviceConfig: {
      device: {},
    },
  })

  assert.equal(candidates[0]?.value, 'local-device-99')
  assert.equal(candidates[0]?.source, 'device.id')
})
