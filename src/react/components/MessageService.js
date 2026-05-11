import React, {createContext, useContext, useEffect, useState} from 'react';
import {Dimensions} from 'react-native';
import {
  Portal,
  Dialog,
  Paragraph,
  Button,
  TextInput as PaperTextInput,
} from 'react-native-paper';
import {toast, ToastPosition} from '@backpackapp-io/react-native-toast';
import SystemErrorToast from './SystemErrorToast';
import {
  TOAST_DEFAULT_BOTTOM_OFFSET,
  TOAST_DEFAULT_DURATION,
  TOAST_DEFAULT_TOP_OFFSET,
  TOAST_MODAL_COUNT_KEY,
  TOAST_PROVIDER_KEYS,
} from './toastConfig';
import {
  withErrorToastStyles,
  withWarningToastStyles,
} from '@controleonline/ui-common/src/react/utils/toastPresentation';
import {
  publishSystemError,
  subscribeSystemErrors,
} from '@controleonline/ui-common/src/react/utils/systemErrorChannel'

const MessageContext = createContext();

export const useMessage = () => useContext(MessageContext);

const normalizeMessage = message => {
  if (message === undefined || message === null) return ''
  return message
}

const getDefaultProviderKey = () => {
  const modalDepth = Number(global?.[TOAST_MODAL_COUNT_KEY] || 0)
  if (modalDepth > 0) {
    return TOAST_PROVIDER_KEYS.PERSIST
  }

  return TOAST_PROVIDER_KEYS.ROOT
}

const normalizeOptions = (options = {}, fallbackPosition = 'top') => {
  const {
    duration = TOAST_DEFAULT_DURATION,
    position = fallbackPosition,
    offsetTop,
    offsetBottom,
    providerKey,
    styles: stylesOverride,
    ...rest
  } = options

  const pressableAdjustments = {}

  if (position === 'center') {
    const screenCenterOffset = Math.max(
      0,
      Math.round(Dimensions.get('window').height * 0.45) -
        TOAST_DEFAULT_TOP_OFFSET,
    )
    if (screenCenterOffset > 0) {
      pressableAdjustments.marginTop = screenCenterOffset
    }
  }

  if (position !== 'bottom' && typeof offsetTop === 'number') {
    const topDiff = offsetTop - TOAST_DEFAULT_TOP_OFFSET
    if (topDiff !== 0) {
      pressableAdjustments.marginTop =
        (pressableAdjustments.marginTop || 0) + topDiff
    }
  }

  if (position === 'bottom' && typeof offsetBottom === 'number') {
    const bottomDiff = offsetBottom - TOAST_DEFAULT_BOTTOM_OFFSET
    if (bottomDiff !== 0) {
      pressableAdjustments.marginBottom = bottomDiff
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
      : stylesOverride

  return {
    duration,
    position: position === 'bottom' ? ToastPosition.BOTTOM : ToastPosition.TOP,
    providerKey: providerKey || getDefaultProviderKey(),
    ...rest,
    ...(mergedStyles ? {styles: mergedStyles} : {}),
  }
}

export const MessageProvider = ({children}) => {
  const [dialog, setDialog] = useState({
    visible: false,
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
  });
  const [prompt, setPrompt] = useState({
    visible: false,
    title: '',
    message: '',
    value: '',
    placeholder: '',
    confirmLabel: '',
    cancelLabel: '',
    keyboardType: 'default',
    resolve: null,
  });

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
    return publishSystemError(message, options)
  };

  const showWarning = (message, options = {}) => {
    return showToast(
      message,
      withWarningToastStyles({
        position: 'top',
        offsetTop: TOAST_DEFAULT_TOP_OFFSET,
        ...options,
      }),
    );
  };

  const showInfo = (message, options = {}) => {
    return showToast(message, {
      position: 'top',
      offsetTop: TOAST_DEFAULT_TOP_OFFSET,
      ...options,
    });
  };

  useEffect(() => {
    return subscribeSystemErrors(({error, message, options = {}}) => {
      toast.error(
        <SystemErrorToast error={error || message} />,
        normalizeOptions(
          withErrorToastStyles({
            position: 'top',
            offsetTop: TOAST_DEFAULT_TOP_OFFSET,
            ...options,
          }),
          'top',
        ),
      )
    })
  }, [])

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

  const hidePrompt = () =>
    setPrompt({
      visible: false,
      title: '',
      message: '',
      value: '',
      placeholder: '',
      confirmLabel: '',
      cancelLabel: '',
      keyboardType: 'default',
      resolve: null,
    });

  const showPrompt = ({
    title,
    message,
    defaultValue = '',
    placeholder = '',
    confirmLabel = '',
    cancelLabel = '',
    keyboardType = 'default',
  }) =>
    new Promise(resolve => {
      setPrompt({
        visible: true,
        title: normalizeMessage(title),
        message: normalizeMessage(message),
        value: normalizeMessage(defaultValue),
        placeholder: normalizeMessage(placeholder),
        confirmLabel: normalizeMessage(confirmLabel),
        cancelLabel: normalizeMessage(cancelLabel),
        keyboardType,
        resolve,
      });
    });

  return (
    <MessageContext.Provider
      value={{
        showToast,
        showDialog,
        showPrompt,
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

        <Dialog
          visible={prompt.visible}
          onDismiss={() => {
            prompt.resolve?.(null);
            hidePrompt();
          }}>
          <Dialog.Title>{prompt.title}</Dialog.Title>
          <Dialog.Content>
            {!!prompt.message && <Paragraph>{prompt.message}</Paragraph>}
            <PaperTextInput
              autoFocus
              mode="outlined"
              value={prompt.value}
              onChangeText={value => {
                setPrompt(currentPrompt => ({
                  ...currentPrompt,
                  value,
                }));
              }}
              keyboardType={prompt.keyboardType || 'default'}
              placeholder={prompt.placeholder}
              returnKeyType="done"
              onSubmitEditing={() => {
                const resolvedValue = String(prompt.value || '').trim();
                prompt.resolve?.(resolvedValue || null);
                hidePrompt();
              }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                prompt.resolve?.(null);
                hidePrompt();
              }}>
              {prompt.cancelLabel || 'Cancelar'}
            </Button>
            <Button
              onPress={() => {
                const resolvedValue = String(prompt.value || '').trim();
                prompt.resolve?.(resolvedValue || null);
                hidePrompt();
              }}>
              {prompt.confirmLabel || 'Confirmar'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </MessageContext.Provider>
  );
};
