import React, {useEffect, useMemo, useRef} from 'react';
import {AppState, NativeModules, Platform} from 'react-native';
import {env as APP_ENV} from '@env';
import {useStore} from '@store';
import {shouldEnableAndroidLauncherMode} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';

const launcherModeModule = NativeModules?.LauncherMode;

const LauncherModeBridge = ({appState = AppState.currentState || 'active'}) => {
  const deviceConfigStore = useStore('device_config');
  const {item: runtimeDeviceConfig} = deviceConfigStore.getters;
  const lastRequestedStateRef = useRef(null);
  const lastActiveAppStateRef = useRef(appState);
  const appType = String(app_type || '').trim().toUpperCase();
  const launcherEnabled = useMemo(
    () =>
      shouldEnableAndroidLauncherMode({
        appType,
        configs: runtimeDeviceConfig?.configs,
        platform: Platform.OS,
      }),
    [appType, runtimeDeviceConfig?.configs],
  );

  useEffect(() => {
    const wasActive = lastActiveAppStateRef.current === 'active';
    const requestedStateChanged =
      lastRequestedStateRef.current !== launcherEnabled;

    lastActiveAppStateRef.current = appState;

    if (!launcherModeModule) {
      return undefined;
    }

    if (requestedStateChanged) {
      lastRequestedStateRef.current = launcherEnabled;
      launcherModeModule.setLauncherMode(launcherEnabled).catch(() => {});
    } else if (launcherEnabled && appState === 'active' && !wasActive) {
      launcherModeModule.setLauncherMode(true).catch(() => {});
    }
  }, [appState, launcherEnabled]);

  return null;
};

export default LauncherModeBridge;
