import React, { useEffect, useRef } from 'react';
import { useStore, getAllStores } from '@store';
import { env } from '@env';

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
  } catch (e) {
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

export const WebsocketListener = () => {
  const websocketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const connectTimeoutRef = useRef(null);
  const pendingMessagesRef = useRef({});
  const flushMessagesPromiseRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const isIdentifyingRef = useRef(false);
  const manualCloseRef = useRef(false);
  const connectionTokenRef = useRef(0);

  const url = env.SOCKET;

  const deviceStore = useStore('device');
  const peopleStore = useStore('people');
  const websocketStore = useStore('websocket');
  const runtimeDebugStore = useStore('runtime_debug');
  const { item: device } = deviceStore.getters;
  const { currentCompany } = peopleStore.getters;
  const websocketActions = websocketStore.actions;
  const runtimeDebugActions = runtimeDebugStore.actions;

  const stores = getAllStores();
  const getStoreByName = (name) => stores[name];
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
        ? '#22C55E'
        : (socketConnected || ['connecting', 'identifying', 'open', 'reconnecting'].includes(normalizedStatus))
          ? '#F59E0B'
          : '#EF4444';
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
    websocketRef.current === socket &&
    connectionTokenRef.current === connectionToken;

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

  const appendMessageToStore = (data) => {
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

    pendingMessagesRef.current[data.store].push(data);

    if (!flushMessagesPromiseRef.current) {
      flushMessagesPromiseRef.current = Promise.resolve().then(() => {
        flushPendingMessages();
      });
    }
  };

  const connect = () => {
    if (
      connectTimeoutRef.current ||
      websocketRef.current?.readyState === WebSocket.OPEN ||
      websocketRef.current?.readyState === WebSocket.CONNECTING
    ) {
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

    // Atraso curto evita socket fantasma no remount do React web em dev.
    connectTimeoutRef.current = setTimeout(() => {
      connectTimeoutRef.current = null;

      if (manualCloseRef.current || !device?.id) {
        return;
      }

      if (
        websocketRef.current?.readyState === WebSocket.OPEN ||
        websocketRef.current?.readyState === WebSocket.CONNECTING
      ) {
        return;
      }

      const socket = new WebSocket(url);
      websocketRef.current = socket;

      socket.onopen = () => {
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

        setTimeout(() => {
          if (
            !device?.id ||
            !isActiveSocket(socket, connectionToken) ||
            socket.readyState !== WebSocket.OPEN
          ) {
            return;
          }

          const authPayload = JSON.stringify({
            command: 'identify',
            device: device.id,
          });

          socket.send(authPayload);
        }, 150);
      };

      socket.onmessage = (event) => {
        if (!isActiveSocket(socket, connectionToken)) {
          return;
        }

        try {
          if (!event.data) return;
          const payload = JSON.parse(event.data);

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
              error: payload.message || 'WebSocket identify failed',
            });
            return;
          }

          const events = Array.isArray(payload) ? payload : [payload];
          events.forEach(appendMessageToStore);
        } catch (e) {
          //console.error('Erro ao processar mensagem:', e);
        }
      };

      socket.onerror = () => {
        if (!isActiveSocket(socket, connectionToken) || manualCloseRef.current) {
          return;
        }

        updateConnectionState({
          status: 'error',
          connected: false,
          identified: false,
        });
      };

      socket.onclose = (event) => {
        const isCurrentSocket = isActiveSocket(socket, connectionToken);

        if (isCurrentSocket) {
          websocketRef.current = null;
        }

        if (!isCurrentSocket) {
          return;
        }

        isIdentifyingRef.current = false;
        updateConnectionState({
          status: manualCloseRef.current ? 'closed' : 'disconnected',
          connected: false,
          identified: false,
          code: event.code,
          reason: event.reason || '',
        });

        if (!manualCloseRef.current) {
          scheduleReconnect();
        }
      };
    }, 80);
  };

  const scheduleReconnect = () => {
    if (
      manualCloseRef.current ||
      reconnectTimeoutRef.current ||
      connectTimeoutRef.current ||
      websocketRef.current?.readyState === WebSocket.OPEN ||
      websocketRef.current?.readyState === WebSocket.CONNECTING
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

    //console.log(`Agendando reconexao em ${delay}ms (tentativa ${reconnectAttempts.current})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      if (device?.id) connect();
    }, delay);
  };

  const close = () => {
    //console.log('Limpando WebSocket...');
    manualCloseRef.current = true;
    connectionTokenRef.current += 1;

    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }

    const activeSocket = websocketRef.current;
    websocketRef.current = null;
    if (activeSocket) {
      activeSocket.onopen = null;
      activeSocket.onmessage = null;
      activeSocket.onerror = null;
      activeSocket.onclose = null;
      activeSocket.close();
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    pendingMessagesRef.current = {};
    flushMessagesPromiseRef.current = null;
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
