import React, {createContext, useContext, useEffect, useState} from 'react';
import {StatusBar, View, ActivityIndicator, Text} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import Translate from '@controleonline/ui-common/src/utils/translate';
import {WebsocketListener} from '@controleonline/ui-common/src/react/components/WebsocketListener';
import {getStore} from '@store';
const ThemeContext = createContext();

export const DefaultProvider = ({children}) => {
  const {getters, actions} = getStore('theme');
  const {getters: authGetters, actions: authActions} = getStore('auth');
  const storagedDevice = localStorage.getItem('device');
  const {getters: peopleGetters, actions: peopleActions} = getStore('people');
  const {actions: deviceConfigsActions} = getStore('device_config');
  const {actions: configActions} = getStore('configs');
  const {actions: translateActions} = getStore('translate');
  const {colors, menus} = getters;
  const {currentCompany, defaultCompany, companies} = peopleGetters;
  const {isLogged} = authGetters;
  const [translateReady, setTranslateReady] = useState(false);
  const [localDevice] = useState(() => {
    return storagedDevice ? JSON.parse(storagedDevice) : {};
  });

  useEffect(() => {
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
      let ld = {
        ...localDevice,
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
      localStorage.setItem('device', JSON.stringify(ld));
    };

    fetchDeviceId();
  }, [localDevice]);

  useEffect(() => {
    peopleActions.defaultCompany();
  }, []);

  useEffect(() => {
    if (
      localDevice &&
      isLogged &&
      currentCompany &&
      Object.entries(currentCompany).length > 0
    )
      deviceConfigsActions
        .getItems({
          'device.device': localDevice?.id,
          people: '/people/' + currentCompany.id,
        })
        .then(data => {
          if (data && data.length > 0) {
            let d = {...data[0]};
            d.configs = JSON.parse(d.configs);
            deviceConfigsActions.setItem(d);
          }
        });
  }, [currentCompany, isLogged, localDevice]);

  useEffect(() => {
    if (isLogged && currentCompany && Object.entries(currentCompany).length > 0)
      configActions.setItems(currentCompany.configs);
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
      isLogged &&
      (!currentCompany || Object.entries(currentCompany).length === 0)
    )
      peopleActions.myCompanies();
  }, [isLogged]);

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

    fetchColors();
  }, []);
  if (!translateReady && isLogged) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color="#1B5587" />
        <Text style={{marginTop: 10}}>Carregando...</Text>
      </View>
    );
  }
  return (
    <ThemeContext.Provider value={{colors, menus}}>
      {children}
      <WebsocketListener/>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
