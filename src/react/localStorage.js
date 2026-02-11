import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

if (Platform.OS !== 'web') {
  let store = {};

  (async () => {
    const keys = await AsyncStorage.getAllKeys();
    const pairs = await AsyncStorage.multiGet(keys);
    pairs.forEach(([key, value]) => {
      store[key] = value;
    });
  })();

  global.localStorage = {
    getItem: key => store[key] ?? null,
    setItem: (key, value) => {
      store[key] = value;
      AsyncStorage.setItem(key, value);
    },
    removeItem: key => {
      delete store[key];
      AsyncStorage.removeItem(key);
    },
    clear: () => {
      store = {};
      AsyncStorage.clear();
    },
  };
}