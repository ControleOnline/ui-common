import {Platform} from 'react-native';

import Formatter from '@controleonline/ui-common/src/utils/formatter';

export const MANAGER_ORDER_NOTIFICATION_PREFERENCES_KEY =
  'managerOrderNotifications';

export const DEFAULT_MANAGER_ORDER_NOTIFICATION_PREFERENCES = {
  pushEnabled: true,
  soundEnabled: false,
  soundUrl: '',
};

const ANDROID_MANAGER_ORDERS_CHANNEL_ID = 'manager-orders';
let notificationsModulePromise = null;
let nativeNotificationHandlerConfigured = false;
let nativeNotificationChannelConfigured = false;

const normalizeText = value => String(value || '').trim();

const parseNumericValue = value => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : NaN;
  }

  const normalizedValue = normalizeText(value);
  if (!normalizedValue) {
    return NaN;
  }

  const sanitizedValue = normalizedValue
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');
  const numericValue = Number(sanitizedValue);

  return Number.isFinite(numericValue) ? numericValue : NaN;
};

const isPlainObject = value =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const normalizeBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    normalizeText(value).toLowerCase() === 'true'
  );
};

const getUserLocalPreferences = user =>
  isPlainObject(user?.localPreferences) ? user.localPreferences : {};

const extractOrderId = value => {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  if (typeof value === 'object') {
    return extractOrderId(value?.id || value?.['@id'] || value?.order || value);
  }

  const numericId = String(value).replace(/\D+/g, '').trim();
  return numericId || normalizeText(value);
};

const resolveCustomerName = message =>
  normalizeText(
    message?.notificationCustomerName ||
      message?.customerName ||
      message?.clientName ||
      message?.client?.alias ||
      message?.client?.name,
  );

const resolvePriceLabel = message => {
  const explicitLabel = normalizeText(
    message?.notificationPriceLabel ||
      message?.priceLabel ||
      message?.orderPriceLabel,
  );

  if (explicitLabel) {
    return explicitLabel;
  }

  const numericPrice = parseNumericValue(
    message?.notificationPrice || message?.orderPrice || message?.price,
  );

  if (Number.isFinite(numericPrice) && numericPrice > 0) {
    return Formatter.formatMoney(numericPrice);
  }

  return '';
};

const toPermissionStatus = permissions => {
  if (permissions?.granted === true) {
    return 'granted';
  }

  if (permissions?.canAskAgain === false) {
    return 'denied';
  }

  return normalizeText(permissions?.status) || 'default';
};

const loadExpoNotifications = async () => {
  if (!notificationsModulePromise) {
    notificationsModulePromise = import('expo-notifications')
      .then(module => module?.default || module)
      .catch(error => {
        notificationsModulePromise = null;
        throw error;
      });
  }

  return notificationsModulePromise;
};

const getWebNotification = () => globalThis.Notification;

const ensureNativeNotificationsReady = async () => {
  const Notifications = await loadExpoNotifications();

  if (
    !nativeNotificationHandlerConfigured &&
    typeof Notifications?.setNotificationHandler === 'function'
  ) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    nativeNotificationHandlerConfigured = true;
  }

  if (
    Platform.OS === 'android' &&
    !nativeNotificationChannelConfigured &&
    typeof Notifications?.setNotificationChannelAsync === 'function'
  ) {
    await Notifications.setNotificationChannelAsync(
      ANDROID_MANAGER_ORDERS_CHANNEL_ID,
      {
        name: 'Pedidos do Gestor',
        importance: Notifications.AndroidImportance?.HIGH ?? 4,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
        sound: null,
        showBadge: false,
      },
    );
    nativeNotificationChannelConfigured = true;
  }

  return Notifications;
};

export const isManagerAppType = appType =>
  normalizeText(appType).toUpperCase() === 'MANAGER';

export const hasStoredManagerOrderNotificationPreferences = user =>
  isPlainObject(
    getUserLocalPreferences(user)?.[MANAGER_ORDER_NOTIFICATION_PREFERENCES_KEY],
  );

export const resolveManagerOrderNotificationPreferences = user => {
  const storedPreferences = hasStoredManagerOrderNotificationPreferences(user)
    ? getUserLocalPreferences(user)[MANAGER_ORDER_NOTIFICATION_PREFERENCES_KEY]
    : {};

  return {
    pushEnabled: normalizeBoolean(
      storedPreferences?.pushEnabled,
      DEFAULT_MANAGER_ORDER_NOTIFICATION_PREFERENCES.pushEnabled,
    ),
    soundEnabled: normalizeBoolean(
      storedPreferences?.soundEnabled,
      DEFAULT_MANAGER_ORDER_NOTIFICATION_PREFERENCES.soundEnabled,
    ),
    soundUrl: normalizeText(
      storedPreferences?.soundUrl ||
        DEFAULT_MANAGER_ORDER_NOTIFICATION_PREFERENCES.soundUrl,
    ),
  };
};

export const applyManagerOrderNotificationPreferences = (user, patch = {}) => {
  const currentPreferences = resolveManagerOrderNotificationPreferences(user);
  const nextPreferences = {
    ...currentPreferences,
    ...(isPlainObject(patch) ? patch : {}),
  };

  return {
    ...(user || {}),
    localPreferences: {
      ...getUserLocalPreferences(user),
      [MANAGER_ORDER_NOTIFICATION_PREFERENCES_KEY]: {
        pushEnabled: normalizeBoolean(nextPreferences.pushEnabled, true),
        soundEnabled: normalizeBoolean(nextPreferences.soundEnabled, false),
        soundUrl: normalizeText(nextPreferences.soundUrl),
      },
    },
  };
};

export const buildManagerOrderNotificationContent = (
  messages = [],
  currentCompany = null,
) => {
  const firstMessage = Array.isArray(messages) ? messages[0] || null : null;
  const orderIds = Array.from(
    new Set(
      (Array.isArray(messages) ? messages : [])
        .map(message => extractOrderId(message?.order))
        .filter(Boolean),
    ),
  );
  const companyLabel = normalizeText(
    currentCompany?.alias || currentCompany?.name || currentCompany?.company,
  );
  const headerTitle = normalizeText(
    firstMessage?.notificationHeader ||
      firstMessage?.headerTitle ||
      firstMessage?.orderHeader,
  );
  const headerSubtitle = normalizeText(
    firstMessage?.notificationSubheader ||
      firstMessage?.headerSubtitle ||
      firstMessage?.orderSubheader,
  );
  const statusLabel =
    normalizeText(
      firstMessage?.notificationStatusLabel ||
        firstMessage?.statusLabel ||
        firstMessage?.queueStatusLabel,
    ) || 'Fila';
  const customerName = resolveCustomerName(firstMessage);
  const priceLabel = resolvePriceLabel(firstMessage);

  if (orderIds.length > 1) {
    return {
      title: `${orderIds.length} novos pedidos`,
      body: companyLabel
        ? `${companyLabel} recebeu ${orderIds.length} novos pedidos. Status: ${statusLabel}.`
        : `${orderIds.length} novos pedidos entraram na ${statusLabel.toLowerCase()}.`,
      orderIds,
      statusLabel,
    };
  }

  const orderLabel = orderIds[0] ? ` #${orderIds[0]}` : '';
  return {
    title: headerTitle || `Novo pedido${orderLabel}`,
    body:
      [headerSubtitle]
        .concat(customerName ? [`Cliente: ${customerName}`] : [])
        .concat(priceLabel ? [`Valor: ${priceLabel}`] : [])
        .concat(companyLabel ? [companyLabel] : [])
        .concat([`Status: ${statusLabel}`])
        .filter(Boolean)
        .join(' | ') || `Novo pedido${orderLabel}`,
    orderIds,
    statusLabel,
  };
};

export const getManagerOrderNotificationPermissionStatus = async () => {
  if (Platform.OS === 'web') {
    const WebNotification = getWebNotification();
    if (typeof WebNotification === 'undefined') {
      return 'unsupported';
    }

    return normalizeText(WebNotification.permission) || 'default';
  }

  try {
    const Notifications = await ensureNativeNotificationsReady();

    if (typeof Notifications?.getPermissionsAsync !== 'function') {
      return 'unsupported';
    }

    return toPermissionStatus(await Notifications.getPermissionsAsync());
  } catch {
    return 'unsupported';
  }
};

export const requestManagerOrderNotificationPermission = async () => {
  if (Platform.OS === 'web') {
    const WebNotification = getWebNotification();
    if (typeof WebNotification === 'undefined') {
      return 'unsupported';
    }

    if (typeof WebNotification.requestPermission !== 'function') {
      return normalizeText(WebNotification.permission) || 'unsupported';
    }

    try {
      return normalizeText(await WebNotification.requestPermission()) || 'default';
    } catch {
      return 'denied';
    }
  }

  try {
    const Notifications = await ensureNativeNotificationsReady();

    if (typeof Notifications?.requestPermissionsAsync !== 'function') {
      return 'unsupported';
    }

    if (typeof Notifications?.getPermissionsAsync === 'function') {
      const currentPermissions = await Notifications.getPermissionsAsync();
      if (currentPermissions?.granted === true) {
        return 'granted';
      }
    }

    return toPermissionStatus(await Notifications.requestPermissionsAsync());
  } catch {
    return 'unsupported';
  }
};

export const showManagerOrderNotification = async ({
  messages = [],
  currentCompany = null,
} = {}) => {
  const {title, body, orderIds} = buildManagerOrderNotificationContent(
    messages,
    currentCompany,
  );

  if (Platform.OS === 'web') {
    const WebNotification = getWebNotification();
    if (
      typeof WebNotification === 'undefined' ||
      normalizeText(WebNotification.permission) !== 'granted'
    ) {
      return false;
    }

    try {
      const notification = new WebNotification(title, {
        body,
        silent: true,
        tag:
          orderIds.length > 0
            ? `manager-order-${orderIds.join('-')}`
            : 'manager-order',
        renotify: true,
      });

      if (notification && typeof notification.close === 'function') {
        setTimeout(() => {
          try {
            notification.close();
          } catch {
            // Ignora browsers que bloqueiam close manual.
          }
        }, 8000);
      }

      return true;
    } catch {
      return false;
    }
  }

  try {
    const Notifications = await ensureNativeNotificationsReady();

    if (typeof Notifications?.getPermissionsAsync === 'function') {
      const permissions = await Notifications.getPermissionsAsync();
      if (permissions?.granted !== true) {
        return false;
      }
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          store: 'orders',
          event: 'order.created',
          orderIds,
          company: currentCompany?.id || null,
        },
      },
      trigger: null,
    });

    return true;
  } catch {
    return false;
  }
};
