import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {useStore} from '@store';
import {app_type} from '@appType';
import {
  buildProviderManagedDeviceConfigs,
  parseConfigsObject,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {
  getDeviceConfigType,
  isManagedNetworkDeviceType,
  normalizeDeviceType,
  PDV_DEVICE_TYPE,
} from '@controleonline/ui-common/src/react/utils/printerDevices';
import {
  normalizeDeviceId,
  normalizeEntityId,
} from '@controleonline/ui-common/src/react/utils/paymentDevices';
import {resolveOperationalDeviceType} from '@controleonline/ui-common/src/react/utils/deviceRuntime';
import {resolveThemePalette, withOpacity} from '@controleonline/../../src/styles/branding';
import {colors} from '@controleonline/../../src/styles/colors';
import Icon from 'react-native-vector-icons/Feather';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';
import {
  findDeviceConfigByType,
  getRuntimeDeviceIdentifier,
  groupDeviceConfigs,
  hasCurrentPdvConfig,
  isCurrentDeviceGroup,
  prioritizeCurrentDeviceGroups,
  readStoredRuntimeDevice,
} from '../currentDevice';
import styles from '../../Devices.styles';
import DeviceGroupCard from './DeviceGroupCard';
import {useDeviceNetworkConnectivity} from './useDeviceNetworkConnectivity';
import {
  PAGE_SIZE,
  API_PAGE_SIZE,
  tt,
  hex,
  mergeDeviceConfigs,
  isPosDeviceOpen,
  getPrinterConnectivityMeta,
  getDeviceIconName,
  getDeviceItemTypeLabel,
  getDeviceBadgeLabel,
  getDeviceTypeAccent,
  getPosStatusLabel,
  getPosOperationModeLabel,
  getDeviceDetailRoute,
  getDeviceListIdentifier,
  expandDeviceListParamSets,
  isPdvPrinterEnabled,
} from './deviceListHelpers';

const deviceTableColumns = [
  {
    name: 'key',
    label: 'id',
    isIdentity: true,
    sortable: false,
    format: value => value,
  },
  {
    name: 'alias',
    label: 'device',
    sortable: true,
    format: value => value || '',
  },
  {
    name: 'typeLabel',
    label: 'type',
    sortable: true,
    format: value => value || '',
  },
];

export const createDeviceTypeTab = ({
  label,
  pageSize = PAGE_SIZE,
  queryTypes = [],
  emptyState,
  clientFilter = null,
  offerCurrentPdvSetup = false,
}) => {
  const DeviceTypeTab = () => {
    const navigation = useNavigation();
    const peopleStore = useStore('people');
    const deviceStore = useStore('device');
    const deviceConfigStore = useStore('device_config');
    const themeStore = useStore('theme');

    const {currentCompany} = peopleStore.getters;
    const {colors: themeColors} = themeStore.getters;

    const brandColors = useMemo(
      () =>
        resolveThemePalette(
          {...themeColors, ...(currentCompany?.theme?.colors || {})},
          colors,
        ),
      [themeColors, currentCompany?.id],
    );

    const [deviceConfigs, setDeviceConfigs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [creatingPdv, setCreatingPdv] = useState(false);
    const [runtimeDevice, setRuntimeDevice] = useState(() =>
      readStoredRuntimeDevice(),
    );
    const networkConnectivityByDevice = useDeviceNetworkConnectivity(deviceConfigs);

    const fetchingRef = useRef(false);
    const companyId = String(currentCompany?.id || '').trim();
    const runtimeDeviceIdentifier =
      getRuntimeDeviceIdentifier(runtimeDevice);
    const runtimeDeviceType = normalizeDeviceType(
      resolveOperationalDeviceType({
        appType: app_type,
        deviceInfo: runtimeDevice,
      }),
    );
    const filteredDeviceConfigs = useMemo(() => {
      if (typeof clientFilter !== 'function') {
        return deviceConfigs;
      }

      return (Array.isArray(deviceConfigs) ? deviceConfigs : []).filter(
        deviceConfig => clientFilter(deviceConfig),
      );
    }, [clientFilter, deviceConfigs]);
    const visibleDeviceGroups = useMemo(() => {
      const groups = prioritizeCurrentDeviceGroups(
        groupDeviceConfigs(filteredDeviceConfigs, {
          includeRuntimeDevice: offerCurrentPdvSetup,
          runtimeDevice,
        }),
        runtimeDeviceIdentifier,
      );
      return (Array.isArray(groups) ? groups : []).map(group => {
        const primary = group?.deviceConfigs?.[0];
        const type = primary
          ? getDeviceConfigType(primary)
          : runtimeDeviceType || 'DEVICE';
        return {
          ...group,
          id: group?.key || group?.device?.id || group?.device?.device,
          alias:
            group?.device?.alias ||
            group?.device?.device ||
            primary?.device?.alias ||
            'Dispositivo',
          typeLabel: getDeviceItemTypeLabel(type),
          primaryConfig: primary,
        };
      });
    }, [
      filteredDeviceConfigs,
      offerCurrentPdvSetup,
      runtimeDevice,
      runtimeDeviceIdentifier,
      runtimeDeviceType,
    ]);
    const currentDeviceGroup = useMemo(
      () =>
        visibleDeviceGroups.find(deviceGroup =>
          isCurrentDeviceGroup({
            deviceGroup,
            runtimeDeviceIdentifier,
          }),
        ) || null,
      [runtimeDeviceIdentifier, visibleDeviceGroups],
    );
    const currentDeviceConfigs = currentDeviceGroup?.deviceConfigs || [];

    const fetchDeviceConfigs = useCallback(
      async (mode = 'loading') => {
        if (!companyId || fetchingRef.current) {
          if (!companyId) {
            setDeviceConfigs([]);
            setError('');
            setLoading(false);
            setRefreshing(false);
          }
          return;
        }

        fetchingRef.current = true;

        if (mode === 'loading') {
          setLoading(true);
        }

        if (mode === 'refresh') {
          setRefreshing(true);
        }

        try {
          const requestPageSize = Math.max(pageSize, API_PAGE_SIZE);
          let loadedItems = [];
          let reportedTotal = 0;

          const paramSets = expandDeviceListParamSets({
            companyId,
            page: 1,
            pageSize: requestPageSize,
            queryTypes,
          });

          for (const baseParams of paramSets) {
            let page = 1;
            while (true) {
              const pageItems = await deviceConfigStore.actions.getItems({
                ...baseParams,
                page,
              });
              const previousLength = loadedItems.length;
              loadedItems = mergeDeviceConfigs(loadedItems, pageItems);
              reportedTotal = Math.max(
                reportedTotal,
                Number(
                  deviceConfigStore.getters.totalItems ||
                    loadedItems.length ||
                    0,
                ),
              );

              if (
                !Array.isArray(pageItems) ||
                pageItems.length === 0 ||
                loadedItems.length >= reportedTotal ||
                loadedItems.length === previousLength
              ) {
                break;
              }

              page += 1;
            }
          }

          setDeviceConfigs(loadedItems);
          setError('');
        } catch (fetchError) {
          setDeviceConfigs([]);

          setError(
            fetchError?.message || 'Nao foi possivel carregar os dispositivos.',
          );
        } finally {
          fetchingRef.current = false;
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        companyId,
        deviceConfigStore.actions,
        deviceConfigStore.getters,
        pageSize,
        queryTypes,
      ],
    );

    useFocusEffect(
      useCallback(() => {
        setRuntimeDevice(readStoredRuntimeDevice());
        fetchDeviceConfigs('loading');
      }, [fetchDeviceConfigs]),
    );


    const goToDetail = useCallback(
      deviceConfig => {
        const deviceType = getDeviceConfigType(deviceConfig);
        const nextDevice = deviceConfig?.device || {};
        const nextDeviceId = normalizeEntityId(nextDevice?.id || nextDevice?.['@id']);
        const nextConfigs = parseConfigsObject(deviceConfig?.configs);

        deviceStore.actions.setItem(nextDevice);
        deviceConfigStore.actions.setItem({
          ...deviceConfig,
          configs: nextConfigs,
        });

        navigation.navigate(getDeviceDetailRoute(deviceType), {
          deviceId: nextDeviceId,
        });
      },
      [deviceConfigStore.actions, deviceStore.actions, navigation],
    );

    const currentPdvExists = useMemo(
      () =>
        hasCurrentPdvConfig(
          currentDeviceConfigs,
          runtimeDeviceIdentifier,
        ),
      [currentDeviceConfigs, runtimeDeviceIdentifier],
    );
    const showCurrentPdvSetup = Boolean(
      offerCurrentPdvSetup &&
        !loading &&
        runtimeDeviceIdentifier &&
        !currentPdvExists,
    );

    const handleCreateCurrentPdv = useCallback(async () => {
      if (
        creatingPdv ||
        !companyId ||
        !runtimeDeviceIdentifier ||
        currentPdvExists
      ) {
        return;
      }

      setCreatingPdv(true);
      setError('');

      try {
        const {nextConfigs} = buildProviderManagedDeviceConfigs({
          configs: {},
          appVersion: runtimeDevice?.appVersion,
          deviceInfo: runtimeDevice,
        });
        const savedDeviceConfig =
          await deviceConfigStore.actions.addDeviceConfigs({
            device: runtimeDeviceIdentifier,
            people: `/people/${companyId}`,
            type: PDV_DEVICE_TYPE,
            configs: JSON.stringify(nextConfigs),
          });

        await fetchDeviceConfigs('refresh');

        if (savedDeviceConfig?.id && savedDeviceConfig?.device) {
          goToDetail(savedDeviceConfig);
        }
      } catch (createError) {
        setError(
          createError?.message ||
            'Nao foi possivel configurar este dispositivo como PDV.',
        );
      } finally {
        setCreatingPdv(false);
      }
    }, [
      companyId,
      creatingPdv,
      currentPdvExists,
      deviceConfigStore.actions,
      fetchDeviceConfigs,
      goToDetail,
      runtimeDevice,
      runtimeDeviceIdentifier,
    ]);

    const handleRefresh = useCallback(() => {
      fetchDeviceConfigs('refresh');
    }, [fetchDeviceConfigs]);

    const renderGroupCard = useCallback(
      cardProps => (
        <DeviceGroupCard
          {...cardProps}
          brandColors={brandColors}
          creatingPdv={creatingPdv}
          goToDetail={goToDetail}
          handleCreateCurrentPdv={handleCreateCurrentPdv}
          networkConnectivityByDevice={networkConnectivityByDevice}
          queryTypes={queryTypes}
          runtimeDeviceIdentifier={runtimeDeviceIdentifier}
          runtimeDeviceType={runtimeDeviceType}
          showCurrentPdvSetup={showCurrentPdvSetup}
        />
      ),
      [
        brandColors,
        creatingPdv,
        goToDetail,
        handleCreateCurrentPdv,
        networkConnectivityByDevice,
        queryTypes,
        runtimeDeviceIdentifier,
        runtimeDeviceType,
        showCurrentPdvSetup,
      ],
    );

    return (
      <View style={styles.tabContent}>
        <View style={styles.listMetaRow}>
          <Text style={styles.listMetaTitle}>{label}</Text>
          <Text style={styles.listMetaText}>
            {`${visibleDeviceGroups.length} dispositivo(s) • ${
              filteredDeviceConfigs.length
            } configuracao(oes)`}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={brandColors.primary} />
            <Text style={styles.loadingText}>Carregando dispositivos...</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.inlineMessageBox}>
            <Text style={styles.inlineMessageText}>{error}</Text>
          </View>
        ) : null}

        <DefaultTable
          storeName="device_config"
          data={visibleDeviceGroups}
          columns={deviceTableColumns}
          initialViewMode="cards"
          forceCardsOnCompact
          showToolbar
          showSearch={false}
          showRowActions={false}
          showColumnFiltersButton={false}
          showTotalItemsInFooter
          isLoading={loading}
          onRefresh={handleRefresh}
          renderCard={renderGroupCard}
          onRowPress={group => {
            const primary = group?.primaryConfig || group?.configs?.[0];
            if (primary) {
              goToDetail(primary);
            }
          }}
          searchProps={{
            compact: true,
            placeholder: tt('device_filter', 'search') || 'Buscar dispositivo',
            searchKey: 'search',
            storeName: 'device_config',
          }}
          totalItemsLabel="devices"
          visibleColumnsPreferenceKey="device_config_devices"
          accentColor={brandColors.primary || hex.primary}
        />
      </View>
    );
  };

  return DeviceTypeTab;
};
// TODO(store-first): quando este arquivo for mexido, mover a leitura para stores, remover api.fetch e evitar repassar dados em objetos quando o store ja resolver isso.
