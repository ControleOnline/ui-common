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
  const storagedDevice = localStorage.getItem('device');
  const [device, setDevice] = useState(() => {
    return storagedDevice ? JSON.parse(storagedDevice) : {};
  });
  const [localConfig, seLocalConfig] = useState({});

  const handleModeChange = mode => {
    const lc = {...localConfig};
    lc['pdv-type'] = mode;
    seLocalConfig(lc);
  };

  useFocusEffect(
    useCallback(() => {
      const lc = {...localConfig};
      if (
        device &&
        localConfig &&
        Object.entries(localConfig).length !== 0 &&
        companyConfigs &&
        Object.entries(companyConfigs).length !== 0 &&
        currentCompany &&
        Object.entries(currentCompany).length !== 0 &&
        companyConfigs['pdv-cash-wallet'] &&
        companyConfigs['pdv-withdrawl-wallet'] &&
        (!config ||
          config['config-version'] != device.buildNumber ||
          lc['pdv-type'] != selectedMode)
      ) {
        lc['config-version'] = device?.buildNumber;
        addConfigs(lc);
        setSelectedMode(lc['pdv-type']);
      }
    }, [device, localConfig, companyConfigs, currentCompany]),
  );

  const addConfigs = lc => {
    configActions
      .addConfigs({
        configKey: 'pdv-' + device?.id,
        configValue: JSON.stringify(lc),
        visibility: 'public',
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
        !currentCompany ||
        Object.entries(currentCompany).length === 0
      )
        return;
      const paymentCheck = {
        paymentType: 'Dinheiro',
        frequency: 'single',
        installments: 'single',
        people: '/people/' + currentCompany.id,
      };
      checkPaymentOptions(paymentTypes, paymentCheck).then(payment => {
        if (companyConfigs['pdv-cash-wallet'])
          checkWalletPaymentOptions(companyConfigs['pdv-cash-wallet'], [
            payment,
          ]);

        if (companyConfigs['pdv-withdrawl-wallet'])
          checkWalletPaymentOptions(companyConfigs['pdv-withdrawl-wallet'], [
            payment,
          ]);
      });
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

  const checkWalletPaymentOptions = (walletId, payments) => {
    const wallet = wallets.find(
      element => element['@id'].replace(/\D/g, '') === walletId,
    );
    const walletIndex = wallets.findIndex(
      element => element['@id'].replace(/\D/g, '') === walletId,
    );

    payments.forEach(payment => {
      if (!wallet.walletPaymentTypes || wallet.walletPaymentTypes.length == 0) {
        walletPaymentTypeActions
          .save({
            wallet: wallet['@id'],
            paymentType: payment['@id'],
            paymentCode: payment.paymentCode,
          })
          .then(data => {
            let w = [...wallets];

            w[walletIndex].walletPaymentTypes.push(data);
            walletActions.setItems(w);
          });
      } else {
        let p = wallet.walletPaymentTypes.find(element => {
          return (
            element.paymentType.frequency === payment.frequency &&
            element.paymentType.installments === payment.installments &&
            element.paymentType.paymentType === payment.paymentType
          );
        });
        if (!p || Object.entries(p).length === 0)
          walletPaymentTypeActions
            .save({
              wallet: wallet['@id'],
              paymentType: payment['@id'],
              paymentCode: payment.paymentCode,
            })
            .then(data => {
              let w = [...wallets];
              w[walletIndex].walletPaymentTypes.push(data);
              walletActions.setItems(w);
            });
      }
    });
  };
  async function checkPaymentOptions(paymentTypes, payment) {
    const {frequency, installments, paymentType} = payment;
    const matchingPayment = paymentTypes.find(
      element =>
        element.frequency === frequency &&
        element.installments === installments &&
        element.paymentType === paymentType,
    );

    if (matchingPayment) return Promise.resolve(matchingPayment);
    else {
      const savedPayment = await paymentTypeActions.save(payment);
      return savedPayment;
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
          if (data && data.length > 0) {
            let w = [...wallets];
            w.push(data);
            walletActions.setItems(w);
            saveConfig(configName, data['@id'].replace(/\D/g, ''));
          }
        });
  };

  const saveConfig = (config, value) => {
    if (!companyConfigs[config])
      configActions
        .save({
          configKey: config,
          configValue: value,
          visibility: 'public',
          people: '/people/' + currentCompany.id,
          module: '/modules/' + 8,
        })
        .then(() => {
          let c = {...companyConfigs};
          c[config] = value;
          configActions.setItems(c);
        });
  };
  useFocusEffect(
    useCallback(() => {
      let manufacturer = null;
      if (device) manufacturer = device.manufacturer;
      //pdv-cielo-wallet
      //discoverCompanyWallet('pdv-default-wallets');
    }, [device]),
  );
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
      if (config) handleModeChange(config['pdv-type'] || 'full');
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
              <Text style={styles.Settings.label}>deviceType: </Text>
              <Text style={styles.Settings.value}>{device?.deviceType}</Text>
            </View>
            <View style={styles.Settings.row}>
              <Text style={styles.Settings.label}>systemName: </Text>
              <Text style={styles.Settings.value}>{device?.systemName}</Text>
            </View>
            <View style={styles.Settings.row}>
              <Text style={styles.Settings.label}>systemVersion: </Text>
              <Text style={styles.Settings.value}>{device?.systemVersion}</Text>
            </View>
            <View style={styles.Settings.row}>
              <Text style={styles.Settings.label}>manufacturer: </Text>
              <Text style={styles.Settings.value}>{device?.manufacturer}</Text>
            </View>
            <View style={styles.Settings.row}>
              <Text style={styles.Settings.label}>model: </Text>
              <Text style={styles.Settings.value}>{device?.model}</Text>
            </View>
            <View style={styles.Settings.row}>
              <Text style={styles.Settings.label}>appVersion: </Text>
              <Text style={styles.Settings.value}>{device?.appVersion}</Text>
            </View>
            <View style={styles.Settings.row}>
              <Text style={styles.Settings.label}>buildNumber: </Text>
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
                  <ActivityIndicator
                    size={22}
                    color={styles.Settings.label}
                  />
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
                  <ActivityIndicator
                    size={22}
                    color={styles.Settings.label}
                  />
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Settings;
