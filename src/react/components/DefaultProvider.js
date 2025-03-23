import React, {createContext, useContext, useEffect, useState} from 'react';
import DeviceInfo from 'react-native-device-info';

import {getStore} from '@store';
const ThemeContext = createContext();

export const DefaultProvider = ({children}) => {
  const {getters, actions} = getStore('theme');
  const {getters: authGetters, actions: authActions} = getStore('auth');
  const storagedDevice = localStorage.getItem('device');
  const {getters: peopleGetters, actions: peopleActions} = getStore('people');
  const {getters: configsGetters, actions: configActions} = getStore('configs');
  const {colors, menus} = getters;
  const {currentCompany, defaultCompany, companies} = peopleGetters;
  const {isLoggedIn, user} = authGetters;
  const {item: config, items: companyConfigs} = configsGetters;

  const [device, setDevice] = useState(() => {
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
      let localDevice = {
        ...device,
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
      localStorage.setItem('device', JSON.stringify(localDevice));
    };

    fetchDeviceId();
  }, [device]);

  useEffect(() => {
    peopleActions.defaultCompany();
  }, []);

  useEffect(() => {
    if (
      authActions.isLogged() &&
      companyConfigs &&
      Object.entries(companyConfigs).length > 0
    )
      if (
        companyConfigs['pdv-' + device.id] &&
        (typeof companyConfigs['pdv-' + device.id] === 'object' ||
          companyConfigs['pdv-' + device.id].trim() != '')
      )
        configActions.setItem(JSON.parse(companyConfigs['pdv-' + device.id]));
      else configActions.setItem({});
  }, [companyConfigs, user]);

  useEffect(() => {
    if (
      authActions.isLogged() &&
      currentCompany &&
      Object.entries(currentCompany).length > 0
    )
      configActions.setItems(currentCompany.configs);
  }, [currentCompany, user]);

  useEffect(() => {
    if (
      authActions.isLogged() &&
      (!currentCompany || Object.entries(currentCompany).length === 0)
    )
      peopleActions.myCompanies({
        device: device.id,
      });
  }, [user]);

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

  return (
    <ThemeContext.Provider value={{colors, menus}}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
