import React, {useEffect, useRef} from 'react';
import TcpSocket from 'react-native-tcp-socket';
import {useStore, getAllStores} from '@store';

const LOCAL_RUNTIME_HOST = '127.0.0.1';
const LOCAL_RUNTIME_PORT = 41572;

const normalizeText = value => String(value || '').trim();

const formatClock = value => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return '--';
  }

  try {
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) {
      return '--';
    }

    const pad = entry => String(entry).padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
      date.getSeconds(),
    )}`;
  } catch {
    return '--';
  }
};

const truncateText = (value, max = 44) => {
  const normalized = normalizeText(value);
  if (!normalized || normalized.length <= max) {
    return normalized || '--';
  }

  return `${normalized.slice(0, max - 3)}...`;
};

const isFilledObject = value =>
  !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0;

export const WebsocketListener = () => {
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const connectTimeoutRef = useRef(null);
  const pendingMessagesRef = useRef({});
  const flushMessagesPromiseRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const isIdentifyingRef = useRef(false);
  const manualCloseRef = useRef(false);
  const connectionTokenRef = useRef(0);
  const inboundBufferRef = useRef('');

  const deviceStore = useStore('device');
  const peopleStore = useStore('people');
  const websocketStore = useStore('websocket');
  const runtimeDebugStore = useStore('runtime_debug');
  const {item: device} = deviceStore.getters;
  const {currentCompany} = peopleStore.getters;
  const websocketActions = websocketStore.actions;
  const runtimeDebugActions = runtimeDebugStore.actions;

  const stores = getAllStores();
  const getStoreByName = name => stores[name];

  const publishSocketFooterEntry = (state = {}) => {
    const socketConnected = Boolean(state?.connected);
    const socketIdentified = Boolean(state?.identified);
    const normalizedStatus = normalizeText(state?.status).toLowerCase();
    const stateLabel = socketConnected
      ? socketIdentified
        ? 'socket:on'
        : 'socket:open'
      : `socket:${normalizedStatus || 'off'}`;

    const indicatorColor =
      socketConnected && socketIdentified
        ? '#10b981'
        : (socketConnected || ['connecting', 'identifying', 'open', 'reconnecting'].includes(normalizedStatus))
          ? '#e67e22'
          : '#c10015';
    const lastSocketStores = Array.isArray(state?.lastStores)
      ? state.lastStores.filter(Boolean).join(', ')
      : '';
    const lastSocketCompanies = Array.isArray(state?.lastCompanies)
      ? state.lastCompanies.filter(Boolean).join(', ')
      : '';

    runtimeDebugActions.setFooterEntry({
      key: 'socket',
      order: 10,
      indicatorColor,
      updatedAt: state?.updatedAt || new Date().toISOString(),
      lines: [
        `Realtime ${stateLabel} | empresa: ${normalizeText(
          currentCompany?.id,
        ) || '--'} | device: ${truncateText(state?.device || device?.id || '--', 34)}`,
        `ultimo socket: ${formatClock(state?.lastEventAt)} | eventos: ${Number(
          state?.lastEventCount || 0,
        )} | stores: ${truncateText(lastSocketStores || '--', 28)} | empresas: ${truncateText(
          lastSocketCompanies || '--',
          18,
        )}`,
      ],
    });
  };

  const updateConnectionState = (state = {}) => {
    const nextState = {
      connected: false,
      identified: false,
      status: 'idle',
      attempts: reconnectAttempts.current,
      updatedAt: new Date().toISOString(),
      ...state,
    };

    websocketActions.setSummary(nextState);
    publishSocketFooterEntry(nextState);
  };

  const isActiveSocket = (socket, connectionToken) =>
    socketRef.current === socket && connectionTokenRef.current === connectionToken;

  const flushPendingMessages = () => {
    flushMessagesPromiseRef.current = null;
    const pendingMessages = pendingMessagesRef.current;
    pendingMessagesRef.current = {};
    const deliveredStores = [];
    const deliveredCompanies = new Set();

    let deliveredMessages = 0;
    Object.entries(pendingMessages).forEach(([storeName, messages]) => {
      if (!Array.isArray(messages) || messages.length === 0) {
        return;
      }

      const storeModule = getStoreByName(storeName);
      if (!storeModule) {
        return;
      }

      const messageGetters = storeModule?.getters || {};
      const messageActions = storeModule?.actions || {};
      if (typeof messageActions?.setMessages !== 'function') {
        return;
      }

      const currentMessages = Array.isArray(messageGetters?.messages)
        ? messageGetters.messages
        : [];

      messageActions.setMessages([...currentMessages, ...messages]);
      deliveredMessages += messages.length;
      deliveredStores.push(storeName);
      messages.forEach(message => {
        const companyId = String(
          message?.company?.id || message?.companyId || message?.company || '',
        ).trim();
        if (companyId) {
          deliveredCompanies.add(companyId);
        }
      });
    });

    if (deliveredMessages > 0) {
      updateConnectionState({
        status: 'connected',
        connected: true,
        identified: true,
        device: device?.id || null,
        error: null,
        lastEventAt: new Date().toISOString(),
        lastEventCount: deliveredMessages,
        lastStores: deliveredStores,
        lastCompanies: Array.from(deliveredCompanies),
      });
    }
  };

  const appendMessageToStore = data => {
    if (!data?.store) {
      return;
    }

    const storeModule = getStoreByName(data.store);
    if (!storeModule?.actions || typeof storeModule.actions.setMessages !== 'function') {
      return;
    }

    if (!Array.isArray(pendingMessagesRef.current[data.store])) {
      pendingMessagesRef.current[data.store] = [];
    }

    pendingMessagesRef.current[data.store].push({
      ...data,
      source: 'background-runtime',
    });

    if (!flushMessagesPromiseRef.current) {
      flushMessagesPromiseRef.current = Promise.resolve().then(() => {
        flushPendingMessages();
      });
    }
  };

  const processIncomingPayload = payload => {
    if (!payload) {
      return;
    }

    if (payload.type === 'socket-state') {
      isIdentifyingRef.current = false;
      updateConnectionState({
        connected: Boolean(payload.connected),
        identified: Boolean(payload.identified),
        status: normalizeText(payload.status) || 'connected',
        attempts: Number(payload.attempts || 0),
        updatedAt: payload.updatedAt || new Date().toISOString(),
        device: payload.device || device?.id || null,
        error: payload.error || null,
        code: payload.code || null,
        reason: payload.reason || '',
        lastEventAt: payload.lastEventAt || null,
        lastEventCount: Number(payload.lastEventCount || 0),
        lastStores: Array.isArray(payload.lastStores) ? payload.lastStores : [],
        lastCompanies: Array.isArray(payload.lastCompanies)
          ? payload.lastCompanies
          : [],
      });
      return;
    }

    if (payload.status === 'identified') {
      isIdentifyingRef.current = false;
      updateConnectionState({
        status: 'connected',
        connected: true,
        identified: true,
        device: payload.device || device?.id,
        error: null,
      });
      return;
    }

    if (payload.status === 'error') {
      isIdentifyingRef.current = false;
      updateConnectionState({
        status: 'error',
        connected: false,
        identified: false,
        error: payload.message || 'Background runtime identify failed',
      });
      return;
    }

    const events = Array.isArray(payload) ? payload : [payload];
    events.filter(isFilledObject).forEach(appendMessageToStore);
  };

  const processIncomingLine = line => {
    const normalizedLine = normalizeText(line);
    if (!normalizedLine) {
      return;
    }

    try {
      processIncomingPayload(JSON.parse(normalizedLine));
    } catch {
      // Ignora linhas incompletas ou nao JSON.
    }
  };

  const clearActiveSocket = () => {
    const activeSocket = socketRef.current;
    socketRef.current = null;

    if (activeSocket) {
      try {
        activeSocket.removeAllListeners?.();
      } catch {
        // noop
      }

      try {
        activeSocket.end?.();
      } catch {
        // noop
      }

      try {
        activeSocket.destroy?.();
      } catch {
        // noop
      }
    }
  };

  const scheduleReconnect = () => {
    if (
      manualCloseRef.current ||
      reconnectTimeoutRef.current ||
      connectTimeoutRef.current ||
      socketRef.current
    ) {
      return;
    }

    const delay = Math.min(10000 * Math.pow(2, reconnectAttempts.current), 12000);
    reconnectAttempts.current += 1;
    updateConnectionState({
      status: 'reconnecting',
      connected: false,
      identified: false,
      attempts: reconnectAttempts.current,
    });

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      if (device?.id) {
        connect();
      }
    }, delay);
  };

  const connect = () => {
    if (connectTimeoutRef.current || socketRef.current) {
      return;
    }

    manualCloseRef.current = false;
    updateConnectionState({
      status: 'connecting',
      connected: false,
      identified: false,
      error: null,
    });

    const connectionToken = connectionTokenRef.current + 1;
    connectionTokenRef.current = connectionToken;

    connectTimeoutRef.current = setTimeout(() => {
      connectTimeoutRef.current = null;

      if (manualCloseRef.current || !device?.id) {
        return;
      }

      if (socketRef.current) {
        return;
      }

      const socket = TcpSocket.createConnection(
        {
          host: LOCAL_RUNTIME_HOST,
          port: LOCAL_RUNTIME_PORT,
          reuseAddress: true,
          connectTimeout: 1500,
        },
        () => {
          if (!isActiveSocket(socket, connectionToken)) {
            return;
          }

          reconnectAttempts.current = 0;
          isIdentifyingRef.current = true;
          updateConnectionState({
            status: 'open',
            connected: false,
            identified: false,
            error: null,
          });
        },
      );

      socketRef.current = socket;
      socket.setNoDelay?.(true);

      socket.on('data', chunk => {
        if (!isActiveSocket(socket, connectionToken)) {
          return;
        }

        const chunkText =
          typeof chunk === 'string'
            ? chunk
            : chunk?.toString?.('utf8') || String(chunk || '');

        if (!chunkText) {
          return;
        }

        inboundBufferRef.current += chunkText;
        const lines = inboundBufferRef.current.split(/\r?\n/);
        inboundBufferRef.current = lines.pop() || '';
        lines.forEach(processIncomingLine);
      });

      socket.on('error', () => {
        if (!isActiveSocket(socket, connectionToken) || manualCloseRef.current) {
          return;
        }

        updateConnectionState({
          status: 'error',
          connected: false,
          identified: false,
        });

        try {
          socket.destroy();
        } catch {
          // noop
        }
      });

      socket.on('close', () => {
        const isCurrentSocket = isActiveSocket(socket, connectionToken);

        if (isCurrentSocket) {
          clearActiveSocket();
        }

        if (!isCurrentSocket) {
          return;
        }

        isIdentifyingRef.current = false;
        updateConnectionState({
          status: manualCloseRef.current ? 'closed' : 'disconnected',
          connected: false,
          identified: false,
          device: device?.id || null,
        });

        if (!manualCloseRef.current) {
          scheduleReconnect();
        }
      });
    }, 80);
  };

  const close = () => {
    manualCloseRef.current = true;
    connectionTokenRef.current += 1;

    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }

    clearActiveSocket();

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    pendingMessagesRef.current = {};
    flushMessagesPromiseRef.current = null;
    inboundBufferRef.current = '';
    isIdentifyingRef.current = false;

    updateConnectionState({
      status: device?.id ? 'closed' : 'idle',
      connected: false,
      identified: false,
      device: device?.id || null,
    });
  };

  useEffect(() => {
    if (device?.id) {
      manualCloseRef.current = false;
      connect();
    } else {
      close();
    }

    return close;
  }, [device?.id]);

  return null;
};

export default WebsocketListener;
