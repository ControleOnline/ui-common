import React, {useEffect, useMemo, useRef} from 'react';
import {AppState, BackHandler, NativeModules, Platform} from 'react-native';
import {env as APP_ENV} from '@env';
import {useStore} from '@store';
import {shouldEnableAndroidKioskMode} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';

const kioskModeModule = NativeModules?.KioskMode;
const REASSERT_INTERVAL_MS = 15000;

const KioskModeBridge = ({appState = AppState.currentState || 'active'}) => {
  const deviceConfigStore = useStore('device_config');
  const {item: runtimeDeviceConfig} = deviceConfigStore.getters;
  const lastRequestedStateRef = useRef(null);
  const appType = String(APP_ENV.APP_TYPE || '').trim().toUpperCase();
  const kioskEnabled = useMemo(
    () =>
      shouldEnableAndroidKioskMode({
        appType,
        configs: runtimeDeviceConfig?.configs,
        platform: Platform.OS,
      }),
    [appType, runtimeDeviceConfig?.configs],
  );

  useEffect(() => {
    if (!kioskModeModule) {
      return;
    }

    if (lastRequestedStateRef.current === kioskEnabled) {
      return;
    }

    lastRequestedStateRef.current = kioskEnabled;
    kioskModeModule.setKioskMode(kioskEnabled).catch(() => {});
  }, [kioskEnabled]);

  useEffect(() => {
    if (!kioskModeModule || !kioskEnabled || appState !== 'active') {
      return undefined;
    }

    kioskModeModule.setKioskMode(true).catch(() => {});

    const intervalId = setInterval(() => {
      kioskModeModule.setKioskMode(true).catch(() => {});
    }, REASSERT_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [appState, kioskEnabled]);

  useEffect(() => {
    if (!kioskEnabled) {
      return undefined;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => true,
    );

    return () => {
      subscription?.remove?.();
    };
  }, [kioskEnabled]);

  return null;
};

export default KioskModeBridge;
