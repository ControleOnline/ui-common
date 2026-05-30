const {jest} = require('@jest/globals');

const {
  createSocketRuntimePipeline,
} = require('../../../react/utils/socketRuntimePipeline');

const {describe, expect, it, beforeEach, afterEach} = global;

describe('socketRuntimePipeline', () => {
  let websocketActions;
  let runtimeDebugActions;
  let storeMessages;
  let stores;

  beforeEach(() => {
    storeMessages = [];
    stores = {
      orders: {
        getters: {
          messages: storeMessages,
        },
        actions: {
          setMessages: nextMessages => {
            storeMessages = nextMessages;
            stores.orders.getters.messages = nextMessages;
          },
        },
      },
    };

    websocketActions = {
      setSummary: jest.fn(),
    };

    runtimeDebugActions = {
      setFooterEntry: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('tags delivered messages and updates the socket summary', async () => {
    const pipeline = createSocketRuntimePipeline({
      getDeviceId: () => 'device-1',
      getCurrentCompanyId: () => 'company-1',
      websocketActions,
      runtimeDebugActions,
      getStoreByName: name => stores[name],
    });

    pipeline.processPayload([
      {
        store: 'orders',
        company: {id: 'company-1'},
        order: '/orders/11',
      },
    ]);

    await Promise.resolve();

    expect(storeMessages).toEqual([
      {
        store: 'orders',
        company: {id: 'company-1'},
        order: '/orders/11',
        source: 'background-runtime',
      },
    ]);
    expect(websocketActions.setSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        connected: true,
        identified: true,
        status: 'connected',
        device: 'device-1',
        lastEventCount: 1,
        lastStores: ['orders'],
        lastCompanies: ['company-1'],
      }),
    );
    expect(runtimeDebugActions.setFooterEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'socket',
      }),
    );
  });

  it('applies socket-state snapshots without dropping owner metadata', () => {
    const pipeline = createSocketRuntimePipeline({
      getDeviceId: () => 'device-1',
      getCurrentCompanyId: () => 'company-1',
      websocketActions,
      runtimeDebugActions,
      getStoreByName: name => stores[name],
    });

    pipeline.processPayload({
      type: 'socket-state',
      connected: true,
      identified: true,
      status: 'connected',
      attempts: 0,
      device: 'device-1',
      ownerRegistrationId: 'manager::device-1::company-1',
      ownerPackageName: 'com.controleonline.manager',
      ownerCompanyId: 'company-1',
      lastEventCount: 3,
      lastStores: ['orders', 'print'],
      lastCompanies: ['company-1'],
    });

    expect(websocketActions.setSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        connected: true,
        identified: true,
        status: 'connected',
        ownerRegistrationId: 'manager::device-1::company-1',
        ownerPackageName: 'com.controleonline.manager',
        ownerCompanyId: 'company-1',
      }),
    );
  });
});
