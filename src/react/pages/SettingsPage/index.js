import React, {useState, useCallback, useEffect} from 'react';
import {
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import css from '@controleonline/ui-orders/src/react/css/orders';
import {getStore} from '@store';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {Picker} from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
const Settings = ({navigation}) => {
  const {styles, globalStyles} = css();
  const {getters: walletGetters} = getStore('wallet');
  const {getters: peopleGetters} = getStore('people');
  const {getters: configsGetters, actions: configActions} = getStore('configs');
  const {getters: deviceConfigGetters, actions: deviceConfigsActions} =
    getStore('device_config');
  const {item: device} = deviceConfigGetters;

  const {getters: paymentTypeGetters, actions: paymentTypeActions} =
    getStore('paymentType');
  const {items: paymentTypes} = paymentTypeGetters;
  const {currentCompany} = peopleGetters;
  const {isLoading: walletLoading} = walletGetters;
  const {items: companyConfigs, isSaving} = configsGetters;
  const [selectedMode, setSelectedMode] = useState(null);
  const [selectedGateway, setSelectedGateway] = useState(null);
  const [discovered, setDiscovered] = useState(false);

  const storagedDevice = localStorage.getItem('device');
  const [localDevice] = useState(() => {
    return storagedDevice ? JSON.parse(storagedDevice) : {};
  });

  useFocusEffect(
    useCallback(() => {
      if (localDevice && selectedGateway && selectedMode && discovered)
        addDeviceConfigs();
    }, [localDevice, selectedMode, selectedGateway, discovered]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!discovered)
        configActions
          .discoveryMainConfigs({
            people: '/people/' + currentCompany.id,
          })
          .finally(() => {
            setDiscovered(true);
          });
    }, [discovered]),
  );

  const addDeviceConfigs = () => {
    let lc = {...(device?.configs || {})};
    lc['config-version'] = localDevice?.buildNumber;
    lc['pos-type'] = selectedMode;
    lc['pos-gateway'] = selectedGateway;

    deviceConfigsActions.addDeviceConfigs({
      configs: JSON.stringify(lc),
      people: '/people/' + currentCompany.id,
    });
  };

  useFocusEffect(
    useCallback(() => {
      if (device?.configs) {
        setSelectedMode(device?.configs['pos-type']);
        setSelectedGateway(device?.configs['pos-gateway']);
      } else {
        setSelectedMode('full');
        setSelectedGateway('infinite-pay');
      }
    }, [device]),
  );

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
              <Text style={styles.Settings.value}>{localDevice?.id}</Text>
            </View>
            <View style={styles.Settings.row}>
              <Text style={styles.Settings.label}>Sistema: </Text>
              <Text style={styles.Settings.value}>
                {localDevice?.systemName}
              </Text>
            </View>
            <View style={styles.Settings.row}>
              <Text style={styles.Settings.label}>Versão do Sistema: </Text>
              <Text style={styles.Settings.value}>
                {localDevice?.systemVersion}
              </Text>
            </View>
            <View style={styles.Settings.row}>
              <Text style={styles.Settings.label}>Fabricante: </Text>
              <Text style={styles.Settings.value}>
                {localDevice?.manufacturer}
              </Text>
            </View>
            <View style={styles.Settings.row}>
              <Text style={styles.Settings.label}>Versão do POS: </Text>
              <Text style={styles.Settings.value}>
                {localDevice?.appVersion}
              </Text>
            </View>
            <View style={styles.Settings.row}>
              <Text style={styles.Settings.label}>Compilação do POS: </Text>
              <Text style={styles.Settings.value}>
                {localDevice?.buildNumber}
              </Text>
            </View>
          </View>
          <View style={{marginTop: 20}}>
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
          <View style={{marginTop: 10}}>
            <Picker
              selectedValue={selectedMode}
              onValueChange={itemValue => setSelectedMode(itemValue)}
              style={styles.Settings.picker}>
              <Picker.Item label="Modo Balcão" value="simple" />
              <Picker.Item label="Modo Comanda" value="full" />
            </Picker>
          </View>
          <View style={{marginTop: 10}}>
            <Picker
              selectedValue={selectedGateway}
              onValueChange={itemValue => setSelectedGateway(itemValue)}
              style={styles.Settings.picker}>
              <Picker.Item label="Cielo" value="cielo" />
              <Picker.Item label="Infinite Pay" value="infinite-pay" />
            </Picker>
          </View>
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
            },
          ]}>
          <Icon name="add-circle" size={24} color="#fff" />
          <Text style={{color: '#fff', marginLeft: 8}}>Refazer traduções</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Settings;
