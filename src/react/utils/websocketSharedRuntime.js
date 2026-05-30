import {normalizeText} from '@controleonline/ui-common/src/react/utils/socketRuntimePipeline';

const DEFAULT_CHANNEL_NAME = 'controleonline:websocket-runtime';

export const compareRuntimePriority = (left, right) => {
  const leftStarted = Number(left?.startedAt || 0);
  const rightStarted = Number(right?.startedAt || 0);

  if (leftStarted !== rightStarted) {
    return leftStarted - rightStarted;
  }

  return String(left?.instanceId || '').localeCompare(
    String(right?.instanceId || ''),
  );
};

export const isHigherPriorityRuntime = (candidate, current) =>
  compareRuntimePriority(candidate, current) < 0;

export const createWebsocketSharedRuntime = ({
  socketUrl = '',
  getDeviceId = () => '',
  pipeline,
  BroadcastChannelImpl = typeof BroadcastChannel === 'function'
    ? BroadcastChannel
    : null,
  WebSocketImpl = typeof WebSocket !== 'undefined' ? WebSocket : null,
  now = () => Date.now(),
  setTimeoutImpl = setTimeout,
  clearTimeoutImpl = clearTimeout,
  claimDelayMs = 180,
  heartbeatMs = 2000,
  leaderStaleMs = 6000,
  reconnectBaseMs = 1500,
  reconnectMaxMs = 12000,
  channelName = DEFAULT_CHANNEL_NAME,
} = {}) => {
  const startedAt = now();
  const instanceId = `${startedAt}-${Math.random().toString(36).slice(2, 10)}`;

  let channel = null;
  let socket = null;
  let claimTimer = null;
  let heartbeatTimer = null;
  let monitorTimer = null;
  let reconnectTimer = null;
  let reconnectAttempt = 0;
  let manualClose = false;
  let destroyed = false;
  let leaderDescriptor = null;
  let socketGeneration = 0;
  let identifyTimer = null;
  let socketStateSnapshot = pipeline?.getConnectionState?.() || null;
  const leaderStorageKey = `${channelName}:leader`;
  const storage =
    typeof localStorage !== 'undefined' ? localStorage : null;

  const readLeaderRecord = () => {
    if (!storage) {
      return null;
    }

    try {
      const raw = storage.getItem(leaderStorageKey);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      if (!parsed?.instanceId) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  };

  const writeLeaderRecord = record => {
    if (!storage || !record?.instanceId) {
      return;
    }

    try {
      storage.setItem(leaderStorageKey, JSON.stringify(record));
    } catch {
      // localStorage may be unavailable in privacy modes.
    }
  };

  const clearLeaderRecord = instanceIdToClear => {
    if (!storage) {
      return;
    }

    try {
      const currentRecord = readLeaderRecord();
      if (!currentRecord || currentRecord.instanceId === instanceIdToClear) {
        storage.removeItem(leaderStorageKey);
      }
    } catch {
      // noop
    }
  };

  const buildLeaderRecord = (state = 'claiming', reason = '') => ({
    instanceId,
    startedAt,
    state,
    reason,
    updatedAt: now(),
    leaseMs: leaderStaleMs + heartbeatMs,
    deviceId: normalizeText(getDeviceId()),
  });

  const isActiveLeaderRecord = record => {
    if (!record?.instanceId) {
      return false;
    }

    const leaseMs = Number(record.leaseMs || 0) || leaderStaleMs + heartbeatMs;
    const updatedAt = Number(record.updatedAt || 0);
    return updatedAt > 0 && now() - updatedAt <= leaseMs;
  };

  const clearTimer = timerId => {
    if (timerId) {
      clearTimeoutImpl(timerId);
    }

    return null;
  };

  const clearIntervalTimer = timerId => {
    if (timerId) {
      clearInterval(timerId);
    }

    return null;
  };

  const isCurrentSocket = (candidateSocket, generation) =>
    socket === candidateSocket && socketGeneration === generation;

  const broadcast = message => {
    if (channel) {
      channel.postMessage(message);
    }
  };

  const broadcastState = () => {
    if (!channel || !socketStateSnapshot) {
      return;
    }

    broadcast({
      type: 'socket-state',
      state: socketStateSnapshot,
      instanceId,
      startedAt,
    });
  };

  const sendLeaderHeartbeat = () => {
    if (!channel) {
      return;
    }

    writeLeaderRecord(buildLeaderRecord('leader', 'heartbeat'));
    broadcast({
      type: 'leader-heartbeat',
      instanceId,
      startedAt,
      at: now(),
    });
  };

  const rememberLeader = candidate => {
    if (!candidate?.instanceId) {
      return;
    }

    const nextDescriptor = {
      instanceId: candidate.instanceId,
      startedAt: Number(candidate.startedAt || 0),
      lastSeenAt: Number(candidate.lastSeenAt || now()),
    };

    if (
      !leaderDescriptor ||
      nextDescriptor.instanceId === leaderDescriptor.instanceId ||
      isHigherPriorityRuntime(nextDescriptor, leaderDescriptor)
    ) {
      leaderDescriptor = nextDescriptor;
    } else {
      leaderDescriptor = {
        ...leaderDescriptor,
        lastSeenAt: Math.max(leaderDescriptor.lastSeenAt || 0, now()),
      };
    }
  };

  const stopSocket = () => {
    const activeSocket = socket;
    socket = null;
    socketGeneration += 1;

    if (!activeSocket) {
      return;
    }

    activeSocket.onopen = null;
    activeSocket.onmessage = null;
    activeSocket.onerror = null;
    activeSocket.onclose = null;
    activeSocket.close?.();
  };

  const updateSocketState = state => {
    socketStateSnapshot = pipeline?.updateConnectionState?.(state) || state;
    return socketStateSnapshot;
  };

  const clearReconnectTimer = () => {
    reconnectTimer = clearTimer(reconnectTimer);
    reconnectAttempt = 0;
  };

  const scheduleReconnect = () => {
    if (manualClose || destroyed || !isLeader() || reconnectTimer) {
      return;
    }

    reconnectAttempt = Math.min(reconnectAttempt + 1, 8);
    updateSocketState({
      connected: false,
      identified: false,
      status: 'reconnecting',
      attempts: reconnectAttempt,
      updatedAt: new Date().toISOString(),
    });
    broadcastState();

    const delayMs = Math.min(
      reconnectMaxMs,
      reconnectBaseMs * (2 ** Math.min(reconnectAttempt, 4)),
    );

    reconnectTimer = setTimeoutImpl(() => {
      reconnectTimer = null;
      if (!manualClose && !destroyed && isLeader()) {
        openSocket();
      }
    }, delayMs);
  };

  const relinquishLeadership = ({reason = 'step-down', broadcastRelease = true} = {}) => {
    if (!isLeader()) {
      return;
    }

    clearTimer(heartbeatTimer);
    heartbeatTimer = null;
    clearTimer(claimTimer);
    claimTimer = null;
    clearTimer(identifyTimer);
    identifyTimer = null;
    clearIntervalTimer(monitorTimer);
    monitorTimer = null;
    clearReconnectTimer();
    stopSocket();

    updateSocketState({
      connected: false,
      identified: false,
      status: 'idle',
      attempts: 0,
      updatedAt: new Date().toISOString(),
      device: normalizeText(getDeviceId()) || null,
      error: null,
      code: null,
      reason,
      lastEventAt: null,
      lastEventCount: 0,
      lastStores: [],
      lastCompanies: [],
    });

    if (broadcastRelease) {
      broadcast({
        type: 'leader-release',
        instanceId,
        startedAt,
        reason,
      });
    }

    clearLeaderRecord(instanceId);
    leaderDescriptor = null;
  };

  const becomeLeader = ({reason = 'claim'} = {}) => {
    if (destroyed || manualClose || isLeader()) {
      return;
    }

    clearTimer(claimTimer);
    claimTimer = null;
    clearTimer(reconnectTimer);
    reconnectTimer = null;

    rememberLeader({
      instanceId,
      startedAt,
      lastSeenAt: now(),
    });

    updateSocketState({
      connected: false,
      identified: false,
      status: 'connecting',
      attempts: reconnectAttempt,
      updatedAt: new Date().toISOString(),
      device: normalizeText(getDeviceId()) || null,
      error: null,
      code: null,
      reason,
      lastEventAt: socketStateSnapshot?.lastEventAt || null,
      lastEventCount: socketStateSnapshot?.lastEventCount || 0,
      lastStores: socketStateSnapshot?.lastStores || [],
      lastCompanies: socketStateSnapshot?.lastCompanies || [],
    });
    broadcastState();
    writeLeaderRecord(buildLeaderRecord('leader', reason));

    sendLeaderHeartbeat();

    heartbeatTimer = clearTimer(heartbeatTimer);
    heartbeatTimer = setInterval(() => {
      if (destroyed || manualClose || !isLeader()) {
        return;
      }

      sendLeaderHeartbeat();
    }, heartbeatMs);

    openSocket();
  };

  const shouldLeadNow = () => {
    if (!channel) {
      return true;
    }

    if (!leaderDescriptor) {
      return true;
    }

    if (leaderDescriptor.instanceId === instanceId) {
      return true;
    }

    const elapsed = now() - Number(leaderDescriptor.lastSeenAt || 0);
    return elapsed > leaderStaleMs;
  };

  const requestLeadership = reason => {
    if (destroyed || manualClose) {
      return;
    }

    const deviceId = normalizeText(getDeviceId());
    if (!deviceId || !socketUrl) {
      return;
    }

    const activeRecord = readLeaderRecord();
    if (
      activeRecord &&
      isActiveLeaderRecord(activeRecord) &&
      activeRecord.instanceId !== instanceId
    ) {
      const activeCandidate = {
        instanceId: activeRecord.instanceId,
        startedAt: Number(activeRecord.startedAt || 0),
      };
      const selfCandidate = {
        instanceId,
        startedAt,
      };

      if (!isHigherPriorityRuntime(selfCandidate, activeCandidate)) {
        rememberLeader({
          ...activeCandidate,
          lastSeenAt: Number(activeRecord.updatedAt || now()),
        });
        return;
      }
    }

    if (!channel) {
      becomeLeader({reason});
      return;
    }

    const claimRecord = buildLeaderRecord('claiming', reason);

    writeLeaderRecord(claimRecord);
    broadcast({
      type: 'leader-claim',
      ...claimRecord,
      deviceId,
      reason,
      at: claimRecord.updatedAt,
    });

    clearTimer(claimTimer);
    claimTimer = setTimeoutImpl(() => {
      claimTimer = null;

      if (destroyed || manualClose || isLeader()) {
        return;
      }

      if (!shouldLeadNow()) {
        return;
      }

      becomeLeader({reason: 'claim-window'});
    }, claimDelayMs);
  };

  const handleSocketDisconnect = ({
    code = null,
    reason = '',
    errorMessage = '',
  } = {}) => {
    if (destroyed || manualClose || !isLeader()) {
      return;
    }

    stopSocket();

    updateSocketState({
      connected: false,
      identified: false,
      status: errorMessage ? 'error' : 'disconnected',
      attempts: reconnectAttempt,
      updatedAt: new Date().toISOString(),
      device: normalizeText(getDeviceId()) || null,
      error: errorMessage || reason || null,
      code,
      reason,
      lastEventAt: socketStateSnapshot?.lastEventAt || null,
      lastEventCount: socketStateSnapshot?.lastEventCount || 0,
      lastStores: socketStateSnapshot?.lastStores || [],
      lastCompanies: socketStateSnapshot?.lastCompanies || [],
    });
    broadcastState();

    if (errorMessage) {
      scheduleReconnect();
    } else {
      reconnectAttempt = 0;
    }
  };

  const openSocket = () => {
    if (
      destroyed ||
      manualClose ||
      !isLeader() ||
      !socketUrl ||
      !normalizeText(getDeviceId()) ||
      !WebSocketImpl
    ) {
      return;
    }

    if (
      socket?.readyState === WebSocketImpl.OPEN ||
      socket?.readyState === WebSocketImpl.CONNECTING
    ) {
      return;
    }

    const generation = socketGeneration + 1;
    socketGeneration = generation;
    const nextSocket = new WebSocketImpl(socketUrl);
    socket = nextSocket;

    nextSocket.onopen = () => {
      if (!isCurrentSocket(nextSocket, generation)) {
        return;
      }

      reconnectAttempt = 0;
      updateSocketState({
        connected: false,
        identified: false,
        status: 'open',
        attempts: 0,
        updatedAt: new Date().toISOString(),
        device: normalizeText(getDeviceId()) || null,
        error: null,
        code: null,
        reason: '',
        lastEventAt: socketStateSnapshot?.lastEventAt || null,
        lastEventCount: socketStateSnapshot?.lastEventCount || 0,
        lastStores: socketStateSnapshot?.lastStores || [],
        lastCompanies: socketStateSnapshot?.lastCompanies || [],
      });
      broadcastState();

      clearTimer(identifyTimer);
      identifyTimer = setTimeoutImpl(() => {
        identifyTimer = null;

        if (
          destroyed ||
          manualClose ||
          !isCurrentSocket(nextSocket, generation) ||
          nextSocket.readyState !== WebSocketImpl.OPEN
        ) {
          return;
        }

        nextSocket.send(
          JSON.stringify({
            command: 'identify',
            device: normalizeText(getDeviceId()),
          }),
        );
      }, 150);
    };

    nextSocket.onmessage = event => {
      if (
        destroyed ||
        manualClose ||
        !isCurrentSocket(nextSocket, generation)
      ) {
        return;
      }

      const rawPayload = event?.data;
      if (rawPayload == null || rawPayload === '') {
        return;
      }

      const nextState = pipeline?.processPayload?.(rawPayload);

      if (channel) {
        broadcast({
          type: 'socket-payload',
          payload: rawPayload,
          instanceId,
          startedAt,
        });
      }

      if (nextState?.status === 'error') {
        handleSocketDisconnect({
          errorMessage: nextState?.error || nextState?.reason || 'WebSocket error',
        });
      }
    };

    nextSocket.onerror = () => {
      if (
        destroyed ||
        manualClose ||
        !isCurrentSocket(nextSocket, generation)
      ) {
        return;
      }

      handleSocketDisconnect({
        errorMessage: 'WebSocket error',
      });
    };

    nextSocket.onclose = event => {
      if (
        destroyed ||
        !isCurrentSocket(nextSocket, generation)
      ) {
        return;
      }

      const wasManualClose = manualClose;
      stopSocket();

      if (wasManualClose) {
        updateSocketState({
          connected: false,
          identified: false,
          status: 'closed',
          attempts: reconnectAttempt,
          updatedAt: new Date().toISOString(),
          device: normalizeText(getDeviceId()) || null,
          error: null,
          code: event?.code ?? null,
          reason: event?.reason || '',
          lastEventAt: socketStateSnapshot?.lastEventAt || null,
          lastEventCount: socketStateSnapshot?.lastEventCount || 0,
          lastStores: socketStateSnapshot?.lastStores || [],
          lastCompanies: socketStateSnapshot?.lastCompanies || [],
        });
        broadcastState();
        return;
      }

      handleSocketDisconnect({
        code: event?.code ?? null,
        reason: event?.reason || '',
      });
      scheduleReconnect();
    };
  };

  const handleChannelMessage = event => {
    const message = event?.data;
    if (!message || typeof message !== 'object') {
      return;
    }

    if (message.instanceId === instanceId) {
      return;
    }

    if (
      message.type === 'leader-claim' ||
      message.type === 'leader-heartbeat'
    ) {
      const candidate = {
        instanceId: message.instanceId,
        startedAt: Number(message.startedAt || 0),
      };
      const selfCandidate = {
        instanceId,
        startedAt,
      };
      const bestKnownCandidate = leaderDescriptor || selfCandidate;
      const shouldRememberLeader =
        message.instanceId === bestKnownCandidate.instanceId ||
        isHigherPriorityRuntime(candidate, bestKnownCandidate);

      if (shouldRememberLeader) {
        rememberLeader(message);
      }

      if (
        isLeader() &&
        isHigherPriorityRuntime(candidate, selfCandidate)
      ) {
        relinquishLeadership({reason: 'better leader detected'});
        return;
      }

      if (claimTimer && isHigherPriorityRuntime(candidate, selfCandidate)) {
        clearTimer(claimTimer);
        claimTimer = null;
      }

      return;
    }

    if (message.type === 'leader-release') {
      if (
        leaderDescriptor?.instanceId &&
        leaderDescriptor.instanceId === message.instanceId
      ) {
        leaderDescriptor = null;
      }

      if (!isLeader()) {
        requestLeadership('leader-released');
      }

      return;
    }

    if (message.type === 'socket-state') {
      socketStateSnapshot = pipeline?.processPayload?.(message.state || message);
      return;
    }

    if (message.type === 'socket-payload') {
      socketStateSnapshot = pipeline?.processPayload?.(message.payload);
    }
  };

  const startMonitor = () => {
    clearIntervalTimer(monitorTimer);
    monitorTimer = setInterval(() => {
      if (destroyed || manualClose) {
        return;
      }

      if (isLeader()) {
        return;
      }

      if (!leaderDescriptor) {
        const activeRecord = readLeaderRecord();
        if (
          activeRecord &&
          isActiveLeaderRecord(activeRecord) &&
          activeRecord.instanceId !== instanceId
        ) {
          rememberLeader({
            instanceId: activeRecord.instanceId,
            startedAt: Number(activeRecord.startedAt || 0),
            lastSeenAt: Number(activeRecord.updatedAt || now()),
          });
          return;
        }

        requestLeadership('no-leader');
        return;
      }

      const activeRecord = readLeaderRecord();
      if (activeRecord && activeRecord.instanceId !== instanceId) {
        if (isActiveLeaderRecord(activeRecord)) {
          rememberLeader({
            instanceId: activeRecord.instanceId,
            startedAt: Number(activeRecord.startedAt || 0),
            lastSeenAt: Number(activeRecord.updatedAt || now()),
          });
          return;
        }
      }

      if (now() - Number(leaderDescriptor.lastSeenAt || 0) > leaderStaleMs) {
        requestLeadership('leader-stale');
      }
    }, 1000);
  };

  const start = () => {
    destroyed = false;
    manualClose = false;

    if (BroadcastChannelImpl) {
      channel = new BroadcastChannelImpl(channelName);
      channel.onmessage = handleChannelMessage;
    }

    startMonitor();

    if (!channel) {
      becomeLeader({reason: 'single-tab'});
      return;
    }

    requestLeadership('start');
  };

  const stop = () => {
    manualClose = true;
    destroyed = true;

    clearTimer(claimTimer);
    claimTimer = null;
    clearTimer(heartbeatTimer);
    heartbeatTimer = null;
    clearTimer(identifyTimer);
    identifyTimer = null;
    clearTimer(reconnectTimer);
    reconnectTimer = null;
    clearIntervalTimer(monitorTimer);
    monitorTimer = null;

    if (channel) {
      broadcast({
        type: 'leader-release',
        instanceId,
        startedAt,
        reason: 'stop',
      });

      channel.onmessage = null;
      channel.close?.();
      channel = null;
    }

    stopSocket();
    clearLeaderRecord(instanceId);
    pipeline?.reset?.();
    leaderDescriptor = null;
  };

  const isLeader = () => {
    if (manualClose || destroyed) {
      return false;
    }

    if (!channel) {
      return true;
    }

    return leaderDescriptor?.instanceId === instanceId;
  };

  const refreshFooter = () => {
    pipeline?.refreshFooter?.();
  };

  return {
    becomeLeader,
    broadcastState,
    handleChannelMessage,
    handleSocketDisconnect,
    isLeader,
    openSocket,
    refreshFooter,
    relinquishLeadership,
    requestLeadership,
    start,
    stop,
  };
};
