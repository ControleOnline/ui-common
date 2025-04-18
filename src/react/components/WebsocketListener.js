import React, {useEffect, useState, useRef} from 'react';
import {getStore} from '@store';

export const WebsocketListener = () => {
  const websocketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const {getters: printGetters, actions: printActions} = getStore('print');
  const url = 'ws://api.controleonline.com';
  const device = JSON.parse(localStorage.getItem('device') || '{}');
  const headers = {'X-Device': device.id};

  const connect = () => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) return;
    websocketRef.current = new WebSocket(url, null, {headers});
    websocketRef.current.onopen = () => {
      reconnectAttempts.current = 0;
    };

    websocketRef.current.onmessage = async event => {
      try {
        if (!event.data) return;

        const payload = JSON.parse(event.data);
        console.log(payload);
        const data = Array.isArray(payload) ? payload[0] : payload;
        if (data.action == 'print') printActions.addToPrint(data);
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
        `Tentando reconectar... Tentativa ${reconnectAttempts.current}`,
      );
      connect();
      reconnectTimeoutRef.current = null;
    }, delay);
  };

  const close = () => {
    console.debug('Limpando WebSocket...');
    if (websocketRef.current) websocketRef.current.close();
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
  };

  useEffect(() => {
    connect();
    //return () => close();
  }, []);

  return null;
};
