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
import CieloPaySettings from '@controleonline/ui-orders/src/react/services/Cielo/Settings';
import InfinitePaySettings from '@controleonline/ui-orders/src/react/services/InfinitePay/Settings';

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

  const handleClearTranslate = () => {
    t.reload();
  };

  useFocusEffect(
    useCallback(() => {
      let lc = {...config};
      if (
        device &&
        selectedGateway &&
        selectedMode &&
        (!config ||
          config['config-version'] != device.buildNumber ||
          selectedMode != config['pos-type'] ||
          selectedGateway != config['pos-gateway'])
      ) {
        lc['config-version'] = device?.buildNumber;
        lc['pos-type'] = selectedMode;
        lc['pos-gateway'] = selectedGateway;
        addConfigs(lc);
      }
    }, [device, selectedMode, selectedGateway, config]),
  );

  const addConfigs = lc => {
    configActions
      .addConfigs({
        configKey: 'pos-' + device?.id,
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
    discoverWallet('pos-cash-wallet', 'Caixa');
    discoverWallet('pos-withdrawl-wallet', 'Reserva');
  };

  useFocusEffect(
    useCallback(() => {
      if (
        paymentTypes === null ||
        wallets === null ||
        !companyConfigs ||
        !companyConfigs['pos-cash-wallet'] ||
        !companyConfigs['pos-withdrawl-wallet']
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
        companyConfigs['pos-cash-wallet'],
        paymentTypes,
        paymentsCheck,
      );
      checkPaymentOptions(
        companyConfigs['pos-withdrawl-wallet'],
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
    const walletIdStr = String(walletId);
    const wallet = wallets.find(
      element => element['@id'].replace(/\D/g, '') === walletIdStr,
    );
    const walletIndex = wallets.findIndex(
      element => element['@id'].replace(/\D/g, '') === walletIdStr,
    );

    if (!wallet) return;

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
    if (!wallets) return;

    for (const paymentCheck of paymentsCheck) {
      const {frequency, installments, paymentType} = paymentCheck;
      const matchingPayment = paymentTypes.find(
        element =>
          element.frequency === frequency &&
          element.installments === installments &&
          element.paymentType === paymentType,
      );
      setTimeout(async () => {
        try {
          if (matchingPayment) {
            await checkWalletPaymentOptions(
              wallet,
              matchingPayment,
              paymentCheck,
            );
          } else {
            const savedPayment = await paymentTypeActions.save(paymentCheck);
            await checkWalletPaymentOptions(wallet, savedPayment, paymentCheck);
          }
        } catch (error) {
          console.error('Erro ao processar opções de pagamento:', error);
        }
      }, 1000);
    }
  }

  useFocusEffect(
    useCallback(() => {
      if (wallets == null && currentCompany)
        walletActions.getItems({
          people: '/people/' + currentCompany.id,
        });
    }, [wallets, currentCompany]),
  );

  const discoverWallet = (configName, name) => {
    if (!wallets || !Array.isArray(wallets)) return;

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
        setSelectedMode(config['pos-type'] || 'full');
        setSelectedGateway(config['pos-gateway'] || 'infinite-pay');
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
              <Text style={styles.Settings.label}>Versão do POS: </Text>
              <Text style={styles.Settings.value}>{device?.appVersion}</Text>
            </View>
            <View style={styles.Settings.row}>
              <Text style={styles.Settings.label}>Compilação do POS: </Text>
              <Text style={styles.Settings.value}>{device?.buildNumber}</Text>
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
              <CieloPaySettings
                discoverWallet={discoverWallet}
                checkPaymentOptions={checkPaymentOptions}
                checkWalletPaymentOptions={checkWalletPaymentOptions}
              />
            )}
            {selectedGateway == 'infinite-pay' && (
              <InfinitePaySettings
                discoverWallet={discoverWallet}
                checkPaymentOptions={checkPaymentOptions}
                checkWalletPaymentOptions={checkWalletPaymentOptions}
              />
            )}
          </View>
        </View>

        <TouchableOpacity
          onPress={handleClearTranslate}
          style={[
            globalStyles.button,
            globalStyles.btnAdd,
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
