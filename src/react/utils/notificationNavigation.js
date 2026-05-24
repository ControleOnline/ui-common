const queuedNotificationRequests = [];
const queuedNotificationKeys = new Set();
let notificationNavigationHandler = null;

const normalizeText = value => String(value || '').trim();

const normalizeParams = params => {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    return {};
  }

  return params;
};

const buildRequestKey = ({routeName, params}) => {
  try {
    return `${normalizeText(routeName)}::${JSON.stringify(normalizeParams(params))}`;
  } catch {
    return `${normalizeText(routeName)}::fallback`;
  }
};

export const setNotificationNavigationHandler = handler => {
  notificationNavigationHandler =
    typeof handler === 'function' ? handler : null;

  return () => {
    if (notificationNavigationHandler === handler) {
      notificationNavigationHandler = null;
    }
  };
};

export const flushNotificationNavigationQueue = () => {
  if (typeof notificationNavigationHandler !== 'function') {
    return false;
  }

  let handledAny = false;
  const remainingRequests = [];

  while (queuedNotificationRequests.length > 0) {
    const request = queuedNotificationRequests.shift();
    if (!request) {
      continue;
    }

    try {
      const handled =
        notificationNavigationHandler(request.routeName, request.params) !== false;

      if (handled) {
        queuedNotificationKeys.delete(request.key);
        handledAny = true;
      } else {
        remainingRequests.push(request);
      }
    } catch {
      remainingRequests.push(request);
    }
  }

  queuedNotificationRequests.push(...remainingRequests);
  return handledAny;
};

export const queueNotificationNavigation = (routeName, params = {}) => {
  const normalizedRouteName = normalizeText(routeName);
  if (!normalizedRouteName) {
    return false;
  }

  const request = {
    routeName: normalizedRouteName,
    params: normalizeParams(params),
  };
  request.key = buildRequestKey(request);

  if (queuedNotificationKeys.has(request.key)) {
    return false;
  }

  queuedNotificationKeys.add(request.key);
  queuedNotificationRequests.push(request);
  flushNotificationNavigationQueue();

  return true;
};

export const clearNotificationNavigationQueue = () => {
  queuedNotificationRequests.splice(0, queuedNotificationRequests.length);
  queuedNotificationKeys.clear();
};

