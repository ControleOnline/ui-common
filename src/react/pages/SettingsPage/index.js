import React, {useState, useCallback, useEffect} from 'react';
import {
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Switch,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import css from '@controleonline/ui-orders/src/react/css/orders';
import {useStore} from '@store';
import {useFocusEffect} from '@react-navigation/native';
import {Picker} from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';

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

  const [selectedMode, setSelectedMode] = useState(null);
  const [printingMode, setPrintingMode] = useState('order');
  const [selectedGateway, setSelectedGateway] = useState(null);
  const [discovered, setDiscovered] = useState(false);
  const deviceStore = useStore('device');
  const deviceGetters = deviceStore.getters;
  const {item: storagedDevice} = deviceGetters;

  const [showBarcode, setShowBarcode] = useState(false);
  const [showSound, setShowSound] = useState(false);
  const [showVibration, setShowVibration] = useState(false);
  const [configsLoaded, setConfigsLoaded] = useState(false);
  const [deviceConfigsLoaded, setDeviceConfigsLoaded] = useState(false);

  const cieloDevices = ['Quantum', 'ingenico'];

  const createDefaultConfigs = useCallback(() => {
    if (!currentCompany || configsLoaded || !device?.configs) return;

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
    if (!lc['barcode-reader']) {
      lc['barcode-reader'] = '0';
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
      lc['config-version'] = storagedDevice?.buildNumber;
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
    if (needsUpdate) {
      deviceConfigsActions.addDeviceConfigs({
        configs: JSON.stringify(lc),
        people: '/people/' + currentCompany.id,
      });
    }

    setConfigsLoaded(true);
  }, [device, currentCompany, configsLoaded, storagedDevice]);

  useFocusEffect(
    useCallback(() => {
      setDeviceConfigsLoaded(false);
      setConfigsLoaded(false);
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      if (device?.configs !== undefined) {
        setDeviceConfigsLoaded(true);
      }
    }, [device?.configs]),
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
      console.log('Device configs do banco:', device?.configs);
      if (device?.configs) {
        setShowBarcode(
          device?.configs['barcode-reader'] === true ||
          device?.configs['barcode-reader'] === '1'
        );
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
        setShowBarcode(false);
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
      if (!discovered) {
        const params = {
          people: '/people/' + currentCompany.id,
        };
        configActions
          .discoveryMainConfigs(params)
          .finally(() => {
            setDiscovered(true);
          });
      }
    }, [discovered]),
  );

  const addDeviceConfigs = () => {
    let lc = {...(device?.configs || {})};
    lc['config-version'] = storagedDevice?.buildNumber;
    lc['pos-type'] = selectedMode;
    lc['pos-gateway'] = selectedGateway;
    lc['print-mode'] = printingMode;
    lc['barcode-reader'] = showBarcode ? '1' : '0';
    lc['sound'] = showSound ? '1' : '0';
    lc['vibration'] = showVibration ? '1' : '0';

    console.log('Enviando para banco:', lc);
    
    deviceConfigsActions.addDeviceConfigs({
      configs: JSON.stringify(lc),
      people: '/people/' + currentCompany.id,
    });
  };

  const handleBarcodeChange = (value) => {
    setShowBarcode(value);
    let lc = {...(device?.configs || {})};
    lc['barcode-reader'] = value ? '1' : '0';
    deviceConfigsActions.addDeviceConfigs({
      configs: JSON.stringify(lc),
      people: '/people/' + currentCompany.id,
    });
  };

  const handleSoundChange = (value) => {
    setShowSound(value);
    let lc = {...(device?.configs || {})};
    lc['sound'] = value ? '1' : '0';
    deviceConfigsActions.addDeviceConfigs({
      configs: JSON.stringify(lc),
      people: '/people/' + currentCompany.id,
    });
  };

  const handleVibrationChange = (value) => {
    setShowVibration(value);
    let lc = {...(device?.configs || {})};
    lc['vibration'] = value ? '1' : '0';
    deviceConfigsActions.addDeviceConfigs({
      configs: JSON.stringify(lc),
      people: '/people/' + currentCompany.id,
    });
  };

  const handleClearProducts = () => {
    localStorage.setItem('categories', JSON.stringify([]));
    categoryActions.setItems([]);
  };

  const handleClearTranslate = () => {
    t.reload();
  };

  return (
    <SafeAreaView style={styles.Settings.container}>
      <ScrollView contentContainerStyle={styles.Settings.scrollContent}>
        <View style={styles.Settings.mainContainer}>
          <View style={{marginTop: 20}}>
            <View style={styles.Settings.row}>
              <Text style={styles.Settings.label}>ID do equipamento: </Text>
              <Text style={styles.Settings.value}>{storagedDevice.id}</Text>
            </View>
            <View style={styles.Settings.row}>
              <Text style={styles.Settings.label}>Sistema: </Text>
              <Text style={styles.Settings.value}>
                {storagedDevice?.systemName}
              </Text>
            </View>
            <View style={styles.Settings.row}>
              <Text style={styles.Settings.label}>Versão do Sistema: </Text>
              <Text style={styles.Settings.value}>
                {storagedDevice?.systemVersion}
              </Text>
            </View>
            <View style={styles.Settings.row}>
              <Text style={styles.Settings.label}>Fabricante: </Text>
              <Text style={styles.Settings.value}>
                {storagedDevice?.manufacturer}
              </Text>
            </View>
            <View style={styles.Settings.row}>
              <Text style={styles.Settings.label}>Versão do POS: </Text>
              <Text style={styles.Settings.value}>
                {storagedDevice?.appVersion}
              </Text>
            </View>
            <View style={styles.Settings.row}>
              <Text style={styles.Settings.label}>Compilação do POS: </Text>
              <Text style={styles.Settings.value}>
                {storagedDevice?.buildNumber}
              </Text>
            </View>
          </View>
          <View style={{marginTop: 12}}>
            <View style={styles.Settings.walletRow}>
              <Text style={styles.Settings.label}>Carteira p/ Dinheiro: </Text>
              <View style={styles.Settings.walletValueContainer}>
                <Text style={styles.Settings.walletValue}>
                  {companyConfigs['pos-cash-wallet']}
                </Text>
                {walletLoading || isSaving ? (
                  <ActivityIndicator size={22} color={styles.Settings.label} />
                ) : companyConfigs['pos-cash-wallet'] ? (
                  <Icon name={'check'} size={22} color="green" />
                ) : (
                  <Icon name={'close'} size={22} color="red" />
                )}
              </View>
            </View>
            <View style={styles.Settings.walletRow}>
              <Text style={styles.Settings.label}>Carteira p/ Sangria: </Text>
              <View style={styles.Settings.walletValueContainer}>
                <Text style={styles.Settings.walletValue}>
                  {companyConfigs['pos-withdrawl-wallet']}
                </Text>
                {walletLoading || isSaving ? (
                  <ActivityIndicator size={22} color={styles.Settings.label} />
                ) : companyConfigs['pos-withdrawl-wallet'] ? (
                  <Icon name={'check'} size={22} color="green" />
                ) : (
                  <Icon name={'close'} size={22} color="red" />
                )}
              </View>
            </View>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 12,
            }}>
            <Text style={styles.Settings.label}>
              Leitor barras / qrcode
            </Text>

            <Switch
              value={showBarcode}
              onValueChange={handleBarcodeChange}
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 12,
            }}>
            <Text style={styles.Settings.label}>Som</Text>

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
            <Text style={styles.Settings.label}>Vibração</Text>

            <Switch
              value={showVibration}
              onValueChange={handleVibrationChange}
            />
          </View>

          <View style={{marginTop: 6}}>
            <Picker
              selectedValue={selectedMode}
              onValueChange={itemValue => {
                setSelectedMode(itemValue);
              }}
              style={styles.Settings.picker}>
              <Picker.Item label="Modo Balcão" value="simple" />
              <Picker.Item label="Modo Comanda" value="full" />
            </Picker>
          </View>
          <View style={{marginTop: 6, marginBottom: 10}}>
            <Picker
              selectedValue={printingMode}
              onValueChange={itemValue => {
                setPrintingMode(itemValue);
              }}
              style={styles.Settings.picker}>
              <Picker.Item label="Impressão Pedidos" value="order" />
              <Picker.Item label="Impressão Fichas" value="form" />
            </Picker>
          </View>
          {(!cieloDevices.includes(storagedDevice?.manufacturer) ||
            storagedDevice?.isEmulator) && (
            <View style={{marginTop: 10}}>
              <Picker
                selectedValue={selectedGateway}
                onValueChange={itemValue => {
                  setSelectedGateway(itemValue);
                }}
                style={styles.Settings.picker}>
                <Picker.Item label="Infinite Pay" value="infinite-pay" />
                {(cieloDevices.includes(storagedDevice?.manufacturer) ||
                  storagedDevice?.isEmulator) && (
                  <Picker.Item label="Cielo" value="cielo" />
                )}
              </Picker>
            </View>
          )}
        </View>
        
        <TouchableOpacity
          onPress={handleClearTranslate}
          style={[
            globalStyles.button,
            {
              flex: 1,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 6,
            },
          ]}>
          <Icon name="add-circle" size={24} color="#fff" />
          <Text style={{color: '#fff', marginLeft: 8}}>Refazer traduções</Text>
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
              marginTop: 6,
            },
          ]}>
          <Icon name="add-circle" size={24} color="#fff" />
          <Text style={{color: '#fff', marginLeft: 8}}>
            Sincronizar Produtos
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Settings;