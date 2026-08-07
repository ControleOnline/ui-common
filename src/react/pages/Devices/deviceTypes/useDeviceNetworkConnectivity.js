import {useEffect, useState} from 'react';
import {
  checkNetworkPrinterConnection,
  isNetworkPrinterRuntimeSupported,
} from '@controleonline/ui-common/src/react/services/NetworkPrinterService';
import {
  getDeviceConfigType,
  isManagedNetworkDeviceType,
  getPrinterHost,
  normalizePrinterPort,
  DEFAULT_NETWORK_PRINTER_PORT,
  NETWORK_PRINTER_PORT_CONFIG_KEY,
} from '@controleonline/ui-common/src/react/utils/printerDevices';
import {normalizeDeviceId} from '@controleonline/ui-common/src/react/utils/paymentDevices';
import {parseConfigsObject} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';

export function useDeviceNetworkConnectivity(deviceConfigs) {
  const [networkConnectivityByDevice, setNetworkConnectivityByDevice] = useState({});

  useEffect(() => {
    const networkDeviceConfigs = deviceConfigs.filter(deviceConfig =>
      isManagedNetworkDeviceType(getDeviceConfigType(deviceConfig)),
    );

    if (networkDeviceConfigs.length === 0) {
      setNetworkConnectivityByDevice({});
      return;
    }

    if (!isNetworkPrinterRuntimeSupported) {
      setNetworkConnectivityByDevice(
        networkDeviceConfigs.reduce((acc, deviceConfig) => {
        const deviceKey = normalizeDeviceId(
          deviceConfig?.device?.device || deviceConfig?.device?.id || deviceConfig?.id,
        );

        if (deviceKey) {
          acc[deviceKey] = {status: 'unsupported'};
        }

        return acc;
        }, {}),
      );
      return;
    }

    let cancelled = false;

    setNetworkConnectivityByDevice(previousState => {
      const nextState = {...previousState};

      networkDeviceConfigs.forEach(deviceConfig => {
        const deviceKey = normalizeDeviceId(
        deviceConfig?.device?.device || deviceConfig?.device?.id || deviceConfig?.id,
        );

        if (deviceKey) {
        nextState[deviceKey] = {
          ...(nextState[deviceKey] || {}),
          status: 'checking',
        };
        }
      });

      return nextState;
    });

    Promise.all(
      networkDeviceConfigs.map(async deviceConfig => {
        const deviceKey = normalizeDeviceId(
        deviceConfig?.device?.device || deviceConfig?.device?.id || deviceConfig?.id,
        );
        const parsedConfigs = parseConfigsObject(deviceConfig?.configs);
        const host = getPrinterHost({
        ...(deviceConfig?.device || {}),
        configs: parsedConfigs,
        });
        const port = normalizePrinterPort(
        parsedConfigs?.[NETWORK_PRINTER_PORT_CONFIG_KEY] ||
          DEFAULT_NETWORK_PRINTER_PORT,
        );

        if (!deviceKey || !host) {
        return [
          deviceKey,
          {
            status: 'offline',
            error: 'IP ou hostname nao configurado.',
          },
        ];
        }

        try {
        await checkNetworkPrinterConnection({host, port});

        return [
          deviceKey,
          {
            status: 'online',
            host,
            port,
            checkedAt: Date.now(),
          },
        ];
        } catch (connectError) {
        return [
          deviceKey,
          {
            status: 'offline',
            host,
            port,
            checkedAt: Date.now(),
            error:
            connectError?.message || 'Falha ao conectar com o equipamento.',
          },
        ];
        }
      }),
    ).then(results => {
      if (cancelled) {
        return;
      }

      setNetworkConnectivityByDevice(previousState => {
        const nextState = {...previousState};

        results.forEach(([deviceKey, statusEntry]) => {
        if (!deviceKey) {
          return;
        }

        nextState[deviceKey] = statusEntry;
        });

        return nextState;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [deviceConfigs]);

  return networkConnectivityByDevice;
}
