import React, {createContext, useContext, useState} from 'react';
import {Dimensions} from 'react-native';
import {Portal, Dialog, Paragraph, Button} from 'react-native-paper';
import {toast, ToastPosition} from '@backpackapp-io/react-native-toast';
import {
  TOAST_DEFAULT_BOTTOM_OFFSET,
  TOAST_DEFAULT_DURATION,
  TOAST_DEFAULT_TOP_OFFSET,
  TOAST_MODAL_COUNT_KEY,
  TOAST_PROVIDER_KEYS,
} from './toastConfig';

const MessageContext = createContext();

export const useMessage = () => useContext(MessageContext);

export const MessageProvider = ({children}) => {
  const [dialog, setDialog] = useState({
    visible: false,
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
  });

  const normalizeMessage = message => {
    if (message === undefined || message === null) return '';
    return message;
  };

  const getDefaultProviderKey = () => {
    const modalDepth = Number(global?.[TOAST_MODAL_COUNT_KEY] || 0);
    if (modalDepth > 0) {
      return TOAST_PROVIDER_KEYS.PERSIST;
    }

    return TOAST_PROVIDER_KEYS.ROOT;
  };

  const normalizeOptions = (options = {}, fallbackPosition = 'top') => {
    const {
      duration = TOAST_DEFAULT_DURATION,
      position = fallbackPosition,
      offsetTop,
      offsetBottom,
      providerKey,
      styles: stylesOverride,
      ...rest
    } = options;

    const pressableAdjustments = {};

    if (position === 'center') {
      const screenCenterOffset = Math.max(
        0,
        Math.round(Dimensions.get('window').height * 0.45) -
          TOAST_DEFAULT_TOP_OFFSET,
      );
      if (screenCenterOffset > 0) {
        pressableAdjustments.marginTop = screenCenterOffset;
      }
    }

    if (position !== 'bottom' && typeof offsetTop === 'number') {
      const topDiff = offsetTop - TOAST_DEFAULT_TOP_OFFSET;
      if (topDiff !== 0) {
        pressableAdjustments.marginTop =
          (pressableAdjustments.marginTop || 0) + topDiff;
      }
    }

    if (position === 'bottom' && typeof offsetBottom === 'number') {
      const bottomDiff = offsetBottom - TOAST_DEFAULT_BOTTOM_OFFSET;
      if (bottomDiff !== 0) {
        pressableAdjustments.marginBottom = bottomDiff;
      }
    }

    const mergedStyles =
      Object.keys(pressableAdjustments).length > 0
        ? {
            ...(stylesOverride || {}),
            pressable: {
              ...(stylesOverride?.pressable || {}),
              ...pressableAdjustments,
            },
          }
        : stylesOverride;

    return {
      duration,
      position: position === 'bottom' ? ToastPosition.BOTTOM : ToastPosition.TOP,
      providerKey: providerKey || getDefaultProviderKey(),
      ...rest,
      ...(mergedStyles ? {styles: mergedStyles} : {}),
    };
  };

  const showToast = (message, options = {}) => {
    return toast(normalizeMessage(message), normalizeOptions(options, 'center'));
  };

  // Backward-compatible aliases used by older module code
  const showSuccess = (message, options = {}) => {
    return toast.success(
      normalizeMessage(message),
      normalizeOptions(
        {position: 'top', offsetTop: TOAST_DEFAULT_TOP_OFFSET, ...options},
        'top',
      ),
    );
  };

  const showError = (message, options = {}) => {
    return toast.error(
      normalizeMessage(message),
      normalizeOptions(
        {position: 'top', offsetTop: TOAST_DEFAULT_TOP_OFFSET, ...options},
        'top',
      ),
    );
  };

  const showWarning = (message, options = {}) => {
    return showToast(message, {
      position: 'top',
      offsetTop: TOAST_DEFAULT_TOP_OFFSET,
      ...options,
      styles: {
        ...(options?.styles || {}),
        indicator: {
          ...(options?.styles?.indicator || {}),
          backgroundColor: '#F59E0B',
        },
      },
    });
  };

  const showInfo = (message, options = {}) => {
    return showToast(message, {
      position: 'top',
      offsetTop: TOAST_DEFAULT_TOP_OFFSET,
      ...options,
    });
  };

  const showDialog = ({title, message, onConfirm, onCancel}) => {
    setDialog({
      visible: true,
      title,
      message,
      onConfirm,
      onCancel,
    });
  };

  const hideDialog = () => setDialog(d => ({...d, visible: false}));

  return (
    <MessageContext.Provider
      value={{
        showToast,
        showDialog,
        showSuccess,
        showError,
        showWarning,
        showInfo,
      }}>
      {children}

      <Portal>
        <Dialog visible={dialog.visible} onDismiss={hideDialog}>
          <Dialog.Title>{dialog.title}</Dialog.Title>
          <Dialog.Content>
            <Paragraph>{dialog.message}</Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                hideDialog();
                dialog.onCancel?.();
              }}>
              Cancelar
            </Button>
            <Button
              onPress={() => {
                hideDialog();
                dialog.onConfirm?.();
              }}>
              Confirmar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </MessageContext.Provider>
  );
};
