import React, {useEffect, useRef} from 'react';
import {useStores} from '@store';
import {getAllStores} from '@store';
import {env} from '@env';

export const WebsocketListener = () => {
  const websocketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const url = env.SOCKET;
  const deviceStore = useStores(state => state.device);
  const deviceGetters = deviceStore.getters;
  const {item: device} = deviceGetters;
  const stores = getAllStores();
  const getStoreByName = name => stores[name];

  const connect = () => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) return;
    websocketRef.current = new WebSocket(url, null, {
      headers: {'X-Device': device.id},
    });

    websocketRef.current.onopen = () => {
      console.log('Conected:', url, device.id);
      reconnectAttempts.current = 0;
    };

    websocketRef.current.onmessage = async event => {
      console.log('event: ', event);
      try {
        if (!event.data) return;
        const payload = JSON.parse(event.data);
        const data = Array.isArray(payload) ? payload[0] : payload;
        const storeModule = getStoreByName(data.store);
        const {getters: messageGetters, actions: messageActions} = storeModule;
        const {messages} = messageGetters;
        let m = [...messages];
        m.push(data);
        messageActions.setMessages(m);
      } catch (e) {
        console.error('Erro ao processar mensagem:', e, 'Dados:', event.data);
      }
    };

    websocketRef.current.onerror = error => {
      console.debug('WebSocket onerror disparado', {
        error,
        readyState: websocketRef.current?.readyState,
      });
    };

    websocketRef.current.onclose = event => {
      console.debug('WebSocket onclose disparado', {
        code: event.code,
        reason: event.reason,
        readyState: websocketRef.current?.readyState,
      });
      scheduleReconnect();
    };
  };

  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) return;

    const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30000);
    reconnectAttempts.current += 1;

    reconnectTimeoutRef.current = setTimeout(() => {
      console.debug(
        `Tentando reconectar... Tentativa ${reconnectAttempts.current} no device ${device.id}`,
      );
      if (device.id) connect();
      reconnectTimeoutRef.current = null;
    }, delay);
  };

  const close = () => {
    console.debug('Limpando WebSocket...');
    if (websocketRef.current) websocketRef.current.close();
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
  };

  useEffect(() => {
    if (device.id) connect(device.id);
  }, [device]);

  return null;
};
