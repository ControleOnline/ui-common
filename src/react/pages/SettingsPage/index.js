import React, {useState, useCallback, useEffect} from 'react';
import {
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import css from '@controleonline/ui-orders/src/react/css/orders';
import {useStore} from '@store';
import {useFocusEffect} from '@react-navigation/native';
import {Picker} from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import packageJson from '@package';

const Settings = () => {
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
  const categoriesStore = useStore('categories');
  const categoryActions = categoriesStore.actions;
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
  const [configsLoaded, setConfigsLoaded] = useState(false);
  const [deviceConfigsLoaded, setDeviceConfigsLoaded] = useState(false);

  const cieloDevices = ['Quantum', 'ingenico'];

  const createDefaultConfigs = useCallback(() => {
    
    // ALEMAC //
    if (!currentCompany?.id || configsLoaded || device === undefined || device === null) return;

    let lc = {...(device?.configs || {})};
    let needsUpdate = false;

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
    if (!lc['config-version']) {
      // ALEMAC // pega o appVersion ao invés do buildNumber
      lc['config-version'] = appVersion;
      needsUpdate = true;
    }
    if (!lc['pos-gateway']) {
      if (
        cieloDevices.includes(storagedDevice?.manufacturer) &&
        !storagedDevice?.isEmulator
      ) {
        lc['pos-gateway'] = 'cielo';
      } else {
        lc['pos-gateway'] = 'infinite-pay';
      }
      needsUpdate = true;
    }

    // Se faltava alguma coisa, grava tudo no banco
    if (needsUpdate && currentCompany?.id) {
      deviceConfigsActions
        .addDeviceConfigs({
          configs: JSON.stringify(lc),
          people: '/people/' + currentCompany.id,
        })
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
  }, [device, currentCompany?.id, configsLoaded, storagedDevice, appVersion, deviceConfigsActions]);

  useFocusEffect(
    useCallback(() => {
      setDeviceConfigsLoaded(false);
      setConfigsLoaded(false);
      setDiscovered(false);
    }, []),
  );

  // ALEMAC // ===== ALTERAÇÃO: CORRIGIDO PARA VERIFICAR device AO INVÉS DE device.configs =====
// useFocusEffect(
//   useCallback(() => {
//     if (device?.configs !== undefined) {
//       setDeviceConfigsLoaded(true);
//     }
//   }, [device?.configs]),
// );

useFocusEffect(
  useCallback(() => {
    if (device !== undefined) {
      setDeviceConfigsLoaded(true);
    }
  }, [device]),
);





  useFocusEffect(
    useCallback(() => {
      if (deviceConfigsLoaded) {
        createDefaultConfigs();
      }
    }, [deviceConfigsLoaded, createDefaultConfigs]),
  );

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
        setSelectedMode(device?.configs['pos-type'] || 'full');
        setPrintingMode(device?.configs['print-mode'] || 'order');
        setSelectedGateway(device?.configs['pos-gateway'] || 'infinite-pay');
      } else {
        setCheckType('manual');
        setProductInputType('manual');
        setSelectionType('single');
        setShowSound(false);
        setShowVibration(false);
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

  const addDeviceConfigs = () => {
    let lc = {...(device?.configs || {})};

    // ALEMAC // pega o appVersion ao invés do buildNumber
    lc['config-version'] = appVersion;

    lc['pos-type'] = selectedMode;
    lc['pos-gateway'] = selectedGateway;
    lc['print-mode'] = printingMode;
    lc['check-type'] = checkType;
    lc['product-input-type'] = productInputType;
    lc['selection-type'] = selectionType;
    lc['sound'] = showSound ? '1' : '0';
    lc['vibration'] = showVibration ? '1' : '0';
    
    deviceConfigsActions
      .addDeviceConfigs({
        configs: JSON.stringify(lc),
        people: '/people/' + currentCompany.id,
      })
      .catch(err => {
        console.error('addDeviceConfigs failed:', err);
        Alert.alert('Erro ao gravar configurações', err.message || JSON.stringify(err));
      });
  };

  const handleSelectionTypeChange = (value) => {
    setSelectionType(value);
    let lc = {...(device?.configs || {})};
    lc['selection-type'] = value;
    lc['config-version'] = appVersion;
    deviceConfigsActions
      .addDeviceConfigs({
        configs: JSON.stringify(lc),
        people: '/people/' + currentCompany.id,
      })
      .catch(err => {
        console.error('addDeviceConfigs (selection-type) failed:', err);
        Alert.alert('Erro ao gravar configurações', err.message || JSON.stringify(err));
      });
  };

  const handleCheckTypeChange = (value) => {
    setCheckType(value);
    let lc = {...(device?.configs || {})};
    lc['check-type'] = value;
    // ===== ALTERAÇÃO: ADICIONAR VERSÃO DO APP =====
    lc['config-version'] = appVersion;
    // ===== FIM DA ALTERAÇÃO =====
    deviceConfigsActions
      .addDeviceConfigs({
        configs: JSON.stringify(lc),
        people: '/people/' + currentCompany.id,
      })
      .catch(err => {
        console.error('addDeviceConfigs (check-type) failed:', err);
        Alert.alert('Erro ao gravar configurações', err.message || JSON.stringify(err));
      });
  };

  const handleProductInputTypeChange = (value) => {
    setProductInputType(value);
    let lc = {...(device?.configs || {})};
    lc['product-input-type'] = value;
    // ===== ALTERAÇÃO: ADICIONAR VERSÃO DO APP =====
    lc['config-version'] = appVersion;
    // ===== FIM DA ALTERAÇÃO =====
    deviceConfigsActions
      .addDeviceConfigs({
        configs: JSON.stringify(lc),
        people: '/people/' + currentCompany.id,
      })
      .catch(err => {
        console.error('addDeviceConfigs (product-input-type) failed:', err);
        Alert.alert('Erro ao gravar configurações', err.message || JSON.stringify(err));
      });
  };

  const handleSoundChange = (value) => {
    setShowSound(value);
    localStorage.setItem('sound', String(value));
    let lc = {...(device?.configs || {})};
    lc['sound'] = value ? '1' : '0';
    // ===== ALTERAÇÃO: ADICIONAR VERSÃO DO APP =====
    lc['config-version'] = appVersion;
    // ===== FIM DA ALTERAÇÃO =====
    deviceConfigsActions
      .addDeviceConfigs({
        configs: JSON.stringify(lc),
        people: '/people/' + currentCompany.id,
      })
      .catch(err => {
        console.error('addDeviceConfigs (sound) failed:', err);
        Alert.alert('Erro ao gravar configurações', err.message || JSON.stringify(err));
      });
  };

  const handleVibrationChange = (value) => {
    setShowVibration(value);
    localStorage.setItem('vibration', String(value));
    let lc = {...(device?.configs || {})};
    lc['vibration'] = value ? '1' : '0';
    // ===== ALTERAÇÃO: ADICIONAR VERSÃO DO APP =====
    lc['config-version'] = appVersion;
    // ===== FIM DA ALTERAÇÃO =====
    deviceConfigsActions
      .addDeviceConfigs({
        configs: JSON.stringify(lc),
        people: '/people/' + currentCompany.id,
      })
      .catch(err => {
        console.error('addDeviceConfigs (vibration) failed:', err);
        Alert.alert('Erro ao gravar configurações', err.message || JSON.stringify(err));
      });
  };

  const handlePosTypeChange = (value) => {
    setSelectedMode(value);
    let lc = {...(device?.configs || {})};
    lc['pos-type'] = value;
    lc['config-version'] = appVersion;
    deviceConfigsActions
      .addDeviceConfigs({
        configs: JSON.stringify(lc),
        people: '/people/' + currentCompany.id,
      })
      .catch(err => {
        console.error('addDeviceConfigs (pos-type) failed:', err);
        Alert.alert('Erro ao gravar configurações', err.message || JSON.stringify(err));
      });
  };

  const handlePrintModeChange = (value) => {
    setPrintingMode(value);
    let lc = {...(device?.configs || {})};
    lc['print-mode'] = value;
    lc['config-version'] = appVersion;
    deviceConfigsActions
      .addDeviceConfigs({
        configs: JSON.stringify(lc),
        people: '/people/' + currentCompany.id,
      })
      .catch(err => {
        console.error('addDeviceConfigs (print-mode) failed:', err);
        Alert.alert('Erro ao gravar configurações', err.message || JSON.stringify(err));
      });
  };

  const handleGatewayChange = (value) => {
    setSelectedGateway(value);
    let lc = {...(device?.configs || {})};
    lc['pos-gateway'] = value;
    lc['config-version'] = appVersion;
    deviceConfigsActions
      .addDeviceConfigs({
        configs: JSON.stringify(lc),
        people: '/people/' + currentCompany.id,
      })
      .catch(err => {
        console.error('addDeviceConfigs (pos-gateway) failed:', err);
        Alert.alert('Erro ao gravar configurações', err.message || JSON.stringify(err));
      });
  };

  const handleClearProducts = () => {
    localStorage.setItem('categories', JSON.stringify([]));
    categoryActions.setItems([]);
  };

  const handleClearTranslate = () => {
    global.t?.reload();
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
              <Text style={styles.Settings.label}>{global.t?.t("settings", "label", "machineId")}: </Text>
              <Text style={styles.Settings.value}>{storagedDevice.id}</Text>
            </View>
            <View style={styles.Settings.row}>
              <Text style={styles.Settings.label}>{global.t?.t("settings", "label", "manufacturer")}: </Text>
              <Text style={styles.Settings.value}>
                {storagedDevice?.manufacturer}
              </Text>
            </View>
            <View style={styles.Settings.row}>
              <Text style={styles.Settings.label}>{global.t?.t("settings", "label", "systemVersion")}: </Text>
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
              <Text style={styles.Settings.label}>{global.t?.t("settings", "label", "cashWallet")}: </Text>
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
              <Text style={styles.Settings.label}>{global.t?.t("settings", "label", "withdrawlWallet")}: </Text>
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

          {/* // // // // // TIPO DE COMANDA */}
          <View style={{marginTop: 12, marginBottom: 10}}>
            <Text style={styles.Settings.label}>{global.t?.t("settings", "label", "tab type")}</Text>
            <Picker
              selectedValue={checkType}
              onValueChange={handleCheckTypeChange}
              style={styles.Settings.picker}>

              <Picker.Item label={global.t?.t("settings", "option", "manual")} value="manual" />
              <Picker.Item label={global.t?.t("settings", "option", "barcode")} value="barcode" />
              <Picker.Item label={global.t?.t("settings", "option", "rfid")} value="rfid" />                            
              
            </Picker>
          </View>

          {/* // // // // // TIPO DE LEITURA DE PRODUTO */}
          <View style={{marginTop: 6, marginBottom: 10}}>
            <Text style={styles.Settings.label}>{global.t?.t("settings", "label", "product read method")}</Text>
            <Picker
              selectedValue={productInputType}
              onValueChange={handleProductInputTypeChange}
              style={styles.Settings.picker}>
              <Picker.Item label={global.t?.t("settings", "option", "manual")} value="manual" />
              <Picker.Item label={global.t?.t("settings", "option", "barcode")} value="barcode" />
              <Picker.Item label={global.t?.t("settings", "option", "rfid")} value="rfid" />                            
            </Picker>
          </View>

          <View style={{marginTop: 6, marginBottom: 10}}>
            <Text style={styles.Settings.label}>{global.t?.t("settings", "label", "selection type")}</Text>
            <Picker
              selectedValue={selectionType}
              onValueChange={handleSelectionTypeChange}
              style={styles.Settings.picker}>
              <Picker.Item label={global.t?.t("settings", "option", "single")}  value="single" />
              <Picker.Item label={global.t?.t("settings", "option", "multiple")}  value="multiple" />
            </Picker>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 12,
            }}>
            <Text style={styles.Settings.label}>{global.t?.t("settings", "label", "sound")}</Text>

            <Switch
              value={showSound}
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
            <Text style={styles.Settings.label}>{global.t?.t("settings", "label", "vibration")}</Text>

            <Switch
              value={showVibration}
              onValueChange={handleVibrationChange}
            />
          </View>

          <View style={{marginTop: 6}}>
            <Picker
              selectedValue={selectedMode}
              onValueChange={handlePosTypeChange}
              style={styles.Settings.picker}>
              <Picker.Item label={global.t?.t("settings", "option", "simple order")} value="simple" />
              <Picker.Item label={global.t?.t("settings", "option", "full order")} value="full" />
            </Picker>
          </View>
          <View style={{marginTop: 6, marginBottom: 10}}>
            <Picker
              selectedValue={printingMode}
              onValueChange={handlePrintModeChange}
              style={styles.Settings.picker}>
              <Picker.Item label={global.t?.t("settings", "option", "printSingleOrder")} value="order" />
              <Picker.Item label={global.t?.t("settings", "option", "printFullOrder")} value="form" />
            </Picker>
          </View>
          {(!cieloDevices.includes(storagedDevice?.manufacturer) ||
            storagedDevice?.isEmulator) && (
            <View style={{marginTop: 10}}>
              <Picker
                selectedValue={selectedGateway}
                onValueChange={handleGatewayChange}
                style={styles.Settings.picker}>
                <Picker.Item label="Infinite Pay" value="infinite-pay" />
                {(cieloDevices.includes(storagedDevice?.manufacturer) ||
                  storagedDevice?.isEmulator) && (
                  <Picker.Item label="Cielo" value="cielo" />
                )}
              </Picker>
            </View>
          )}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'stretch',
              marginTop: 6,
            }}>
            <TouchableOpacity
              onPress={handleClearTranslate}
              style={[
                globalStyles.button,
                {
                  flex: 1,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: 50,
                  marginTop: 0,
                },
              ]}>
              <Icon name="add-circle" size={24} color="#fff" />
              <Text style={{color: '#fff', marginLeft: 8}}>{global.t?.t("settings", "label", "resync translations")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleClearProducts}
              style={[
                globalStyles.button,
                {
                  flex: 1,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: 50,
                  marginTop: 0,
                },
              ]}>
              <Icon name="add-circle" size={24} color="#fff" />
              <Text style={{color: '#fff', marginLeft: 8}}>{global.t?.t("settings", "label", "resync products")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Settings;