const normalizeText = value => String(value ?? '').trim();

const formatClock = value => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return '--';
  }

  try {
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) {
      return '--';
    }

    const pad = entry => String(entry).padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
      date.getSeconds(),
    )}`;
  } catch {
    return '--';
  }
};

const truncateText = (value, max = 44) => {
  const normalized = normalizeText(value);
  if (!normalized || normalized.length <= max) {
    return normalized || '--';
  }

  return `${normalized.slice(0, max - 3)}...`;
};

const isFilledObject = value =>
  !!value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.keys(value).length > 0;

const parsePayload = rawPayload => {
  if (typeof rawPayload !== 'string') {
    return rawPayload;
  }

  const normalized = rawPayload.trim();
  if (!normalized) {
    return null;
  }

  try {
    return JSON.parse(normalized);
  } catch {
    return null;
  }
};

const createSocketRuntimePipeline = ({
  getDeviceId = () => '',
  getCurrentCompanyId = () => '',
  websocketActions = {},
  runtimeDebugActions = {},
  getStoreByName = () => null,
  source = 'background-runtime',
} = {}) => {
  let pendingMessages = {};
  let flushMessagesPromise = null;
  let currentState = {
    connected: false,
    identified: false,
    status: 'idle',
    attempts: 0,
    updatedAt: new Date().toISOString(),
    device: normalizeText(getDeviceId()) || null,
    error: null,
    code: null,
    reason: '',
    ownerRegistrationId: '',
    ownerPackageName: '',
    ownerCompanyId: normalizeText(getCurrentCompanyId()),
    lastEventAt: null,
    lastEventCount: 0,
    lastStores: [],
    lastCompanies: [],
  };

  const publishSocketFooterEntry = (state = currentState) => {
    if (typeof runtimeDebugActions?.setFooterEntry !== 'function') {
      return;
    }

    const socketConnected = Boolean(state?.connected);
    const socketIdentified = Boolean(state?.identified);
    const normalizedStatus = normalizeText(state?.status).toLowerCase();
    const stateLabel = socketConnected
      ? socketIdentified
        ? 'socket:on'
        : 'socket:open'
      : `socket:${normalizedStatus || 'off'}`;

    const indicatorColor =
      socketConnected && socketIdentified
        ? '#22C55E'
        : (socketConnected ||
            ['connecting', 'identifying', 'open', 'reconnecting'].includes(
              normalizedStatus,
            ))
          ? '#F59E0B'
          : '#EF4444';

    const lastSocketStores = Array.isArray(state?.lastStores)
      ? state.lastStores.filter(Boolean).join(', ')
      : '';
    const lastSocketCompanies = Array.isArray(state?.lastCompanies)
      ? state.lastCompanies.filter(Boolean).join(', ')
      : '';

    runtimeDebugActions.setFooterEntry({
      key: 'socket',
      order: 10,
      indicatorColor,
      updatedAt: state?.updatedAt || new Date().toISOString(),
      lines: [
        `Realtime ${stateLabel} | empresa: ${normalizeText(
          getCurrentCompanyId(),
        ) || '--'} | device: ${truncateText(
          state?.device || getDeviceId() || '--',
          34,
        )}`,
        `ultimo socket: ${formatClock(state?.lastEventAt)} | eventos: ${Number(
          state?.lastEventCount || 0,
        )} | stores: ${truncateText(
          lastSocketStores || '--',
          28,
        )} | empresas: ${truncateText(lastSocketCompanies || '--', 18)}`,
      ],
    });
  };

  const updateConnectionState = (state = {}) => {
    const nextState = {
      ...currentState,
      connected: false,
      identified: false,
      status: 'idle',
      attempts: 0,
      updatedAt: new Date().toISOString(),
      device: normalizeText(getDeviceId()) || currentState.device || null,
      error: null,
      code: null,
      reason: '',
      ownerRegistrationId: '',
      ownerPackageName: '',
      ownerCompanyId: normalizeText(getCurrentCompanyId()) || '',
      lastEventAt: null,
      lastEventCount: 0,
      lastStores: [],
      lastCompanies: [],
      ...state,
    };

    nextState.device =
      normalizeText(nextState.device) || normalizeText(getDeviceId()) || null;
    nextState.ownerRegistrationId = normalizeText(
      nextState.ownerRegistrationId,
    );
    nextState.ownerPackageName = normalizeText(nextState.ownerPackageName);
    nextState.ownerCompanyId =
      normalizeText(nextState.ownerCompanyId) ||
      normalizeText(getCurrentCompanyId()) ||
      '';
    nextState.error = normalizeText(nextState.error) || null;
    nextState.reason = normalizeText(nextState.reason);
    nextState.status = normalizeText(nextState.status) || 'idle';
    nextState.attempts = Number(nextState.attempts || 0);
    nextState.lastEventCount = Number(nextState.lastEventCount || 0);
    nextState.lastStores = Array.isArray(nextState.lastStores)
      ? nextState.lastStores.filter(Boolean)
      : [];
    nextState.lastCompanies = Array.isArray(nextState.lastCompanies)
      ? nextState.lastCompanies.filter(Boolean)
      : [];

    currentState = nextState;

    if (typeof websocketActions?.setSummary === 'function') {
      websocketActions.setSummary(nextState);
    }

    publishSocketFooterEntry(nextState);
    return nextState;
  };

  const flushPendingMessages = () => {
    flushMessagesPromise = null;
    const pending = pendingMessages;
    pendingMessages = {};
    const deliveredStores = new Set();
    const deliveredCompanies = new Set();
    let deliveredMessages = 0;

    Object.entries(pending).forEach(([storeName, messages]) => {
      if (!Array.isArray(messages) || messages.length === 0) {
        return;
      }

      const storeModule = getStoreByName(storeName);
      const messageActions = storeModule?.actions || {};
      if (typeof messageActions?.setMessages !== 'function') {
        return;
      }

      const messageGetters = storeModule?.getters || {};
      const currentMessages = Array.isArray(messageGetters?.messages)
        ? messageGetters.messages
        : [];

      messageActions.setMessages([...currentMessages, ...messages]);
      deliveredMessages += messages.length;
      deliveredStores.add(storeName);

      messages.forEach(message => {
        const companyId = normalizeText(
          message?.company?.id || message?.companyId || message?.company || '',
        );
        if (companyId) {
          deliveredCompanies.add(companyId);
        }
      });
    });

    return {
      deliveredMessages,
      deliveredStores: Array.from(deliveredStores),
      deliveredCompanies: Array.from(deliveredCompanies),
    };
  };

  const scheduleFlush = () => {
    if (!flushMessagesPromise) {
      flushMessagesPromise = Promise.resolve().then(() => flushPendingMessages());
    }
  };

  const appendMessageToStore = event => {
    if (!event?.store) {
      return false;
    }

    const storeModule = getStoreByName(event.store);
    if (
      !storeModule?.actions ||
      typeof storeModule.actions.setMessages !== 'function'
    ) {
      return false;
    }

    if (!Array.isArray(pendingMessages[event.store])) {
      pendingMessages[event.store] = [];
    }

    pendingMessages[event.store].push({
      ...event,
      source: event?.source || source,
    });

    scheduleFlush();
    return true;
  };

  const processPayload = rawPayload => {
    const payload = parsePayload(rawPayload);
    if (!payload) {
      return currentState;
    }

    if (payload.type === 'socket-state') {
      return updateConnectionState({
        connected: Boolean(payload.connected),
        identified: Boolean(payload.identified),
        status: normalizeText(payload.status) || 'connected',
        attempts: Number(payload.attempts || 0),
        updatedAt: payload.updatedAt || new Date().toISOString(),
        device: normalizeText(payload.device) || normalizeText(getDeviceId()),
        error: normalizeText(payload.error) || null,
        code: payload.code ?? null,
        reason: normalizeText(payload.reason),
        ownerRegistrationId:
          normalizeText(payload.ownerRegistrationId) ||
          currentState.ownerRegistrationId ||
          '',
        ownerPackageName:
          normalizeText(payload.ownerPackageName) ||
          currentState.ownerPackageName ||
          '',
        ownerCompanyId:
          normalizeText(payload.ownerCompanyId) ||
          currentState.ownerCompanyId ||
          normalizeText(getCurrentCompanyId()) ||
          '',
        lastEventAt: payload.lastEventAt || null,
        lastEventCount: Number(payload.lastEventCount || 0),
        lastStores: Array.isArray(payload.lastStores)
          ? payload.lastStores.filter(Boolean)
          : [],
        lastCompanies: Array.isArray(payload.lastCompanies)
          ? payload.lastCompanies.filter(Boolean)
          : [],
      });
    }

    const normalizedStatus = normalizeText(payload.status).toLowerCase();
    if (normalizedStatus === 'identified') {
      return updateConnectionState({
        connected: true,
        identified: true,
        status: 'connected',
        attempts: 0,
        updatedAt: new Date().toISOString(),
        device: normalizeText(payload.device) || normalizeText(getDeviceId()),
        error: null,
        code: null,
        reason: '',
        ownerRegistrationId: currentState.ownerRegistrationId || '',
        ownerPackageName: currentState.ownerPackageName || '',
        ownerCompanyId:
          currentState.ownerCompanyId || normalizeText(getCurrentCompanyId()),
        lastEventAt: currentState.lastEventAt,
        lastEventCount: currentState.lastEventCount,
        lastStores: currentState.lastStores,
        lastCompanies: currentState.lastCompanies,
      });
    }

    if (normalizedStatus === 'error') {
      const message = normalizeText(payload.message) || 'Background runtime identify failed';
      return updateConnectionState({
        connected: false,
        identified: false,
        status: 'error',
        attempts: Number(payload.attempts || 0),
        updatedAt: new Date().toISOString(),
        device: normalizeText(payload.device) || normalizeText(getDeviceId()),
        error: message,
        code: payload.code ?? null,
        reason: message,
        ownerRegistrationId: currentState.ownerRegistrationId || '',
        ownerPackageName: currentState.ownerPackageName || '',
        ownerCompanyId:
          currentState.ownerCompanyId || normalizeText(getCurrentCompanyId()),
        lastEventAt: currentState.lastEventAt,
        lastEventCount: currentState.lastEventCount,
        lastStores: currentState.lastStores,
        lastCompanies: currentState.lastCompanies,
      });
    }

    const events = Array.isArray(payload) ? payload : [payload];
    const deliveredStores = new Set();
    const deliveredCompanies = new Set();
    let deliveredMessages = 0;

    events.filter(isFilledObject).forEach(event => {
      const store = normalizeText(event?.store).toLowerCase();
      if (store) {
        deliveredStores.add(store);
      }

      const companyId = normalizeText(
        event?.company?.id || event?.companyId || event?.company || '',
      );
      if (companyId) {
        deliveredCompanies.add(companyId);
      }

      if (appendMessageToStore(event)) {
        deliveredMessages += 1;
      }
    });

    if (deliveredMessages > 0) {
      return updateConnectionState({
        connected: true,
        identified: true,
        status: 'connected',
        attempts: 0,
        updatedAt: new Date().toISOString(),
        device: normalizeText(getDeviceId()) || currentState.device || null,
        error: null,
        code: null,
        reason: '',
        ownerRegistrationId: currentState.ownerRegistrationId || '',
        ownerPackageName: currentState.ownerPackageName || '',
        ownerCompanyId:
          currentState.ownerCompanyId || normalizeText(getCurrentCompanyId()),
        lastEventAt: new Date().toISOString(),
        lastEventCount: deliveredMessages,
        lastStores: Array.from(deliveredStores),
        lastCompanies: Array.from(deliveredCompanies),
      });
    }

    return currentState;
  };

  const refreshFooter = () => {
    publishSocketFooterEntry(currentState);
    return currentState;
  };

  const reset = () => {
    pendingMessages = {};
    flushMessagesPromise = null;
    return updateConnectionState({
      connected: false,
      identified: false,
      status: normalizeText(getDeviceId()) ? 'closed' : 'idle',
      attempts: 0,
      updatedAt: new Date().toISOString(),
      device: normalizeText(getDeviceId()) || null,
      error: null,
      code: null,
      reason: '',
      ownerRegistrationId: '',
      ownerPackageName: '',
      ownerCompanyId: normalizeText(getCurrentCompanyId()) || '',
      lastEventAt: null,
      lastEventCount: 0,
      lastStores: [],
      lastCompanies: [],
    });
  };

  return {
    appendMessageToStore,
    formatClock,
    getConnectionState: () => currentState,
    normalizeText,
    processPayload,
    publishSocketFooterEntry,
    refreshFooter,
    reset,
    truncateText,
    updateConnectionState,
  };
};

export {createSocketRuntimePipeline, formatClock, normalizeText, truncateText};
