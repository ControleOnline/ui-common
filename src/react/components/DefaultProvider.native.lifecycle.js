import {useEffect} from 'react';

// Extracted bootstrap effects retain their dependency arrays and invocation order.

export function useNativeTranslationRefresh({setTranslateVersion}) {
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

export function useNativeTranslationReset({isLogged, isPublicRouteActive, setTranslateReady, setActiveTranslateBootstrapKey, translateBootstrapKeyRef, translateActions}) {
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

export function useNativeAppLifecycle({AppState, setAppState}) {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      setAppState(nextState || 'active');
    });

    return () => {
      subscription?.remove?.();
    };
  }, []);
}

export function useNativeNativeVersion({DeviceInfo, device, fetchDeviceId}) {
  useEffect(() => {
    const checkVersion = async () => {
      const appVersion = await DeviceInfo.getVersion();
      if (
        device &&
        ((device.appVersion && device.appVersion != appVersion) || !device.appName)
      ) {
        fetchDeviceId();
      }
    };
    checkVersion();
  }, [device]);
}

export function useNativeNativeDeviceIdentity({device, fetchDeviceId, deviceActions}) {
  useEffect(() => {
    if (!device || !device.id) {
      fetchDeviceId();
    } else {
      deviceActions.setItem(device);
    }
  }, [device]);
}

export function useNativeMainCompany({device, peopleActions}) {
  useEffect(() => {
    if (device && device.id) {
      peopleActions.mainCompany();
    }
  }, [device?.id]);
}

export function useNativeDeviceConfigReset({deviceConfigPeopleIri, lastDeviceConfigPeopleIriRef, setDeviceConfigFetched, setDeviceRuntimeConfigSynced, deviceConfigsActions}) {
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

export function useNativeDeviceRegistration({sessionChecked, isLogged, deviceConfigPeopleIri, device, deviceConfigFetched, currentCompany, canAdministerCompany, mainCompany, user, deviceActions, runtimeDeviceType, buildDeviceRegistrationPayload, app_type, hasDeviceRecordChanges, setDevice}) {
  useEffect(() => {
    if (!sessionChecked || !isLogged || !deviceConfigPeopleIri || !device?.id || deviceConfigFetched) {
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
        people: deviceConfigPeopleIri,
        type: runtimeDeviceType,
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
          metadata: {
            ...(existingDevice?.metadata || {}),
            ...(nextDevice.metadata || {}),
          },
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
        metadata: {
          ...(savedDevice?.metadata || {}),
          ...(nextDevice.metadata || {}),
        },
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
    device?.id,
    device?.metadata,
    device?.manufacturer,
    device?.model,
    device?.systemVersion,
    deviceConfigFetched,
    deviceConfigPeopleIri,
    isLogged,
    currentCompany,
    mainCompany,
    sessionChecked,
    runtimeDeviceType,
    user,
  ]);
}

export function useNativePrinters({isShopClientApp, sessionChecked, isLogged, currentCompany, printerActions}) {
  useEffect(() => {
    if (isShopClientApp || !sessionChecked || !isLogged || !currentCompany?.id) {
      return;
    }

    printerActions
      .ensureCompanyPrintersLoaded({people: currentCompany.id})
      .catch(() => {});
  }, [currentCompany?.id, isLogged, isShopClientApp, printerActions, sessionChecked]);
}

export function useNativePaymentTypes({isShopClientApp, companyConfigs, currentCompany, device_config, paymentTypeActions, mainConfigsDiscovered, api, selectPosWalletPaymentTypes, getPaymentGateway}) {
  useEffect(() => {
    const paymentConfigSource = isShopClientApp
      ? Object.keys(companyConfigs || {}).length > 0
        ? companyConfigs
        : currentCompany?.configs
      : device_config?.configs;

    if (!currentCompany?.id || !paymentConfigSource) {
      paymentTypeActions.setItems([]);
      return;
    }

    if (!isShopClientApp && !mainConfigsDiscovered) {
      return;
    }

    let isMounted = true;

    api
      .fetch('wallet_payment_types', {
        params: {
          people: `/people/${currentCompany.id}`,
        },
      })
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
      })
      .catch(() => {
        if (isMounted) {
          paymentTypeActions.setItems([]);
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

export function useNativeDeviceConfigFetch({device, isLogged, currentCompany, setDeviceConfigFetched, setDeviceRuntimeConfigSynced, deviceConfigsActions, runtimeDeviceType, parseConfigsObject}) {
  useEffect(() => {
    if (
      device &&
      device.id &&
      isLogged &&
      currentCompany &&
      Object.entries(currentCompany).length > 0
    ) {
      setDeviceConfigFetched(false);
      setDeviceRuntimeConfigSynced(false);
      deviceConfigsActions
        .getItems({
          'device.device': device.id,
          people: '/people/' + currentCompany.id,
          type: runtimeDeviceType,
        })
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            const nextItem = {
              ...data[0],
              configs: parseConfigsObject(data[0]?.configs),
            };
            deviceConfigsActions.setItem(nextItem);
            return;
          }

          deviceConfigsActions.setItem({});
        })
        .catch(() => {})
        .finally(() => {
          setDeviceConfigFetched(true);
        });
    }
  }, [currentCompany?.id, isLogged, device?.id, runtimeDeviceType]);
}
