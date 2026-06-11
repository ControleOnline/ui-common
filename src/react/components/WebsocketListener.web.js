import React, {useEffect, useRef} from 'react';
import {useStore, getAllStores} from '@store';
import {env} from '@env';
import {createSocketRuntimePipeline} from '@controleonline/ui-common/src/react/utils/socketRuntimePipeline';
import {createWebsocketSharedRuntime} from '@controleonline/ui-common/src/react/utils/websocketSharedRuntime';

export const WebsocketListener = () => {
  const deviceStore = useStore('device');
  const peopleStore = useStore('people');
  const websocketStore = useStore('websocket');
  const runtimeDebugStore = useStore('runtime_debug');

  const {item: device} = deviceStore.getters;
  const {currentCompany} = peopleStore.getters;
  const websocketActions = websocketStore.actions;
  const runtimeDebugActions = runtimeDebugStore.actions;

  const storesRef = useRef(getAllStores());
  const contextRef = useRef({
    deviceId: '',
    companyId: '',
  });
  const pipelineRef = useRef(null);
  const runtimeRef = useRef(null);

  useEffect(() => {
    if (typeof global === 'undefined') {
      return undefined;
    }

    global.__codexInjectInvoiceMessage = message => {
      const stores = getAllStores();
      const invoiceStore = stores?.invoice;

      if (!invoiceStore?.actions?.setMessages) {
        return false;
      }

      const currentMessages = Array.isArray(invoiceStore.getters?.messages)
        ? invoiceStore.getters.messages
        : [];

      invoiceStore.actions.setMessages([...currentMessages, message]);
      return true;
    };

    return () => {
      if (global.__codexInjectInvoiceMessage) {
        delete global.__codexInjectInvoiceMessage;
      }
    };
  }, []);

  contextRef.current = {
    deviceId: String(device?.id || '').trim(),
    companyId: String(currentCompany?.id || '').trim(),
  };

  useEffect(() => {
    const socketUrl = String(env.SOCKET || '').trim();

    if (!device?.id || !socketUrl) {
      runtimeRef.current?.stop?.();
      runtimeRef.current = null;
      pipelineRef.current = null;
      return undefined;
    }

    const pipeline = createSocketRuntimePipeline({
      getDeviceId: () => contextRef.current.deviceId,
      getCurrentCompanyId: () => contextRef.current.companyId,
      websocketActions,
      runtimeDebugActions,
      getStoreByName: name => storesRef.current[name],
    });

    pipelineRef.current = pipeline;

    const runtime = createWebsocketSharedRuntime({
      socketUrl,
      getDeviceId: () => contextRef.current.deviceId,
      pipeline,
    });

    runtimeRef.current = runtime;
    runtime.start();

    return () => {
      runtime.stop();
      runtimeRef.current = null;
      pipelineRef.current = null;
    };
  }, [device?.id, runtimeDebugActions, websocketActions]);

  useEffect(() => {
    pipelineRef.current?.refreshFooter?.();
  }, [currentCompany?.alias, currentCompany?.id, currentCompany?.name, device?.id]);

  return null;
};

export default WebsocketListener;
