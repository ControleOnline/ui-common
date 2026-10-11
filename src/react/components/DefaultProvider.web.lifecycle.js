import {useEffect} from 'react';

// Extracted bootstrap effects retain their dependency arrays and invocation order.

export function useWebTranslationRefresh({setTranslateVersion}) {
  useEffect(() => {
    global.refreshTranslationsUI = () => {
      setTranslateVersion(version => version + 1);
    };

    return () => {
      if (global.refreshTranslationsUI) {
        delete global.refreshTranslationsUI;
      }
    };
  }, []);
}

export function useWebTranslationReset({isLogged, isPublicRouteActive, setTranslateReady, setActiveTranslateBootstrapKey, translateBootstrapKeyRef, translateActions}) {
  useEffect(() => {
    if (isLogged && !isPublicRouteActive) {
      return;
    }

    setTranslateReady(true);
    setActiveTranslateBootstrapKey('');
    translateBootstrapKeyRef.current = '';
    translateActions.setMessages({});
    translateActions.setPendingMessages?.({});

    if (global.t) {
      delete global.t;
    }
  }, [isLogged, isPublicRouteActive, translateActions]);
}

export function useWebDeviceConfigReset({deviceConfigPeopleIri, lastDeviceConfigPeopleIriRef, setDeviceConfigFetched, setDeviceRuntimeConfigSynced, deviceConfigsActions}) {
  useEffect(() => {
    if (
      !deviceConfigPeopleIri ||
      lastDeviceConfigPeopleIriRef.current === deviceConfigPeopleIri
    ) {
      return;
    }

    lastDeviceConfigPeopleIriRef.current = deviceConfigPeopleIri;
    setDeviceConfigFetched(false);
    setDeviceRuntimeConfigSynced(false);
    deviceConfigsActions.setItem({});
  }, [deviceConfigPeopleIri, deviceConfigsActions]);
}

export function useWebRuntimeIp({isLogged, api, getRuntimeIpFromResponse, setWebRuntimeIp, user}) {
  useEffect(() => {
    if (!isLogged) {
      return;
    }

    let cancelled = false;

    api
      .fetch('runtime/ip', {
        method: 'GET',
      })
      .then(response => {
        const nextRuntimeIp = getRuntimeIpFromResponse(response);
        if (!nextRuntimeIp || cancelled) {
          return;
        }

        setWebRuntimeIp(currentIp =>
          currentIp === nextRuntimeIp ? currentIp : nextRuntimeIp,
        );
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isLogged, user?.id]);
}

export function useWebWebDeviceIdentity({isLogged, isShopClientApp, buildWebDevice, lastWebDeviceSyncRef, setDevice, deviceActions, packageVersion, user, webRuntimeIp}) {
  useEffect(() => {
    if (!isLogged && !isShopClientApp) {
      return;
    }

    const nextDevice = buildWebDevice();
    if (!nextDevice) {
      return;
    }

    const signature = JSON.stringify({
      id: nextDevice.id,
      appVersion: nextDevice.appVersion,
      appName: nextDevice.appName,
      type: nextDevice.type,
      metadata: nextDevice.metadata || {},
      externalIp: nextDevice.externalIp || null,
    });

    if (lastWebDeviceSyncRef.current === signature) {
      return;
    }

    lastWebDeviceSyncRef.current = signature;
    setDevice(nextDevice);
    localStorage.setItem('device', JSON.stringify(nextDevice));
    deviceActions.setItem(nextDevice);
    localStorage.removeItem('master-device');
  }, [deviceActions, isLogged, isShopClientApp, packageVersion, user?.id, webRuntimeIp]);
}

export function useWebMainCompany({isShopClientApp, device, peopleActions}) {
  useEffect(() => {
    if (isShopClientApp || device?.id) {
      peopleActions.mainCompany().catch(() => {});
    }
  }, [device?.id, isShopClientApp, peopleActions]);
}

export function useWebDeviceRegistration({isLogged, device, currentCompany, canAdministerCompany, mainCompany, user, deviceActions, buildDeviceRegistrationPayload, app_type, hasDeviceRecordChanges, runtimeDeviceType, setDevice}) {
  useEffect(() => {
    if (!isLogged || !device?.id) {
      return;
    }

    // Device registration changes tenant context and is not valid without an
    // active company or administrative authority for that company.
    if (
      !currentCompany?.id ||
      !canAdministerCompany({company: currentCompany, mainCompany, user})
    ) {
      return;
    }

    let cancelled = false;

    const syncDeviceRegistration = async () => {
      const items = await deviceActions.getItems({
        device: device.id,
      });

      if (cancelled) {
        return;
      }

      const existingDevice =
        Array.isArray(items) && items.length > 0 ? items[0] : null;
      const nextDevice = buildDeviceRegistrationPayload({
        deviceInfo: device,
        appType: app_type,
        existingDevice,
      });

      if (!hasDeviceRecordChanges({existingDevice, nextDevice})) {
        const nextLocalDevice = {
          ...device,
          entityId: existingDevice?.id || device?.entityId || null,
          entityIri:
            existingDevice?.['@id'] ||
            device?.entityIri ||
            (existingDevice?.id ? `/devices/${existingDevice.id}` : null),
          alias: existingDevice?.alias || nextDevice.alias,
          type: device?.type || runtimeDeviceType,
          metadata: existingDevice?.metadata || nextDevice.metadata,
        };

        if (JSON.stringify(nextLocalDevice) !== JSON.stringify(device)) {
          setDevice(nextLocalDevice);
          localStorage.setItem('device', JSON.stringify(nextLocalDevice));
          deviceActions.setItem(nextLocalDevice);
        }
        return;
      }

      const savedDevice = await deviceActions.save(nextDevice);
      if (cancelled || !savedDevice) {
        return;
      }

      const nextLocalDevice = {
        ...device,
        entityId: savedDevice?.id || device?.entityId || null,
        entityIri:
          savedDevice?.['@id'] ||
          device?.entityIri ||
          (savedDevice?.id ? `/devices/${savedDevice.id}` : null),
        alias: savedDevice.alias || nextDevice.alias,
        type: device?.type || runtimeDeviceType,
        metadata: savedDevice.metadata || nextDevice.metadata,
      };

      if (JSON.stringify(nextLocalDevice) !== JSON.stringify(device)) {
        setDevice(nextLocalDevice);
        localStorage.setItem('device', JSON.stringify(nextLocalDevice));
        deviceActions.setItem(nextLocalDevice);
      }
    };

    syncDeviceRegistration().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [
    device?.appVersion,
    device?.batteryLevel,
    device?.buildNumber,
    device?.deviceType,
    device?.externalIp,
    device?.id,
    device?.manufacturer,
    device?.model,
    device?.systemVersion,
    isLogged,
    currentCompany,
    mainCompany,
    runtimeDeviceType,
    user,
  ]);
}

export function useWebPrinters({isShopClientApp, isLogged, currentCompany, printerActions}) {
  useEffect(() => {
    if (isShopClientApp || !isLogged || !currentCompany?.id) {
      return;
    }

    printerActions
      .ensureCompanyPrintersLoaded({people: currentCompany.id})
      .catch(() => {});
  }, [currentCompany?.id, isLogged, isShopClientApp, printerActions]);
}

export function useWebPaymentTypes({isShopClientApp, companyConfigs, currentCompany, device_config, walletPaymentTypeRequestRef, walletPaymentTypeLoadedKeyRef, paymentTypeActions, mainConfigsDiscovered, resolveDevicePaymentTypeIds, api, selectPosWalletPaymentTypes, getPaymentGateway}) {
  useEffect(() => {
    const paymentConfigSource = isShopClientApp
      ? Object.keys(companyConfigs || {}).length > 0
        ? companyConfigs
        : currentCompany?.configs
      : device_config?.configs;

    if (!currentCompany?.id || !paymentConfigSource) {
      walletPaymentTypeRequestRef.current = {key: '', promise: null};
      walletPaymentTypeLoadedKeyRef.current = '';
      paymentTypeActions.setItems([]);
      return;
    }

    if (!isShopClientApp && !mainConfigsDiscovered) {
      return;
    }

    const paymentTypeSignature = resolveDevicePaymentTypeIds(paymentConfigSource)
      .sort()
      .join(',');
    const requestKey = `${currentCompany.id}:${paymentTypeSignature}`;

    if (walletPaymentTypeLoadedKeyRef.current === requestKey) {
      return;
    }

    const existingRequestPromise =
      walletPaymentTypeRequestRef.current.key === requestKey &&
      walletPaymentTypeRequestRef.current.promise
        ? walletPaymentTypeRequestRef.current.promise
        : null;

    let isMounted = true;

    const requestPromise =
      existingRequestPromise ||
      api.fetch('wallet_payment_types', {
          params: {
            people: `/people/${currentCompany.id}`,
          },
        });

    if (!existingRequestPromise) {
      walletPaymentTypeRequestRef.current = {
        key: requestKey,
        promise: requestPromise,
      };
    }

    requestPromise
      .then(response => {
        if (!isMounted) {
          return;
        }

        const walletPaymentTypes = Array.isArray(response?.member)
          ? response.member
          : Array.isArray(response?.['hydra:member'])
            ? response['hydra:member']
            : Array.isArray(response)
              ? response
              : [];
        paymentTypeActions.setItems(
          selectPosWalletPaymentTypes({
            walletPaymentTypes,
            deviceConfigs: paymentConfigSource,
            companyConfigs,
            gateway: getPaymentGateway(device_config || paymentConfigSource),
          }),
        );
        walletPaymentTypeLoadedKeyRef.current = requestKey;
      })
      .catch(() => {
        if (isMounted) {
          paymentTypeActions.setItems([]);
        }
      })
      .finally(() => {
        if (
          walletPaymentTypeRequestRef.current.key === requestKey &&
          walletPaymentTypeRequestRef.current.promise === requestPromise
        ) {
          walletPaymentTypeRequestRef.current = {key: '', promise: null};
        }
      });

    return () => {
      isMounted = false;
    };
  }, [
    companyConfigs,
    currentCompany?.configs,
    currentCompany?.id,
    device_config?.configs,
    isShopClientApp,
    paymentTypeActions,
  ]);
}
