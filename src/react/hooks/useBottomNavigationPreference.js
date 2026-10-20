import {useEffect, useRef, useState} from 'react';
import {Platform} from 'react-native';

const nativeStorage = () => {
  const module = require('@react-native-async-storage/async-storage');
  return module.default || module;
};
const deviceStorage = {
  getItem: key => Platform.OS === 'web' ? globalThis.localStorage?.getItem(key) : nativeStorage().getItem(key),
  setItem: (key, value) => Platform.OS === 'web' ? globalThis.localStorage.setItem(key, value) : nativeStorage().setItem(key, value),
};

// Visibility is personal device state. It never changes server menu permissions.
export default function useBottomNavigationPreference({enabled, principal, appType, storage = deviceStorage}) {
  const key = enabled && principal && appType
    ? `co.bottom-navigation.v1:${encodeURIComponent(appType)}:${encodeURIComponent(principal)}` : '';
  const current = useRef(key);
  current.current = key;
  const [state, setState] = useState({key: '', ready: false, remembered: true, session: null, error: ''});
  useEffect(() => {
    current.current = key;
    let cancelled = false;
    setState({key, ready: false, remembered: true, session: null, error: ''});
    if (key) Promise.resolve().then(() => storage.getItem(key)).then(value => {
      if (!cancelled) setState({key, ready: true, remembered: value !== 'hidden', session: null, error: ''});
    }).catch(() => {
      if (!cancelled) setState({key, ready: true, remembered: true, session: null, error: 'Não foi possível recuperar a preferência da barra.'});
    });
    return () => {cancelled = true; if (current.current === key) current.current = null;};
  }, [key, storage]);
  const ready = Boolean(key && state.key === key && state.ready);
  const setSessionVisible = visible => {
    if (ready) setState(previous => ({...previous, session: Boolean(visible), error: ''}));
  };
  const setRememberedVisible = async visible => {
    if (!ready) return false;
    try {
      await storage.setItem(key, visible ? 'visible' : 'hidden');
      if (current.current !== key) return false;
      setState(previous => ({...previous, remembered: Boolean(visible), session: null, error: ''}));
      return true;
    } catch {
      if (current.current === key) setState(previous => ({...previous, error: 'Não foi possível lembrar a preferência neste aparelho.'}));
      return false;
    }
  };
  return {ready, visible: ready && (state.session ?? state.remembered), rememberedVisible: ready ? state.remembered : true,
    error: state.key === key ? state.error : '', setSessionVisible, setRememberedVisible};
}
