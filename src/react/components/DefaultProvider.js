import React, {createContext, useContext, useEffect, useState} from 'react';
import {View, ActivityIndicator, Text} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import Translate from '@controleonline/ui-common/src/utils/translate';
import {WebsocketListener} from '@controleonline/ui-common/src/react/components/WebsocketListener';
import PrintService from '@controleonline/ui-common/src/react/components/PrintService';

import {getStore} from '@store';
const ThemeContext = createContext();

export const DefaultProvider = ({children}) => {
  const {getters, actions} = getStore('theme');
  const {getters: authGetters} = getStore('auth');
  const {getters: peopleGetters, actions: peopleActions} = getStore('people');

  const {actions: deviceActions} = getStore('device');

  const {getters: deviceConfigsGetters, actions: deviceConfigsActions} =
    getStore('device_config');

  const {actions: configActions, getters: configsGetters} = getStore('configs');
  const {actions: printerActions} = getStore('printer');
  const {actions: paymentTypeActions} = getStore('walletPaymentType');
  const {actions: translateActions} = getStore('translate');
  const {items: companyConfigs} = configsGetters;
  const {colors, menus} = getters;
  const {currentCompany, defaultCompany} = peopleGetters;
  const {item: device_config} = deviceConfigsGetters;
  const {isLogged} = authGetters;
  const [translateReady, setTranslateReady] = useState(false);
  const [device, setDevice] = useState(
    JSON.parse(localStorage.getItem('device') || '{}'),
  );

  const fetchDeviceId = async () => {
    const uniqueId = await DeviceInfo.getUniqueId();
    const deviceId = await DeviceInfo.getDeviceId();
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
    checkVersion = async () => {
      const appVersion = await DeviceInfo.getVersion();
      if (device && device.appVersion && device.appVersion != appVersion) {
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
      window.t = new Translate(
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
