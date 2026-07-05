const React = require('react');
const renderer = require('react-test-renderer');
const {jest} = require('@jest/globals');

const {beforeEach, describe, expect, it} = global;
global.IS_REACT_ACT_ENVIRONMENT = true;

const mockSetLauncherMode = jest.fn(() => Promise.resolve({}));
const mockBackHandlerAddEventListener = jest.fn(() => ({
  remove: jest.fn(),
}));
const mockUseStore = jest.fn(name => {
  if (name === 'device_config') {
    return {
      getters: {
        item: {
          configs: {
            'android-launcher-enabled': '1',
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
    LauncherMode: {
      setLauncherMode: mockSetLauncherMode,
    },
  },
  Platform: {
    OS: 'android',
  },
}));

const LauncherModeBridge =
  require('../../../react/components/LauncherModeBridge').default;

describe('LauncherModeBridge', () => {
  beforeEach(() => {
    mockSetLauncherMode.mockClear();
    mockBackHandlerAddEventListener.mockClear();
    mockUseStore.mockClear();
  });

  it('requests launcher mode on mount and reasserts it after returning active', async () => {
    let tree;

    await renderer.act(async () => {
      tree = renderer.create(React.createElement(LauncherModeBridge));
    });

    expect(mockSetLauncherMode).toHaveBeenCalledTimes(1);
    expect(mockSetLauncherMode).toHaveBeenLastCalledWith(true);
    expect(mockBackHandlerAddEventListener).not.toHaveBeenCalled();

    await renderer.act(async () => {
      tree.update(React.createElement(LauncherModeBridge, {appState: 'background'}));
    });

    await renderer.act(async () => {
      tree.update(React.createElement(LauncherModeBridge, {appState: 'active'}));
    });

    expect(mockSetLauncherMode).toHaveBeenCalledTimes(2);
    expect(mockSetLauncherMode).toHaveBeenLastCalledWith(true);

    await renderer.act(async () => {
      tree.unmount();
    });
  });
});
