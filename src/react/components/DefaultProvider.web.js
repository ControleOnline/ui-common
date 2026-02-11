import React, {createContext, useContext, useEffect, useState} from 'react';
import {View, ActivityIndicator, Text} from 'react-native';
import Translate from '@controleonline/ui-common/src/utils/translate';
import {WebsocketListener} from '@controleonline/ui-common/src/react/components/WebsocketListener';
import PrintService from '@controleonline/ui-common/src/react/components/PrintService';
import {useStore} from '@store';
import {api} from '@controleonline/ui-common/src/api';
import packageJson from '../../../package.json';

const ThemeContext = createContext();

export const DefaultProvider = ({children}) => {
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
  const [device, setDevice] = useState(
    JSON.parse(localStorage.getItem('device') || '{}'),
  );

  const fetchPublicIP = async () => {
    try {
      const res = await fetch('https://api64.ipify.org?format=json');
      const data = await res.json();
      return data.ip || 'unknow';
    } catch (e) {
      return 'unknow';
    }
  };

  const fetchDeviceId = async () => {
    const ip = await fetchPublicIP();

    const ld = {
      id: ip,
      deviceType: 'web',
      systemName: 'web',
      systemVersion: 'unknow',
      manufacturer: 'unknow',
      model: 'unknow',
      batteryLevel: 'unknow',
      isEmulator: 'unknow',
      appVersion: packageJson.version || 'unknow',
      buildNumber: packageJson.version || 'unknow',
    };

    setDevice(ld);
    localStorage.setItem('device', JSON.stringify(ld));
  };

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
      Object.entries(currentCompany).length > 0
    ) {
      global.t = new Translate(
        defaultCompany,
        currentCompany,
        ['invoice', 'orders'],
        translateActions,
      );
      t.discoveryAll().then(() => {
        setTranslateReady(true);
      });
    }
  }, [currentCompany, isLogged]);

  useEffect(() => {
    if (device && device.id && isLogged) {
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
