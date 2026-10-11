import {Alert, Platform} from 'react-native';

export const confirmAction = (message, onConfirm) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
    if (window.confirm(message)) onConfirm();
  } else {
    Alert.alert('Confirmação', message, [
      {text: 'Cancelar', style: 'cancel'},
      {text: 'Confirmar', onPress: onConfirm},
    ]);
  }
};
