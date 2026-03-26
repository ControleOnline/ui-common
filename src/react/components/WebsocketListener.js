import React, { useEffect, useRef } from 'react';
import { useStore, getAllStores } from '@store';
import { env } from '@env';

export const WebsocketListener = () => {
  const websocketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const isIdentifyingRef = useRef(false);

  const url = env.SOCKET;

  const deviceStore = useStore('device');
  const { item: device } = deviceStore.getters;

  const stores = getAllStores();
  const getStoreByName = (name) => stores[name];

  const connect = () => {
    if (websocketRef.current?.readyState === WebSocket.OPEN || 
        websocketRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    console.log('Iniciando conexão WebSocket em:', url);

    websocketRef.current = new WebSocket(url);

    websocketRef.current.onopen = () => {
      console.log('✅ WebSocket conectado');
      reconnectAttempts.current = 0;
      isIdentifyingRef.current = true;

      setTimeout(() => {
        if (!device?.id || !websocketRef.current) return;

        const authPayload = JSON.stringify({
          command: 'identify',
          device: device.id
        });

        websocketRef.current.send(authPayload);
        console.log('📤 Identify enviado:', authPayload);
      }, 150); // delay maior para handshake
    };

    websocketRef.current.onmessage = (event) => {
      try {
        if (!event.data) return;
        const payload = JSON.parse(event.data);

        if (payload.status === 'identified') {
          console.log('✅ Identificação confirmada pelo servidor:', payload.device);
          isIdentifyingRef.current = false;
          return;
        }

        if (payload.status === 'error') {
          console.error('❌ Erro do servidor:', payload.message);
          isIdentifyingRef.current = false;
          return;
        }

        const data = Array.isArray(payload) ? payload[0] : payload;
        if (data?.store) {
          const storeModule = getStoreByName(data.store);
          if (storeModule) {
            const { getters: messageGetters, actions: messageActions } = storeModule;
            const { messages } = messageGetters;
            messageActions.setMessages([...messages, data]);
          }
        }
      } catch (e) {
        console.error('Erro ao processar mensagem:', e);
      }
    };

    websocketRef.current.onerror = (error) => {
      console.error('⚠️ WebSocket onerror:', error);
    };

    websocketRef.current.onclose = (event) => {
      console.log(`🔴 Conexão fechada - Code: ${event.code} | Reason: ${event.reason || 'nenhum'}`);
      isIdentifyingRef.current = false;
      scheduleReconnect();
    };
  };

  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) return;

    const delay = Math.min(10000 * Math.pow(2, reconnectAttempts.current), 12000);
    reconnectAttempts.current += 1;

    console.log(`⏳ Agendando reconexão em ${delay}ms (tentativa ${reconnectAttempts.current})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      if (device?.id) connect();
    }, delay);
  };

  const close = () => {
    console.log('🧹 Limpando WebSocket...');
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    isIdentifyingRef.current = false;
  };

  useEffect(() => {
    if (device?.id) {
      connect();
    } else {
      close();
    }
    return close;
  }, [device?.id]);

  return null;
};