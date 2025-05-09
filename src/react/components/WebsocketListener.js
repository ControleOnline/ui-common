import React, {useEffect, useState, useRef} from 'react';
import {getStore} from '@store';
import {env} from '@env';
import Sound from 'react-native-sound';

export const WebsocketListener = () => {
  const websocketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const {actions: printActions} = getStore('print');
  const url = env.SOCKET;
  const {getters: deviceGetters, actions: deviceActions} = getStore('device');
  const {item: device} = deviceGetters;

  const playSound = file => {
    const sound = new Sound(
      file.toLowerCase() + '.mp3',
      Sound.MAIN_BUNDLE,
      error => {
        if (error) return;
        sound.play(() => sound.release());
      },
    );
  };

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
      try {
        if (!event.data) return;
        const payload = JSON.parse(event.data);
        console.log('Ws:', payload);
        const data = Array.isArray(payload) ? payload[0] : payload;
        if (data.action == 'print') printActions.setReload(true);
        if (data.sound) playSound(data.sound);
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
