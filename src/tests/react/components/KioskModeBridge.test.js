const React = require('react');
const renderer = require('react-test-renderer');
const {jest} = require('@jest/globals');

const {afterEach, beforeEach, describe, expect, it} = global;
global.IS_REACT_ACT_ENVIRONMENT = true;

const mockSetKioskMode = jest.fn(() => Promise.resolve({}));
const mockBackHandlerAddEventListener = jest.fn(() => ({
  remove: jest.fn(),
}));
const mockUseStore = jest.fn(name => {
  if (name === 'device_config') {
    return {
      getters: {
        item: {
          configs: {
            'pos-operation-mode': 'kiosk',
          },
        },
      },
    };
  }

  return {
    getters: {},
  };
});

jest.mock('@env', () => ({
  env: {
    APP_TYPE: 'POS',
  },
}));

jest.mock('@store', () => ({
  useStore: mockUseStore,
}));

jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
  },
  BackHandler: {
    addEventListener: mockBackHandlerAddEventListener,
  },
  NativeModules: {
    KioskMode: {
      setKioskMode: mockSetKioskMode,
    },
  },
  Platform: {
    OS: 'android',
  },
}));

const KioskModeBridge =
  require('../../../react/components/KioskModeBridge').default;

describe('KioskModeBridge', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockSetKioskMode.mockClear();
    mockBackHandlerAddEventListener.mockClear();
    mockUseStore.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('requests kiosk mode once on mount and keeps reasserting it later', async () => {
    let tree;

    await renderer.act(async () => {
      tree = renderer.create(React.createElement(KioskModeBridge));
    });

    expect(mockSetKioskMode).toHaveBeenCalledTimes(1);
    expect(mockSetKioskMode).toHaveBeenLastCalledWith(true);
    expect(mockBackHandlerAddEventListener).toHaveBeenCalledTimes(1);
    expect(mockBackHandlerAddEventListener).toHaveBeenCalledWith(
      'hardwareBackPress',
      expect.any(Function),
    );

    await renderer.act(async () => {
      jest.advanceTimersByTime(15000);
    });

    expect(mockSetKioskMode).toHaveBeenCalledTimes(2);
    expect(mockSetKioskMode).toHaveBeenLastCalledWith(true);

    await renderer.act(async () => {
      tree.unmount();
    });
  });
});
