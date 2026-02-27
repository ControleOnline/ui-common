import React, {createContext, useContext, useEffect, useState} from 'react';
import {View, ActivityIndicator, Text} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import Translate from '@controleonline/ui-common/src/utils/translate';
import {WebsocketListener} from '@controleonline/ui-common/src/react/components/WebsocketListener';
import PrintService from '@controleonline/ui-common/src/react/components/PrintService';

import {useStore} from '@store';
const ThemeContext = createContext();

export const DefaultProvider = ({children, onBootstrapReady}) => {
  const themeStore = useStore('theme');
  const getters = themeStore.getters;
  const actions = themeStore.actions;
  const authStore = useStore('auth');
  const authGetters = authStore.getters;
  const peopleStore = useStore('people');
  const peopleGetters = peopleStore.getters;
  const peopleActions = peopleStore.actions;

  const deviceStore = useStore('device');
  const deviceActions = deviceStore.actions;

  const device_configStore = useStore('device_config');
  const deviceConfigsGetters = device_configStore.getters;
  const deviceConfigsActions = device_configStore.actions;

  const configsStore = useStore('configs');
  const configActions = configsStore.actions;
  const configsGetters = configsStore.getters;
  const printerStore = useStore('printer');
  const printerActions = printerStore.actions;
  const walletPaymentTypeStore = useStore('walletPaymentType');
  const paymentTypeActions = walletPaymentTypeStore.actions;
  const translateStore = useStore('translate');
  const translateActions = translateStore.actions;
  const {items: companyConfigs} = configsGetters;
  const {colors, menus} = getters;
  const {currentCompany, defaultCompany} = peopleGetters;
  const {item: device_config} = deviceConfigsGetters;
  const {isLogged} = authGetters;
  const [translateReady, setTranslateReady] = useState(false);
  const [deviceConfigFetched, setDeviceConfigFetched] = useState(false);
  const [, setTranslateVersion] = useState(0);
  const [device, setDevice] = useState(
    JSON.parse(localStorage.getItem('device') || '{}'),
  );

  useEffect(() => {
    global.refreshTranslationsUI = () => {
      setTranslateVersion(version => version + 1);
    };

    return () => {
      if (global.refreshTranslationsUI) {
        delete global.refreshTranslationsUI;
      }
    };
  }, []);

  const fetchDeviceId = async () => {
    const uniqueId = await DeviceInfo.getUniqueId();
    const deviceId = await DeviceInfo.getDeviceId();
    const appName = DeviceInfo.getApplicationName();
    const systemName = await DeviceInfo.getSystemName();
    const systemVersion = await DeviceInfo.getSystemVersion();
    const manufacturer = await DeviceInfo.getManufacturer();
    const model = await DeviceInfo.getModel();
    const batteryLevel = await DeviceInfo.getBatteryLevel();
    const isEmulator = await DeviceInfo.isEmulator();
    const appVersion = await DeviceInfo.getVersion();
    const buildNumber = await DeviceInfo.getBuildNumber();
    let ld = null;
    if (uniqueId) {
      ld = {
        id: uniqueId,
        appName: appName,
        deviceType: deviceId,
        systemName: systemName,
        systemVersion: systemVersion,
        manufacturer: manufacturer,
        model: model,
        batteryLevel: batteryLevel,
        isEmulator: isEmulator,
        appVersion: appVersion,
        buildNumber: buildNumber,
      };
      setDevice(ld);
      localStorage.setItem('device', JSON.stringify(ld));
    } else {
      setTimeout(() => {
        fetchDeviceId();
      }, 300);
    }
  };
  useEffect(() => {
    const checkVersion = async () => {
      const appVersion = await DeviceInfo.getVersion();
      if (
        device &&
        ((device.appVersion && device.appVersion != appVersion) || !device.appName)
      ) {
        fetchDeviceId();
      }
    };
    checkVersion();
  }, [device]);

  useEffect(() => {
    if (!device || !device.id) {
      fetchDeviceId();
    } else {
      deviceActions.setItem(device);
    }
  }, [device]);

  useEffect(() => {
    if (device && device.id) {
      peopleActions.defaultCompany();
    }
  }, [device]);

  useEffect(() => {
    if (currentCompany && currentCompany.id) {
      printerActions.getPrinters({people: currentCompany.id});
    }
  }, [currentCompany]);

  useEffect(() => {
    if (
      companyConfigs &&
      device_config?.configs &&
      Object.entries(device_config.configs).length > 0 &&
      device_config.configs['pos-gateway']
    ) {
      let wallets = [];

      if (
        companyConfigs[
          'pos-' + device_config.configs['pos-gateway'] + '-wallet'
        ]
      ) {
        wallets.push(
          companyConfigs[
            'pos-' + device_config.configs['pos-gateway'] + '-wallet'
          ],
        );
      }

      if (companyConfigs['pos-cash-wallet']) {
        wallets.push(companyConfigs['pos-cash-wallet']);
      }

      paymentTypeActions.getItems({
        people: '/people/' + currentCompany.id,
        wallet: wallets,
      });
    }
  }, [currentCompany, companyConfigs, device_config]);

  useEffect(() => {
    if (
      device &&
      device.id &&
      isLogged &&
      currentCompany &&
      Object.entries(currentCompany).length > 0
    ) {
      setDeviceConfigFetched(false);
      deviceConfigsActions
        .getItems({
          'device.device': device.id,
          people: '/people/' + currentCompany.id,
        })
        .then(data => {
          if (data && data.length > 0) {
            let d = {...data[0]};
            d.configs = JSON.parse(d.configs);
            deviceConfigsActions.setItem(d);
          }
        })
        .catch(() => {})
        .finally(() => {
          setDeviceConfigFetched(true);
        });
    }
  }, [currentCompany, isLogged, device]);

  useEffect(() => {
    if (
      isLogged &&
      currentCompany &&
      Object.entries(currentCompany).length > 0
    ) {
      configActions.setItems(currentCompany.configs);
    }
  }, [currentCompany, isLogged]);

  useEffect(() => {
    if (
      isLogged &&
      currentCompany &&
      Object.entries(currentCompany).length > 0 &&
      deviceConfigFetched
    ) {
      const configuredLanguage =
        device_config?.configs?.language ||
        'pt-BR';
      const currentConfig = JSON.parse(localStorage.getItem('config') || '{}');

      if (currentConfig.language !== configuredLanguage) {
        localStorage.setItem(
          'config',
          JSON.stringify({...currentConfig, language: configuredLanguage}),
        );
      }

      global.t = new Translate(
        defaultCompany,
        currentCompany,
        [],
        translateActions,
      );

      if (global.t.hasCache()) {
        setTranslateReady(true);
        return;
      }

      global.t.discoveryAll().then(() => {
        setTranslateReady(true);
      });
    }
  }, [currentCompany, defaultCompany, device_config, deviceConfigFetched, isLogged]);

  useEffect(() => {
    if (!isLogged || translateReady) {
      onBootstrapReady?.();
    }
  }, [isLogged, translateReady, onBootstrapReady]);


  useEffect(() => {
    if (
      device &&
      device.id &&
      isLogged
    ) {
      peopleActions.myCompanies();
    }
  }, [isLogged, device]);

  useEffect(() => {
    const fetchColors = async () => {
      const cssText = await api.fetch('themes-colors.css', {
        responseType: 'text',
      });

      const parsedColors = {};
      const matches = cssText.match(/--[\w-]+:\s*#[0-9a-fA-F]+/g);
      if (matches) {
        matches.forEach(match => {
          const [key, value] = match.split(':');
          const cleanKey = key.replace('--', '').trim();
          parsedColors[cleanKey] = value.trim();
        });
      }
      actions.setColors(parsedColors);
    };

    if (device && device.id) {
      fetchColors();
    }
  }, [device]);
  if (!translateReady && isLogged) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color="#1B5587" />
        <Text style={{marginTop: 10}}>Carregando...</Text>
      </View>
    );
  }
  return (
    device &&
    device.id && (
      <ThemeContext.Provider value={{colors, menus}}>
        {children}
        <WebsocketListener />
        <PrintService />
      </ThemeContext.Provider>
    )
  );
};

export const useTheme = () => useContext(ThemeContext);