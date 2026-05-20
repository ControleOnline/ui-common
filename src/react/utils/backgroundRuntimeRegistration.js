const safeTrim = value => String(value || '').trim();

const serializeRegistration = registration => {
  try {
    return JSON.stringify(registration);
  } catch {
    return '';
  }
};

export const syncBackgroundRuntimeRegistration = ({
  backgroundRuntimeModule,
  registration,
  lastRegistrationIdRef,
  lastRegistrationPayloadRef,
} = {}) => {
  if (!backgroundRuntimeModule) {
    return;
  }

  const nextRegistrationId = safeTrim(registration?.registrationId);
  const nextPayload = registration ? serializeRegistration(registration) : '';

  if (!nextRegistrationId || !nextPayload) {
    const previousRegistrationId = lastRegistrationIdRef?.current || '';
    if (lastRegistrationIdRef) {
      lastRegistrationIdRef.current = '';
    }

    if (lastRegistrationPayloadRef) {
      lastRegistrationPayloadRef.current = '';
    }

    if (previousRegistrationId) {
      backgroundRuntimeModule.clearRegistration(previousRegistrationId).catch(
        () => {},
      );
    }

    return;
  }

  if (
    lastRegistrationIdRef?.current === nextRegistrationId &&
    lastRegistrationPayloadRef?.current === nextPayload
  ) {
    return;
  }

  const previousRegistrationId = lastRegistrationIdRef?.current || '';
  if (
    previousRegistrationId &&
    previousRegistrationId !== nextRegistrationId
  ) {
    backgroundRuntimeModule.clearRegistration(previousRegistrationId).catch(
      () => {},
    );
  }

  if (lastRegistrationIdRef) {
    lastRegistrationIdRef.current = nextRegistrationId;
  }

  if (lastRegistrationPayloadRef) {
    lastRegistrationPayloadRef.current = nextPayload;
  }

  backgroundRuntimeModule.syncRegistration(nextPayload).catch(() => {});
};
