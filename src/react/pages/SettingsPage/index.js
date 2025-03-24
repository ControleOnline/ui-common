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
import Cielo from '@controleonline/ui-orders/src/react/services/Cielo/Settings';

const Settings = ({navigation}) => {
  const {styles, globalStyles} = css();
  const {getters: walletGetters, actions: walletActions} = getStore('wallet');
  const {getters: peopleGetters, actions: peopleActions} = getStore('people');
  const {getters: configsGetters, actions: configActions} = getStore('configs');
  const {getters: walletPaymentTypeGetters, actions: walletPaymentTypeActions} =
    getStore('walletPaymentType');
  const {getters: paymentTypeGetters, actions: paymentTypeActions} =
    getStore('paymentType');
  const {items: paymentTypes} = paymentTypeGetters;
  const {currentCompany} = peopleGetters;
  const {isLoading: walletLoading, items: wallets} = walletGetters;
  const {item: config, items: companyConfigs, isSaving} = configsGetters;
  const [selectedMode, setSelectedMode] = useState(null);
  const [selectedGateway, setSelectedGateway] = useState(null);

  const storagedDevice = localStorage.getItem('device');
  const [device, setDevice] = useState(() => {
    return storagedDevice ? JSON.parse(storagedDevice) : {};
  });

  const handleModeChange = mode => {
    setSelectedMode(mode);
  };

  const handleGatewayChange = gateway => {
    setSelectedGateway(gateway);
  };

  useFocusEffect(
    useCallback(() => {
      lc = {...config};
      if (
        device &&
        selectedGateway &&
        selectedMode &&
        (!config ||
          config['config-version'] != device.buildNumber ||
          selectedMode != config['pdv-type'] ||
          selectedGateway != config['pdv-gateway'])
      ) {
        lc['config-version'] = device?.buildNumber;
        lc['pdv-type'] = selectedMode;
        lc['pdv-gateway'] = selectedGateway;
        addConfigs(lc);
      }
    }, [device, selectedMode, selectedGateway, config]),
  );

  const addConfigs = lc => {
    configActions
      .addConfigs({
        configKey: 'pdv-' + device?.id,
        configValue: JSON.stringify(lc),
        visibility: 'private',
        people: '/people/' + currentCompany.id,
        module: '/modules/' + 8,
      })
      .then(value => {
        configActions.setItem(JSON.parse(value.configValue));
      });
  };
  const ckeckCompanyConfigs = () => {
    discoverWallet('pdv-cash-wallet', 'Caixa');
    discoverWallet('pdv-withdrawl-wallet', 'Gerência');
  };

  useFocusEffect(
    useCallback(() => {
      if (
        paymentTypes === null ||
        wallets === null ||
        !companyConfigs ||
        !companyConfigs['pdv-cash-wallet'] ||
        !companyConfigs['pdv-withdrawl-wallet']
      )
        return;
      const paymentsCheck = [
        {
          paymentType: 'Dinheiro',
          frequency: 'single',
          installments: 'single',
          people: '/people/' + currentCompany.id,
        },
      ];
      checkPaymentOptions(
        companyConfigs['pdv-cash-wallet'],
        paymentTypes,
        paymentsCheck,
      );
      checkPaymentOptions(
        companyConfigs['pdv-withdrawl-wallet'],
        paymentTypes,
        paymentsCheck,
      );
    }, [companyConfigs, paymentTypes, wallets, currentCompany]),
  );
  useFocusEffect(
    useCallback(() => {
      if (
        paymentTypes == null &&
        currentCompany &&
        Object.entries(currentCompany).length !== 0
      )
        paymentTypeActions.getItems({
          people: '/people/' + currentCompany.id,
        });
    }, [paymentTypes, currentCompany]),
  );

  async function checkWalletPaymentOptions(walletId, payment, paymentCheck) {
    const wallet = wallets.find(
      element => element['@id'].replace(/\D/g, '') === walletId,
    );
    const walletIndex = wallets.findIndex(
      element => element['@id'].replace(/\D/g, '') === walletId,
    );

    if (!wallet.walletPaymentTypes || wallet.walletPaymentTypes.length == 0) {
      const data = await walletPaymentTypeActions.save({
        wallet: wallet['@id'],
        paymentType: payment['@id'],
        paymentCode: paymentCheck.paymentCode,
      });
      let w = [...wallets];
      w[walletIndex].walletPaymentTypes.push(data);
      walletActions.setItems(w);
    } else {
      let p = wallet.walletPaymentTypes.find(element => {
        return (
          element.paymentType.frequency === payment.frequency &&
          element.paymentType.installments === payment.installments &&
          element.paymentType.paymentType === payment.paymentType
        );
      });
      if (!p || Object.entries(p).length === 0) {
        const data = await walletPaymentTypeActions.save({
          wallet: wallet['@id'],
          paymentType: payment['@id'],
          paymentCode: paymentCheck.paymentCode,
        });
        let w = [...wallets];
        w[walletIndex].walletPaymentTypes.push(data);
        walletActions.setItems(w);
      }
    }
  }

  async function checkPaymentOptions(wallet, paymentTypes, paymentsCheck) {
    for (const paymentCheck of paymentsCheck) {
      const {frequency, installments, paymentType} = paymentCheck;
      const matchingPayment = paymentTypes.find(
        element =>
          element.frequency === frequency &&
          element.installments === installments &&
          element.paymentType === paymentType,
      );
      setTimeout(async () => {
        if (matchingPayment) {
          await checkWalletPaymentOptions(
            wallet,
            matchingPayment,
            paymentCheck,
          );
        } else {
          const savedPayment = await paymentTypeActions.save(payment);
          await checkWalletPaymentOptions(wallet, savedPayment, paymentCheck);
        }
      }, 1000);
    }
  }

  useFocusEffect(
    useCallback(() => {
      if (wallets == null)
        walletActions.getItems({
          people: '/people/' + currentCompany.id,
        });
    }, [wallets]),
  );
  const discoverWallet = (configName, name) => {
    const w = wallets.find(element => element.wallet === name);
    if (w) saveConfig(configName, w['@id'].replace(/\D/g, ''));
    else
      walletActions
        .save({
          wallet: name,
          balance: 0,
          people: '/people/' + currentCompany.id,
        })
        .then(data => {
          saveConfig(configName, data['@id'].replace(/\D/g, ''));
        });
  };

  const saveConfig = (config, value) => {
    if (!companyConfigs[config])
      configActions.addConfigs({
        configKey: config,
        configValue: value,
        visibility: 'public',
        people: '/people/' + currentCompany.id,
        module: '/modules/' + 8,
      });
  };

  useFocusEffect(
    useCallback(() => {
      if (
        wallets !== null &&
        companyConfigs &&
        currentCompany &&
        Object.entries(currentCompany).length !== 0
      )
        ckeckCompanyConfigs();
    }, [companyConfigs, currentCompany, wallets]),
  );

  useFocusEffect(
    useCallback(() => {
      if (config) {
        setSelectedMode(config['pdv-type'] || 'full');
        setSelectedGateway(config['pdv-gateway'] || 'infinite-pay');
      }
    }, [config]),
  );

  return (
    <SafeAreaView style={styles.Settings.container}>
      <ScrollView contentContainerStyle={styles.Settings.scrollContent}>
        <View style={styles.Settings.mainContainer}>
          <View style={{marginTop: 20}}>
            <View style={styles.Settings.row}>
              <Text style={styles.Settings.label}>ID do equipamento: </Text>
              <Text style={styles.Settings.value}>{device?.id}</Text>
            </View>
            <View style={styles.Settings.row}>
              <Text style={styles.Settings.label}>Sistema: </Text>
              <Text style={styles.Settings.value}>{device?.systemName}</Text>
            </View>
            <View style={styles.Settings.row}>
              <Text style={styles.Settings.label}>Versão do Sistema: </Text>
              <Text style={styles.Settings.value}>{device?.systemVersion}</Text>
            </View>
            <View style={styles.Settings.row}>
              <Text style={styles.Settings.label}>Fabricante: </Text>
              <Text style={styles.Settings.value}>{device?.manufacturer}</Text>
            </View>
            <View style={styles.Settings.row}>
              <Text style={styles.Settings.label}>Versão do PDV: </Text>
              <Text style={styles.Settings.value}>{device?.appVersion}</Text>
            </View>
            <View style={styles.Settings.row}>
              <Text style={styles.Settings.label}>Compilaçãodo PDV: </Text>
              <Text style={styles.Settings.value}>{device?.buildNumber}</Text>
            </View>
          </View>
          <View style={{marginTop: 20}}>
            <View style={styles.Settings.walletRow}>
              <Text style={styles.Settings.label}>Carteira p/ Dinheiro: </Text>
              <View style={styles.Settings.walletValueContainer}>
                <Text style={styles.Settings.walletValue}>
                  {companyConfigs['pdv-cash-wallet']}
                </Text>
                {walletLoading || isSaving ? (
                  <ActivityIndicator size={22} color={styles.Settings.label} />
                ) : companyConfigs['pdv-cash-wallet'] ? (
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
                  {companyConfigs['pdv-withdrawl-wallet']}
                </Text>
                {walletLoading || isSaving ? (
                  <ActivityIndicator size={22} color={styles.Settings.label} />
                ) : companyConfigs['pdv-withdrawl-wallet'] ? (
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
              onValueChange={itemValue => handleModeChange(itemValue)}
              style={styles.Settings.picker}>
              <Picker.Item label="Modo Balcão" value="simple" />
              <Picker.Item label="Modo Comanda" value="full" />
            </Picker>
          </View>
          <View style={{marginTop: 10}}>
            <Picker
              selectedValue={selectedGateway}
              onValueChange={itemValue => handleGatewayChange(itemValue)}
              style={styles.Settings.picker}>
              <Picker.Item label="Cielo" value="cielo" />
              <Picker.Item label="Infinite Pay" value="infinite-pay" />
            </Picker>
          </View>
          <View style={{marginTop: 10}}>
            {selectedGateway == 'cielo' && (
              <Cielo
                discoverWallet={discoverWallet}
                checkPaymentOptions={checkPaymentOptions}
                checkWalletPaymentOptions={checkWalletPaymentOptions}
              />
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Settings;
