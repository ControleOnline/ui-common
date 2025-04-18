import React, {useEffect, useRef, useState} from 'react';
import {getStore} from '@store';

export const WebsocketListener = () => {
  const websocketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const {actions: configActions} = getStore('configs');

  // Recuperar device.id do localStorage (ou de onde ele estiver armazenado)
  const storagedDevice = localStorage.getItem('device');
  const [localDevice] = useState(() => {
    return storagedDevice ? JSON.parse(storagedDevice) : {};
  });

  const url = 'ws://api.controleonline.com';
  const deviceId = localDevice.id;

  const connect = () => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) return;

    console.log('Conectando WebSocket com URL:', url, 'e cabeçalho device_id:', deviceId);

    const headers = {};
    if (deviceId) {
      headers['X-Device-ID'] = deviceId; 
    }

    websocketRef.current = new WebSocket(url, null, { headers }); 
    websocketRef.current.onopen = () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;
      console.log(
        'WebSocket conectado! URL:',
        url,
        'ReadyState:',
        websocketRef.current.readyState,
        'Device ID (enviado no cabeçalho):',
        deviceId,
      );
    };

    websocketRef.current.onmessage = event => {
      console.log('Dados brutos recebidos:', event.data);
      try {
        const data = JSON.parse(event.data);
        console.log('Mensagem recebida:', data);
        // configActions.update(data);
      } catch (e) {
        console.error('Erro ao processar mensagem:', e, 'Dados:', event.data);
      }
    };

    websocketRef.current.onerror = error => {
      setIsConnected(false);
      console.error('Erro no WebSocket:', error);
    };

    websocketRef.current.onclose = event => {
      setIsConnected(false);
      console.log('WebSocket fechado:', event.code, event.reason);
      scheduleReconnect();
    };
  };

  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) return;
    const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30000);
    reconnectAttempts.current += 1;
    reconnectTimeoutRef.current = setTimeout(() => {
      console.log(
        `Tentando reconectar... Tentativa ${reconnectAttempts.current}`,
      );
      connect();
      reconnectTimeoutRef.current = null;
    }, delay);
  };

  useEffect(() => {
    connect();
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return null;
};