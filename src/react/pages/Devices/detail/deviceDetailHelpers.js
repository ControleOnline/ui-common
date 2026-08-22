import {normalizeEntityId} from '@controleonline/ui-common/src/react/utils/paymentDevices';
import {isPosCashRegisterOpen} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {Alert, Platform} from 'react-native';
import {PAYMENT_ICONS} from './deviceDetailConstants';

export const paymentIcon = label => {
  const l = String(label || '').toLowerCase();
  if (l.includes('pix')) return PAYMENT_ICONS.pix;
  if (l.includes('debit')) return PAYMENT_ICONS.debito;
  if (l.includes('crédit') || l.includes('credit')) return PAYMENT_ICONS.credito;
  if (l.includes('dinh')) return PAYMENT_ICONS.dinheiro;
  return PAYMENT_ICONS.default;
};

export const formatApiError = (error, fallback) => {
  if (typeof error === 'string') {
    return error.trim() || fallback;
  }
  if (Array.isArray(error?.message)) {
    return (
      error.message
        .map(item => item?.message || item?.title || String(item || '').trim())
        .filter(Boolean)
        .join('\n') || fallback
    );
  }
  return error?.message || error?.description || fallback;
};

export const getDisplayLabel = display => {
  const name = String(display?.display || '').trim();
  const type = String(display?.displayType || '').trim().toUpperCase();
  if (name && type) return `${name} (${type})`;
  if (name) return name;
  return `Display #${normalizeEntityId(display) || '--'}`;
};

export const getProductShowcaseLabel = showcase => {
  const name = String(showcase?.name || '').trim();
  const externalCode = String(showcase?.externalStoreCode || '').trim();
  if (name && externalCode) return `${name} (${externalCode})`;
  return name || externalCode || `Showcase #${normalizeEntityId(showcase) || '--'}`;
};

export const getIsOpen = configs => isPosCashRegisterOpen(configs);

export const confirm = (msg, cb) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
    if (window.confirm(msg)) cb();
  } else {
    Alert.alert('Confirmação', msg, [
      {text: 'Cancelar', style: 'cancel'},
      {text: 'Confirmar', onPress: cb},
    ]);
  }
};

export const getDeviceSwitchProps = ({disabled = false, palette, value = false}) => {
  const offTrackColor = disabled ? palette.switchDisabledTrack : palette.switchOffTrack;
  const onTrackColor = disabled ? palette.switchDisabledTrack : palette.switchOnTrack;
  return {
    ios_backgroundColor: offTrackColor,
    thumbColor: disabled
      ? palette.switchDisabledThumb
      : value
        ? palette.switchOnThumb
        : palette.switchOffThumb,
    trackColor: {false: offTrackColor, true: onTrackColor},
  };
};
