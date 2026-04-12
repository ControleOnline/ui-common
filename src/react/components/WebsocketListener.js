import React, { useEffect, useRef } from 'react';
import { useStore, getAllStores } from '@store';
import { env } from '@env';

export const WebsocketListener = () => {
  const websocketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pendingMessagesRef = useRef({});
  const flushMessagesPromiseRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const isIdentifyingRef = useRef(false);
  const manualCloseRef = useRef(false);

  const url = env.SOCKET;

  const deviceStore = useStore('device');
  const websocketStore = useStore('websocket');
  const { item: device } = deviceStore.getters;
  const websocketActions = websocketStore.actions;

  const stores = getAllStores();
  const getStoreByName = (name) => stores[name];
  const updateConnectionState = (state = {}) => {
    websocketActions.setSummary({
      connected: false,
      identified: false,
      status: 'idle',
      attempts: reconnectAttempts.current,
      updatedAt: new Date().toISOString(),
      ...state,
    });
  };

  const flushPendingMessages = () => {
    flushMessagesPromiseRef.current = null;
    const pendingMessages = pendingMessagesRef.current;
    pendingMessagesRef.current = {};

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

    //console.log('Iniciando conexao WebSocket em:', url);

    websocketRef.current = new WebSocket(url);

    websocketRef.current.onopen = () => {
      //console.log('WebSocket conectado');
      reconnectAttempts.current = 0;
      isIdentifyingRef.current = true;
      updateConnectionState({
        status: 'open',
        connected: false,
        identified: false,
        error: null,
      });

      setTimeout(() => {
        if (!device?.id || !websocketRef.current) return;

        const authPayload = JSON.stringify({
          command: 'identify',
          device: device.id,
        });

        websocketRef.current.send(authPayload);
        //console.log('Identify enviado:', authPayload);
      }, 150);
    };

    websocketRef.current.onmessage = (event) => {
      try {
        if (!event.data) return;
        const payload = JSON.parse(event.data);

        if (payload.status === 'identified') {
          //console.log('Identificacao confirmada pelo servidor:', payload.device);
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
          //console.error('Erro do servidor:', payload.message);
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

    websocketRef.current.onerror = (error) => {
      //console.error('WebSocket onerror:', error);
      updateConnectionState({
        status: 'error',
        connected: false,
        identified: false,
      });
    };

    websocketRef.current.onclose = (event) => {
      //console.log(`Conexao fechada - Code: ${event.code} | Reason: ${event.reason || 'nenhum'}`);
      isIdentifyingRef.current = false;
      updateConnectionState({
        status: manualCloseRef.current ? 'closed' : 'disconnected',
        connected: false,
        identified: false,
        code: event.code,
        reason: event.reason || '',
      });
      scheduleReconnect();
    };
  };

  const scheduleReconnect = () => {
    if (manualCloseRef.current || reconnectTimeoutRef.current) return;

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
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
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
