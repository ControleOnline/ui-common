const {jest} = require('@jest/globals');

const {
  compareRuntimePriority,
  createWebsocketSharedRuntime,
  isHigherPriorityRuntime,
} = require('../../../react/utils/websocketSharedRuntime');

const {describe, expect, it, beforeEach, afterEach} = global;

const channelRegistry = new Map();

class FakeBroadcastChannel {
  constructor(name) {
    this.name = name;
    this.closed = false;
    this.onmessage = null;

    if (!channelRegistry.has(name)) {
      channelRegistry.set(name, new Set());
    }

    channelRegistry.get(name).add(this);
  }

  postMessage(message) {
    const listeners = channelRegistry.get(this.name) || new Set();
    listeners.forEach(listener => {
      if (listener !== this && !listener.closed && listener.onmessage) {
        listener.onmessage({data: message});
      }
    });
  }

  close() {
    this.closed = true;
    channelRegistry.get(this.name)?.delete(this);
  }
}

class FakeWebSocket {
  static instances = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url) {
    this.url = url;
    this.readyState = FakeWebSocket.CONNECTING;
    this.send = jest.fn();
    FakeWebSocket.instances.push(this);
  }

  close(code = 1000, reason = 'close') {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({code, reason});
  }
}

const buildPipeline = () => {
  const state = {
    connected: false,
    identified: false,
    status: 'idle',
    attempts: 0,
    updatedAt: new Date().toISOString(),
    device: 'device-1',
    error: null,
    code: null,
    reason: '',
    ownerRegistrationId: '',
    ownerPackageName: '',
    ownerCompanyId: '',
    lastEventAt: null,
    lastEventCount: 0,
    lastStores: [],
    lastCompanies: [],
  };

  return {
    getConnectionState: () => state,
    processPayload: jest.fn(() => state),
    refreshFooter: jest.fn(),
    reset: jest.fn(() => {
      state.connected = false;
      state.identified = false;
      state.status = 'idle';
      state.attempts = 0;
      state.error = null;
      state.code = null;
      state.reason = '';
      state.lastEventAt = null;
      state.lastEventCount = 0;
      state.lastStores = [];
      state.lastCompanies = [];
      return state;
    }),
    updateConnectionState: jest.fn(nextState => {
      Object.assign(state, nextState);
      return state;
    }),
  };
};

describe('websocketSharedRuntime', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(1000);
    channelRegistry.clear();
    FakeWebSocket.instances = [];
    global.localStorage?.clear?.();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('prefers the oldest runtime and routes payloads through the shared channel', async () => {
    const leaderPipeline = buildPipeline();
    const followerPipeline = buildPipeline();

    const leaderRuntime = createWebsocketSharedRuntime({
      socketUrl: 'wss://example.test/socket',
      getDeviceId: () => 'device-1',
      pipeline: leaderPipeline,
      BroadcastChannelImpl: FakeBroadcastChannel,
      WebSocketImpl: FakeWebSocket,
      claimDelayMs: 20,
      heartbeatMs: 50,
      leaderStaleMs: 100,
      reconnectBaseMs: 20,
      reconnectMaxMs: 40,
      channelName: 'websocket-runtime-test',
    });

    jest.advanceTimersByTime(1);

    const followerRuntime = createWebsocketSharedRuntime({
      socketUrl: 'wss://example.test/socket',
      getDeviceId: () => 'device-1',
      pipeline: followerPipeline,
      BroadcastChannelImpl: FakeBroadcastChannel,
      WebSocketImpl: FakeWebSocket,
      claimDelayMs: 20,
      heartbeatMs: 50,
      leaderStaleMs: 100,
      reconnectBaseMs: 20,
      reconnectMaxMs: 40,
      channelName: 'websocket-runtime-test',
    });

    leaderRuntime.start();
    followerRuntime.start();

    jest.advanceTimersByTime(25);

    expect(leaderRuntime.isLeader()).toBe(true);
    expect(followerRuntime.isLeader()).toBe(false);
    expect(FakeWebSocket.instances).toHaveLength(1);

    const socket = FakeWebSocket.instances[0];
    socket.readyState = FakeWebSocket.OPEN;
    socket.onopen?.({});
    jest.advanceTimersByTime(200);

    const payload = JSON.stringify([
      {
        store: 'orders',
        company: {id: 'company-1'},
        order: '/orders/100',
      },
    ]);

    socket.onmessage?.({data: payload});
    await Promise.resolve();

    expect(leaderPipeline.processPayload).toHaveBeenCalledWith(payload);
    expect(followerPipeline.processPayload).toHaveBeenCalledWith(payload);
  });

  it('allows a follower to take over when the leader stops broadcasting', () => {
    const leaderPipeline = buildPipeline();
    const followerPipeline = buildPipeline();

    const leaderRuntime = createWebsocketSharedRuntime({
      socketUrl: 'wss://example.test/socket',
      getDeviceId: () => 'device-1',
      pipeline: leaderPipeline,
      BroadcastChannelImpl: FakeBroadcastChannel,
      WebSocketImpl: FakeWebSocket,
      claimDelayMs: 20,
      heartbeatMs: 50,
      leaderStaleMs: 100,
      reconnectBaseMs: 20,
      reconnectMaxMs: 40,
      channelName: 'websocket-runtime-test',
    });

    jest.advanceTimersByTime(1);

    const followerRuntime = createWebsocketSharedRuntime({
      socketUrl: 'wss://example.test/socket',
      getDeviceId: () => 'device-1',
      pipeline: followerPipeline,
      BroadcastChannelImpl: FakeBroadcastChannel,
      WebSocketImpl: FakeWebSocket,
      claimDelayMs: 20,
      heartbeatMs: 50,
      leaderStaleMs: 100,
      reconnectBaseMs: 20,
      reconnectMaxMs: 40,
      channelName: 'websocket-runtime-test',
    });

    leaderRuntime.start();
    followerRuntime.start();
    jest.advanceTimersByTime(25);

    expect(leaderRuntime.isLeader()).toBe(true);
    expect(followerRuntime.isLeader()).toBe(false);

    leaderRuntime.stop();
    jest.advanceTimersByTime(25);

    expect(followerRuntime.isLeader()).toBe(true);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it('compares runtime priority by start time before instance id', () => {
    expect(
      compareRuntimePriority(
        {instanceId: 'a', startedAt: 1},
        {instanceId: 'b', startedAt: 2},
      ),
    ).toBeLessThan(0);
    expect(
      isHigherPriorityRuntime(
        {instanceId: 'a', startedAt: 1},
        {instanceId: 'b', startedAt: 2},
      ),
    ).toBe(true);
  });
});
