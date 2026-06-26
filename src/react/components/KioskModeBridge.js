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
  const lastActiveAppStateRef = useRef(appState);
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
    const wasActive = lastActiveAppStateRef.current === 'active';
    const requestedStateChanged = lastRequestedStateRef.current !== kioskEnabled;

    lastActiveAppStateRef.current = appState;

    if (!kioskModeModule) {
      return undefined;
    }

    if (requestedStateChanged) {
      lastRequestedStateRef.current = kioskEnabled;
      kioskModeModule.setKioskMode(kioskEnabled).catch(() => {});
    } else if (kioskEnabled && appState === 'active' && !wasActive) {
      kioskModeModule.setKioskMode(true).catch(() => {});
    }

    if (!kioskEnabled || appState !== 'active') {
      return undefined;
    }

    // The state-sync path already covered the first mount and config flips;
    // only reassert on real foreground resumes to avoid reopening pinning UI.
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
