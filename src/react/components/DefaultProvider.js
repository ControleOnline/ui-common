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
  const {item: config} = configsGetters;

  const [device, setDevice] = useState(() => {
    return storagedDevice ? JSON.parse(storagedDevice) : {};
  });

  useEffect(() => {
    const fetchDeviceId = async () => {
      const id = await DeviceInfo.getUniqueId();
      let localDevice = {...device};
      localDevice.id = id;
      localStorage.setItem('device', JSON.stringify(localDevice));
    };

    fetchDeviceId();
  }, [device]);

  useEffect(() => {
    if (!config && device)
      configActions
        .getItems({
          configKey: 'pdv-' + device.id,
        })
        .then(data => {
          let c = {};
          if (data && data[0]) c = JSON.parse(data[0]?.configValue);
          configActions.setItem(c);
        });
  }, [device]);

  useEffect(() => {
    const fetchMenus = async () => {
      if (!currentCompany) return;
      const response = await api.fetch('menus-people', {
        params: {myCompany: currentCompany.id},
      });

      actions.setMenus(response);
    };
    fetchMenus();
  }, [currentCompany]);
  useEffect(() => {
    peopleActions.defaultCompany();
  }, []);

  useEffect(() => {
    if (!isLoggedIn) authActions.isLogged();
    if (
      isLoggedIn &&
      (!currentCompany || Object.entries(currentCompany).length === 0)
    )
      peopleActions.myCompanies();
  }, [isLoggedIn, user]);

  useEffect(() => {
    const fetchColors = async () => {
      const response = await api.fetch('themes-colors.css', {
        responseType: 'text',
      });
      const cssText = await response.text();

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
