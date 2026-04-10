import React, {useEffect, useState, useCallback, useMemo} from 'react';
import {
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  TextInput,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import css from '@controleonline/ui-orders/src/react/css/orders';
import {useStore} from '@store';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {Picker} from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import packageJson from '@package';
import {
  appendScreenMetrics,
  buildScreenMetrics,
  hasScreenMetricsChanges,
} from '@controleonline/ui-common/src/react/utils/screenMetrics';
import {
  CIELO_DEVICES,
  DEVICE_ALERT_SOUND_ENABLED_KEY,
  DEVICE_ALERT_SOUND_URL_KEY,
  isTruthyValue,
  parseConfigsObject,
  resolveDefaultGateway,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {isWebRuntimeDevice as resolveIsWebRuntimeDevice} from '@controleonline/ui-common/src/react/utils/deviceRuntime';

const Settings = () => {
  const navigation = useNavigation();
  const {styles, globalStyles} = css();
  const walletStore = useStore('wallet');
  const walletGetters = walletStore.getters;
  const peopleStore = useStore('people');
  const peopleGetters = peopleStore.getters;
  const configsStore = useStore('configs');
  const configsGetters = configsStore.getters;
  const configActions = configsStore.actions;
  const device_configStore = useStore('device_config');
  const deviceConfigGetters = device_configStore.getters;
  const deviceConfigsActions = device_configStore.actions;
  const {item: device} = deviceConfigGetters;
  const {currentCompany} = peopleGetters;
  const {isLoading: walletLoading} = walletGetters;
  const {items: companyConfigs, isSaving} = configsGetters;
  const withdrawWallet =
    companyConfigs?.['pos-withdrawl-wallet'] ||
    companyConfigs?.['pos-withdrawal-wallet'];

  const [selectedMode, setSelectedMode] = useState(null);
  const [printingMode, setPrintingMode] = useState('order');
  const [selectedGateway, setSelectedGateway] = useState(null);
  const [discovered, setDiscovered] = useState(false);
  const deviceStore = useStore('device');
  const deviceGetters = deviceStore.getters;
  const {item: storagedDevice} = deviceGetters;
  const packageVersion = packageJson?.version || packageJson?.default?.version;
  const appVersion = packageVersion || storagedDevice?.appVersion;

  const [checkType, setCheckType] = useState('manual');
  const [productInputType, setProductInputType] = useState('manual');
  const [selectionType, setSelectionType] = useState('single');
  const [showSound, setShowSound] = useState(false);
  const [showVibration, setShowVibration] = useState(false);
  const [alertSoundEnabled, setAlertSoundEnabled] = useState(false);
  const [alertSoundUrl, setAlertSoundUrl] = useState('');
  const [configsLoaded, setConfigsLoaded] = useState(false);
  const [deviceConfigsLoaded, setDeviceConfigsLoaded] = useState(false);
  const pickerMode = Platform.OS === 'android' ? 'dropdown' : undefined;

  const defaultGateway = resolveDefaultGateway(storagedDevice);
  const deviceManufacturer = String(storagedDevice?.manufacturer || '').toLowerCase();
  const isEmulatorDevice = isTruthyValue(storagedDevice?.isEmulator);
  const isCieloDevice = CIELO_DEVICES.includes(deviceManufacturer);
  const showGatewayPicker = !isCieloDevice || isEmulatorDevice;
  const allowCieloOption = isCieloDevice || isEmulatorDevice;
  const isWebRuntimeDevice = resolveIsWebRuntimeDevice(storagedDevice);

  const screenMetrics = useMemo(() => buildScreenMetrics(), []);
  const runtimeCompanyConfigs = useMemo(
    () =>
      parseConfigsObject(
        companyConfigs && Object.keys(companyConfigs).length > 0
          ? companyConfigs
          : currentCompany?.configs,
      ),
    [companyConfigs, currentCompany?.configs],
  );

  const applyRuntimeCompanyConfigs = useCallback(() => {
    const nextItem = {
      ...(device || {}),
      device: {
        id: storagedDevice?.id,
        device: storagedDevice?.id,
      },
      people: currentCompany?.id ? '/people/' + currentCompany.id : device?.people,
      configs: runtimeCompanyConfigs,
    };

    deviceConfigsActions.setItem(nextItem);
    return nextItem;
  }, [
    currentCompany?.id,
    device,
    deviceConfigsActions,
    runtimeCompanyConfigs,
    storagedDevice?.id,
  ]);

  const persistDeviceConfigs = useCallback(
    nextConfigs => {
      if (!currentCompany?.id) {
        return Promise.resolve(null);
      }

      if (isWebRuntimeDevice) {
        const nextItem = {
          ...(device || {}),
          device: {
            id: storagedDevice?.id,
            device: storagedDevice?.id,
          },
          people: '/people/' + currentCompany.id,
          configs: {
            ...runtimeCompanyConfigs,
            ...parseConfigsObject(nextConfigs),
          },
        };
        deviceConfigsActions.setItem(nextItem);
        return Promise.resolve(nextItem);
      }

      return deviceConfigsActions.addDeviceConfigs({
        configs: JSON.stringify(nextConfigs),
        people: '/people/' + currentCompany.id,
      });
    },
    [
      currentCompany?.id,
      device,
      deviceConfigsActions,
      isWebRuntimeDevice,
      runtimeCompanyConfigs,
      storagedDevice?.id,
    ],
  );

  const createDefaultConfigs = useCallback(() => {

    // ALEMAC //
    if (!currentCompany?.id || configsLoaded || device === undefined || device === null) return;

    if (isWebRuntimeDevice) {
      applyRuntimeCompanyConfigs();
      setConfigsLoaded(true);
      return;
    }

    let lc = {...(device?.configs || {})};
    let needsUpdate = false;

    const metricsConfigs = appendScreenMetrics(lc);
    if (hasScreenMetricsChanges(lc, metricsConfigs)) {
      lc = metricsConfigs;
      needsUpdate = true;
    }

    // Verifica cada config e cria o padrão se não existir
    if (!lc['pos-type']) {
      lc['pos-type'] = 'full';
      needsUpdate = true;
    }
    if (!lc['print-mode']) {
      lc['print-mode'] = 'order';
      needsUpdate = true;
    }
    if (!lc['check-type']) {
      lc['check-type'] = 'manual';
      needsUpdate = true;
    }
    if (!lc['product-input-type']) {
      lc['product-input-type'] = 'manual';
      needsUpdate = true;
    }
    if (!lc['selection-type']) {
      lc['selection-type'] = 'single';
      needsUpdate = true;
    }
    if (!lc['sound']) {
      lc['sound'] = '0';
      needsUpdate = true;
    }
    if (!lc['vibration']) {
      lc['vibration'] = '0';
      needsUpdate = true;
    }
    if (lc[DEVICE_ALERT_SOUND_ENABLED_KEY] === undefined || lc[DEVICE_ALERT_SOUND_ENABLED_KEY] === null) {
      lc[DEVICE_ALERT_SOUND_ENABLED_KEY] = '0';
      needsUpdate = true;
    }
    if (lc[DEVICE_ALERT_SOUND_URL_KEY] === undefined || lc[DEVICE_ALERT_SOUND_URL_KEY] === null) {
      lc[DEVICE_ALERT_SOUND_URL_KEY] = '';
      needsUpdate = true;
    }
    if (!lc['config-version']) {
      // ALEMAC // pega o appVersion ao invés do buildNumber
      lc['config-version'] = appVersion;
      needsUpdate = true;
    }
    if (!lc['pos-gateway']) {
      lc['pos-gateway'] = defaultGateway;
      needsUpdate = true;
    }

    // Se faltava alguma coisa, grava tudo no banco
    if (needsUpdate && currentCompany?.id) {
      persistDeviceConfigs(lc)
        .then(() => {
          setConfigsLoaded(true);
        })
        .catch(err => {
          console.error('addDeviceConfigs (createDefaultConfigs) failed:', err);
          Alert.alert('Erro ao gravar configurações', err.message || JSON.stringify(err));
        });

      return;
    }

    setConfigsLoaded(true);
  }, [
    device,
    currentCompany?.id,
    configsLoaded,
    storagedDevice,
    defaultGateway,
    appVersion,
    applyRuntimeCompanyConfigs,
    deviceConfigsActions,
    isWebRuntimeDevice,
    persistDeviceConfigs,
  ]);

  useFocusEffect(
    useCallback(() => {
      setDeviceConfigsLoaded(false);
      setConfigsLoaded(false);
      setDiscovered(false);
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      if (!currentCompany?.id || !storagedDevice?.id) {
        return;
      }

      if (isWebRuntimeDevice) {
        applyRuntimeCompanyConfigs();
        setDeviceConfigsLoaded(true);
        return;
      }

      deviceConfigsActions
        .getItems({
          'device.device': storagedDevice.id,
          people: '/people/' + currentCompany.id,
        })
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            let parsedConfigs = {};

            if (typeof data[0]?.configs === 'string') {
              try {
                parsedConfigs = JSON.parse(data[0].configs);
              } catch (e) {
                parsedConfigs = {};
              }
            } else if (typeof data[0]?.configs === 'object') {
              parsedConfigs = data[0].configs || {};
            }

            deviceConfigsActions.setItem({
              ...data[0],
              configs: parsedConfigs,
            });
            return;
          }

          deviceConfigsActions.setItem({});
        })
        .catch(() => {
          deviceConfigsActions.setItem({});
        })
        .finally(() => {
          setDeviceConfigsLoaded(true);
        });
    }, [
      applyRuntimeCompanyConfigs,
      currentCompany?.id,
      deviceConfigsActions,
      isWebRuntimeDevice,
      storagedDevice?.id,
    ]),
  );


  useFocusEffect(
    useCallback(() => {
      if (deviceConfigsLoaded) {
        createDefaultConfigs();
      }
    }, [deviceConfigsLoaded, createDefaultConfigs]),
  );

  useEffect(() => {
    if (isWebRuntimeDevice && deviceConfigsLoaded && currentCompany?.id) {
      applyRuntimeCompanyConfigs();
    }
  }, [
    applyRuntimeCompanyConfigs,
    currentCompany?.id,
    deviceConfigsLoaded,
    isWebRuntimeDevice,
    runtimeCompanyConfigs,
  ]);

  useFocusEffect(
    useCallback(() => {
      if (device?.configs) {
        setCheckType(device?.configs['check-type'] || 'manual');
        setProductInputType(device?.configs['product-input-type'] || 'manual');
        setSelectionType(device?.configs['selection-type'] || 'single');
        setShowSound(
          device?.configs['sound'] === true ||
          device?.configs['sound'] === '1'
        );
        setShowVibration(
          device?.configs['vibration'] === true ||
          device?.configs['vibration'] === '1'
        );
        setAlertSoundEnabled(isTruthyValue(device?.configs[DEVICE_ALERT_SOUND_ENABLED_KEY]));
        setAlertSoundUrl(String(device?.configs[DEVICE_ALERT_SOUND_URL_KEY] || ''));
        setSelectedMode(device?.configs['pos-type'] || 'full');
        setPrintingMode(device?.configs['print-mode'] || 'order');
        setSelectedGateway(device?.configs['pos-gateway'] || 'infinite-pay');
      } else {
        setCheckType('manual');
        setProductInputType('manual');
        setSelectionType('single');
        setShowSound(false);
        setShowVibration(false);
        setAlertSoundEnabled(false);
        setAlertSoundUrl('');
        setSelectedMode('full');
        setPrintingMode('order');
        setSelectedGateway('infinite-pay');
      }
    }, [device]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!discovered && currentCompany?.id) {
        const params = {
          people: '/people/' + currentCompany.id,
        };
        configActions
          .discoveryMainConfigs(params)
          .then(() => {
            setDiscovered(true);
          })
          .catch(() => {
            setDiscovered(false);
          });
      }
    }, [discovered, currentCompany?.id, configActions]),
  );

  const handleSelectionTypeChange = (value) => {
    setSelectionType(value);
    let lc = appendScreenMetrics({...device?.configs || {}});
    lc['selection-type'] = value;
    lc['config-version'] = appVersion;
    persistDeviceConfigs(lc)
      .catch(err => {
        console.error('addDeviceConfigs (selection-type) failed:', err);
        Alert.alert('Erro ao gravar configurações', err.message || JSON.stringify(err));
      });
  };

  const handleCheckTypeChange = (value) => {
    setCheckType(value);
    let lc = appendScreenMetrics({...device?.configs || {}});
    lc['check-type'] = value;
    // ===== ALTERAÇÃO: ADICIONAR VERSÃO DO APP =====
    lc['config-version'] = appVersion;
    // ===== FIM DA ALTERAÇÃO =====
    persistDeviceConfigs(lc)
      .catch(err => {
        console.error('addDeviceConfigs (check-type) failed:', err);
        Alert.alert('Erro ao gravar configurações', err.message || JSON.stringify(err));
      });
  };

  const handleProductInputTypeChange = (value) => {
    setProductInputType(value);
    let lc = appendScreenMetrics({...device?.configs || {}});
    lc['product-input-type'] = value;
    // ===== ALTERAÇÃO: ADICIONAR VERSÃO DO APP =====
    lc['config-version'] = appVersion;
    // ===== FIM DA ALTERAÇÃO =====
    persistDeviceConfigs(lc)
      .catch(err => {
        console.error('addDeviceConfigs (product-input-type) failed:', err);
        Alert.alert('Erro ao gravar configurações', err.message || JSON.stringify(err));
      });
  };

  const handleSoundChange = (value) => {
    setShowSound(value);
    localStorage.setItem('sound', String(value));
    let lc = appendScreenMetrics({...device?.configs || {}});
    lc['sound'] = value ? '1' : '0';
    // ===== ALTERAÇÃO: ADICIONAR VERSÃO DO APP =====
    lc['config-version'] = appVersion;
    // ===== FIM DA ALTERAÇÃO =====
    persistDeviceConfigs(lc)
      .catch(err => {
        console.error('addDeviceConfigs (sound) failed:', err);
        Alert.alert('Erro ao gravar configurações', err.message || JSON.stringify(err));
      });
  };

  const handleVibrationChange = (value) => {
    setShowVibration(value);
    localStorage.setItem('vibration', String(value));
    let lc = appendScreenMetrics({...device?.configs || {}});
    lc['vibration'] = value ? '1' : '0';
    // ===== ALTERAÇÃO: ADICIONAR VERSÃO DO APP =====
    lc['config-version'] = appVersion;
    // ===== FIM DA ALTERAÇÃO =====
    persistDeviceConfigs(lc)
      .catch(err => {
        console.error('addDeviceConfigs (vibration) failed:', err);
        Alert.alert('Erro ao gravar configurações', err.message || JSON.stringify(err));
      });
  };

  const handleAlertSoundEnabledChange = value => {
    setAlertSoundEnabled(value);
    let lc = appendScreenMetrics({...device?.configs || {}});
    lc[DEVICE_ALERT_SOUND_ENABLED_KEY] = value ? '1' : '0';
    lc[DEVICE_ALERT_SOUND_URL_KEY] = alertSoundUrl.trim();
    lc['config-version'] = appVersion;
    persistDeviceConfigs(lc)
      .catch(err => {
        console.error('addDeviceConfigs (notification sound enabled) failed:', err);
        Alert.alert('Erro ao gravar configurações', err.message || JSON.stringify(err));
      });
  };

  const handleAlertSoundUrlSubmit = () => {
    let lc = appendScreenMetrics({...device?.configs || {}});
    lc[DEVICE_ALERT_SOUND_ENABLED_KEY] = alertSoundEnabled ? '1' : '0';
    lc[DEVICE_ALERT_SOUND_URL_KEY] = alertSoundUrl.trim();
    lc['config-version'] = appVersion;
    persistDeviceConfigs(lc)
      .catch(err => {
        console.error('addDeviceConfigs (notification sound url) failed:', err);
        Alert.alert('Erro ao gravar configurações', err.message || JSON.stringify(err));
      });
  };

  const handlePosTypeChange = (value) => {
    setSelectedMode(value);
    let lc = appendScreenMetrics({...device?.configs || {}});
    lc['pos-type'] = value;
    lc['config-version'] = appVersion;
    persistDeviceConfigs(lc)
      .catch(err => {
        console.error('addDeviceConfigs (pos-type) failed:', err);
        Alert.alert('Erro ao gravar configurações', err.message || JSON.stringify(err));
      });
  };

  const handlePrintModeChange = (value) => {
    setPrintingMode(value);
    let lc = appendScreenMetrics({...device?.configs || {}});
    lc['print-mode'] = value;
    lc['config-version'] = appVersion;
    persistDeviceConfigs(lc)
      .catch(err => {
        console.error('addDeviceConfigs (print-mode) failed:', err);
        Alert.alert('Erro ao gravar configurações', err.message || JSON.stringify(err));
      });
  };

  const handleGatewayChange = (value) => {
    setSelectedGateway(value);
    let lc = appendScreenMetrics({...device?.configs || {}});
    lc['pos-gateway'] = value;
    lc['config-version'] = appVersion;
    persistDeviceConfigs(lc)
      .catch(err => {
        console.error('addDeviceConfigs (pos-gateway) failed:', err);
        Alert.alert('Erro ao gravar configurações', err.message || JSON.stringify(err));
      });
  };

  const handleClearTranslate = () => {
    Promise.resolve(global.t?.reload?.())
      .then(() => {
        global.refreshTranslationsUI?.();

        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.location.reload();
          return;
        }

        navigation.reset({
          index: 0,
          routes: [{name: 'SettingsPage'}],
        });
      })
      .catch(() => {});
  };

  return (
    <SafeAreaView style={styles.Settings.container}>
      <StateStore store="device_config" />
      <ScrollView contentContainerStyle={styles.Settings.scrollContent}>
        <View style={styles.Settings.mainContainer}>
          <View style={{marginTop: 20}}>
            <View style={styles.Settings.row}>
              <Text style={styles.Settings.value}>{storagedDevice?.appName}:</Text>
              <Text style={styles.Settings.value}>{appVersion}</Text>
            </View>
            <View style={styles.Settings.row}>
              <Text style={styles.Settings.label}>Resolução do monitor: </Text>
              <Text style={styles.Settings.value}>{screenMetrics?.deviceResolution || '-'}</Text>
            </View>
            <View style={styles.Settings.row}>
              <Text style={styles.Settings.label}>Tamanho atual: </Text>
              <Text style={styles.Settings.value}>{screenMetrics?.actualSize || '-'}</Text>
            </View>
            <View style={styles.Settings.row}>
              <Text style={styles.Settings.label}>Tamanho da janela: </Text>
              <Text style={styles.Settings.value}>{screenMetrics?.windosSize || '-'}</Text>
            </View>
            <View style={styles.Settings.row}>
              <Text style={styles.Settings.label}>{global.t?.t("configs", "label", "machineId")}: </Text>
              <Text style={styles.Settings.value}>{storagedDevice.id}</Text>
            </View>
            <View style={styles.Settings.row}>
              <Text style={styles.Settings.label}>{global.t?.t("configs", "label", "manufacturer")}: </Text>
              <Text style={styles.Settings.value}>
                {storagedDevice?.manufacturer}
              </Text>
            </View>
            <View style={styles.Settings.row}>
              <Text style={styles.Settings.label}>{global.t?.t("configs", "label", "systemVersion")}: </Text>
              <Text style={styles.Settings.value}>
                {storagedDevice?.systemName}
                {Platform.OS !== 'web' &&
                storagedDevice?.systemVersion &&
                String(storagedDevice.systemVersion).toLowerCase() !== 'unknown' &&
                String(storagedDevice.systemVersion).toLowerCase() !== 'unknow'
                  ? `, ${storagedDevice.systemVersion}`
                  : ''}
              </Text>
            </View>

            <View style={styles.Settings.walletRow}>
              <Text style={styles.Settings.label}>{global.t?.t("configs", "label", "cashWallet")}: </Text>
              <View style={styles.Settings.walletValueContainer}>
                <Text style={styles.Settings.walletValue}>
                  {companyConfigs?.['pos-cash-wallet']}
                </Text>
                {walletLoading || isSaving ? (
                  <ActivityIndicator size={22} color={styles.Settings.label} />
                ) : companyConfigs?.['pos-cash-wallet'] ? (
                  <Icon name={'check'} size={22} color="green" />
                ) : (
                  <Icon name={'close'} size={22} color="red" />
                )}
              </View>
            </View>
            <View style={styles.Settings.walletRow}>
              <Text style={styles.Settings.label}>{global.t?.t("configs", "label", "withdrawlWallet")}: </Text>
              <View style={styles.Settings.walletValueContainer}>
                <Text style={styles.Settings.walletValue}>
                  {withdrawWallet}
                </Text>
                {walletLoading || isSaving ? (
                  <ActivityIndicator size={22} color={styles.Settings.label} />
                ) : withdrawWallet ? (
                  <Icon name={'check'} size={22} color="green" />
                ) : (
                  <Icon name={'close'} size={22} color="red" />
                )}
              </View>
            </View>
          </View>

          {isWebRuntimeDevice && (
            <View
              style={{
                marginTop: 16,
                padding: 14,
                backgroundColor: '#EFF6FF',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#BFDBFE',
              }}>
              <Text style={[styles.Settings.label, {marginBottom: 4}]}>
                Configuração somente leitura
              </Text>
              <Text style={{fontSize: 12, lineHeight: 18, color: '#1D4ED8'}}>
                No navegador este device nao grava `device_config`. As opcoes abaixo
                seguem sempre as configuracoes da empresa.
              </Text>
            </View>
          )}

          {/* // // // // // TIPO DE COMANDA */}
          <View style={{marginTop: 12, marginBottom: 10}}>
            <Text style={styles.Settings.label}>{global.t?.t("configs", "label", "tab type")}</Text>
            <Picker
              selectedValue={checkType}
              onValueChange={handleCheckTypeChange}
              enabled={!isWebRuntimeDevice}
              mode={pickerMode}
              style={styles.Settings.picker}>

              <Picker.Item label={global.t?.t("configs", "option", "manual")} value="manual" />
              <Picker.Item label={global.t?.t("configs", "option", "barcode")} value="barcode" />
              <Picker.Item label={global.t?.t("configs", "option", "rfid")} value="rfid" />                            
              
            </Picker>
          </View>

          {/* // // // // // TIPO DE LEITURA DE PRODUTO */}
          <View style={{marginTop: 6, marginBottom: 10}}>
            <Text style={styles.Settings.label}>{global.t?.t("configs", "label", "product read method")}</Text>
            <Picker
              selectedValue={productInputType}
              onValueChange={handleProductInputTypeChange}
              enabled={!isWebRuntimeDevice}
              mode={pickerMode}
              style={styles.Settings.picker}>
              <Picker.Item label={global.t?.t("configs", "option", "manual")} value="manual" />
              <Picker.Item label={global.t?.t("configs", "option", "barcode")} value="barcode" />
              <Picker.Item label={global.t?.t("configs", "option", "rfid")} value="rfid" />                            
            </Picker>
          </View>

          <View style={{marginTop: 6, marginBottom: 10}}>
            <Text style={styles.Settings.label}>{global.t?.t("configs", "label", "selection type")}</Text>
            <Picker
              selectedValue={selectionType}
              onValueChange={handleSelectionTypeChange}
              enabled={!isWebRuntimeDevice}
              mode={pickerMode}
              style={styles.Settings.picker}>
              <Picker.Item label={global.t?.t("configs", "option", "single")}  value="single" />
              <Picker.Item label={global.t?.t("configs", "option", "multiple")}  value="multiple" />
            </Picker>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 12,
            }}>
            <Text style={styles.Settings.label}>{global.t?.t("configs", "label", "sound")}</Text>

            <Switch
              value={showSound}
              disabled={isWebRuntimeDevice}
              onValueChange={handleSoundChange}
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 12,
            }}>
            <Text style={styles.Settings.label}>{global.t?.t("configs", "label", "vibration")}</Text>

            <Switch
              value={showVibration}
              disabled={isWebRuntimeDevice}
              onValueChange={handleVibrationChange}
            />
          </View>

          <View
            style={{
              marginTop: 16,
              padding: 14,
              backgroundColor: '#F8FAFC',
              borderRadius: 12,
            }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <Text style={styles.Settings.label}>Aviso sonoro via websocket</Text>
              <Switch
                value={alertSoundEnabled}
                disabled={isWebRuntimeDevice}
                onValueChange={handleAlertSoundEnabledChange}
              />
            </View>

            <Text
              style={{
                fontSize: 12,
                lineHeight: 18,
                color: '#64748B',
                marginTop: 8,
              }}>
              Toca ao receber novo pedido, impressao ou order_product_queue neste
              device via websocket.
            </Text>

            <Text style={[styles.Settings.label, {marginTop: 12, marginBottom: 6, flex: 0}]}>
              URL do aviso sonoro
            </Text>
            <TextInput
              value={alertSoundUrl}
              onChangeText={setAlertSoundUrl}
              onBlur={handleAlertSoundUrlSubmit}
              onSubmitEditing={handleAlertSoundUrlSubmit}
              editable={!isWebRuntimeDevice}
              placeholder="https://exemplo.com/alerta.mp3"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              style={{
                minHeight: 46,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                borderRadius: 10,
                backgroundColor: '#fff',
                color: '#0F172A',
                paddingHorizontal: 12,
                paddingVertical: 10,
                outlineStyle: 'none',
              }}
            />
          </View>

          <View style={{marginTop: 6}}>
            <Picker
              selectedValue={selectedMode}
              onValueChange={handlePosTypeChange}
              enabled={!isWebRuntimeDevice}
              mode={pickerMode}
              style={styles.Settings.picker}>
              <Picker.Item label={global.t?.t("configs", "option", "simple order")} value="simple" />
              <Picker.Item label={global.t?.t("configs", "option", "full order")} value="full" />
            </Picker>
          </View>
          <View style={{marginTop: 6, marginBottom: 10}}>
            <Picker
              selectedValue={printingMode}
              onValueChange={handlePrintModeChange}
              enabled={!isWebRuntimeDevice}
              mode={pickerMode}
              style={styles.Settings.picker}>
              <Picker.Item label={global.t?.t("configs", "option", "printSingleOrder")} value="order" />
              <Picker.Item label={global.t?.t("configs", "option", "printFullOrder")} value="form" />
            </Picker>
          </View>
          {showGatewayPicker && (
            <View style={{marginTop: 10}}>
              <Picker
                selectedValue={selectedGateway}
                onValueChange={handleGatewayChange}
                enabled={!isWebRuntimeDevice}
                mode={pickerMode}
                style={styles.Settings.picker}>
                <Picker.Item label="Infinite Pay" value="infinite-pay" />
                {allowCieloOption && (
                  <Picker.Item label="Cielo" value="cielo" />
                )}
              </Picker>
            </View>
          )}

          <TouchableOpacity
            onPress={handleClearTranslate}
            style={[
              globalStyles.button,
              {
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                height: 50,
                marginTop: 6,
              },
            ]}>
            <Icon name="add-circle" size={24} color="#fff" />
            <Text style={{color: '#fff', marginLeft: 8}}>{global.t?.t("configs", "label", "resync translations")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Settings;
