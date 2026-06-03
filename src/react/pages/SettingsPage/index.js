/*
 * Contract imported from AGENTS.md
 * ## Escopo
 * - Modulo compartilhado de infraestrutura do front.
 * - Reune providers, servicos globais, componentes comuns, rotas compartilhadas, stores e utils.
 *
 * ## Estado
 * - Este modulo tem implementacao ativa em `src/react` e deve constar em novos prompts.
 *
 * ## Quando usar
 * - Prompts sobre helpers compartilhados, `DefaultProvider`, mensageria, impressao, importacao, logs, devices, gateways e utilitarios cross-app.
 * - O helper compartilhado de dinheiro/manual fica aqui e pode ser reutilizado por `ui-orders`, listeners remotos e outros gateways.
 * - A execucao tecnica dos gateways operacionais compartilhados, como `Cielo` e `Infinite Pay`, pode ficar aqui para ser reutilizada pelo checkout principal e pelo listener remoto.
 * - O protocolo de ida e volta do pagamento remoto entre web e device deve ficar centralizado aqui, para que checkout e listener remoto compartilhem a mesma chave de requisicao e o mesmo formato de resposta.
 * - O bridge nativo de kiosk fica aqui e deve apenas ligar/desligar a infraestrutura Android quando `APP_TYPE=POS` e `pos-operation-mode=kiosk`; regra de fluxo do totem continua no modulo dono.
 *
 * ## Limites
 * - Nao mover para `ui-common` regra de negocio que pertence claramente a `ui-orders`, `ui-shop`, `ui-manager` ou outro modulo dono.
 * - `ui-common` pode centralizar a parte tecnica de pagamento sem gateway, mas a decisao de quando usar dinheiro continua no modulo dono do fluxo.
 * - `ui-common` nao deve montar uma segunda UI de checkout para gateway. Quando houver listener remoto, ele deve executar o mesmo helper compartilhado do fluxo principal.
 * - Quando a implementacao tecnica do gateway ficar melhor organizada em arquivos separados por provedor no modulo dono, `ui-common` deve apenas orquestrar ou reaproveitar esses arquivos, sem recriar fluxo paralelo.
 *
 * ## Regras de mensageria
 * - Erros visuais transitrios do sistema devem sair por um unico componente compartilhado ligado ao `MessageService`.
 * - `showError` e o ponto canonico para esse feedback. Ele recebe string ou objeto de erro, exibe por alguns segundos e some sozinho.
 * - O card/modal transitorio de erro do `MessageService` e a unica UI permitida para esse feedback. Nao criar segunda tela de erro no modulo.
 * - Stores compartilhadas tambem devem usar esse fluxo. Quando uma store fizer `SET_ERROR`, o erro visual precisa sair pelo `MessageService`, nunca por caixa local do `StateStore`.
 * - `StateStore` e o componente canonico de loading/saving. Ele pode receber `store` e `stores` para configurar quais estados acompanhar, mas nao deve ser substituido por loaders locais nas telas consumidoras.
 * - O `StateStore` deve ler `isLoading` e `isSaving` diretamente dos stores; o erro deve entrar pelo contrato de `SET_ERROR` e ser publicado pelo `storeErrorBridge`, que alimenta o `MessageService`.
 * - Nao criar banners, alerts ou toasts paralelos para erro quando o caso puder usar o `MessageService`.
 * - O contrato canonico de erro HTTP do backend e o envelope do `HydratorService` com `@type: Error`, `hydra:title` e `hydra:description`; o `fetch` e os parsers compartilhados devem ler esse formato como fonte principal de mensagem.
 *
 * ## Regras de runtime em background
 * - O `BackgroundRuntimeBridge` deve manter o registro nativo por package/app, device e empresa para permitir varios APKs instalados no mesmo Android.
 * - O runtime de background pode ser religado pelo Android com `BOOT_COMPLETED` e `MY_PACKAGE_REPLACED`, reutilizando as inscricoes persistidas para seguir notificando mesmo sem a UI aberta.
 * - Em nativo, `WebsocketListener.native.js` deve consumir o stream local exposto pelo `BackgroundRuntimeService`, nao abrir websocket direto no backend.
 * - `WebsocketListener.web.js` e o fluxo web e deve usar runtime compartilhado com owner unico no browser via BroadcastChannel; nao abrir websocket direto do backend nem depender do runtime Android.
 * - Mensagens entregues pelo runtime nativo devem ser marcadas com `source: 'background-runtime'`, mas todos os apps com som configurado devem continuar processando `order.created` para aviso sonoro mesmo que a notificacao do sistema tambem apareca.
 * - O som configurado em `device_config` para `order.created` vale para qualquer `APP_TYPE`, incluindo KDS, Manager e PDV; deve ser enviado ao `BackgroundRuntimeService` como configuracao de device e tocado nativamente para funcionar mesmo com o app fechado.
 * - A configuracao de som do Manager e por usuario e separada da configuracao do device; ela tambem deve ser enviada ao `BackgroundRuntimeService` como configuracao de usuario, sem virar regra global dos demais apps.
 * - Quando a URL personalizada de audio estiver vazia, o runtime deve cair para o asset `src/assets/sound/caixa.m4a` empacotado no app. URL personalizada continua vencendo o fallback.
 * - No `MANAGER` Android, o push FCM humano usa canal nativo com `caixa.m4a`; URL personalizada nao pode tocar quando a notificacao chega com o app fechado.
 * - Alteracoes no protocolo local do runtime precisam manter compatibilidade entre o template do plugin e qualquer arquivo Android gerado.
 *
 * ## Regras de UI compartilhada
 * - Componentes que implementam comportamento default de listagem/filtros pertencem a `ui-default`.
 * - `ui-common` pode fornecer helpers e utilitarios usados por esses componentes, mas nao deve manter uma segunda implementacao de `DateShortcutFilter`, `CompactFilterSelector` ou componentes equivalentes de filtro de listagem.
 * - `DefaultProvider` carrega `menus-people` com `myCompany` e `APP_TYPE` atual e grava o resultado normalizado em `theme.menus`.
 * - Normalizacao de payload de menu runtime deve ficar em helper compartilhado neste modulo.
 * - O `RuntimeInfoFooter` deve montar o texto como `nome (identificador) / versao`, usando em runtime web o IP externo lido de `/runtime/ip` e persistido na metadata do device, com `location.hostname` apenas como fallback. No nativo, deve priorizar a versao persistida na metadata do device salvo no backend e o mesmo identificador mostrado na lista de devices (`device_config.device.device`), com fallback local quando o backend ainda nao tiver esse valor.
 * - O help contextual canônico deve ficar em `ui-common` como componente parametrizado acionado por `?`, com modal proprio e sem reaproveitar `ConfirmModal`. Telas consumidoras nao devem escrever explicacao fixa quando esse padrao estiver disponivel.
 */

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
  DEVICE_ORDER_VISIBILITY_COMPANY,
  DEVICE_ORDER_VISIBILITY_DEVICE,
  DEVICE_ORDER_VISIBILITY_KEY,
  DEVICE_RUNTIME_DEBUG_INFO_ENABLED_KEY,
  isTruthyValue,
  parseConfigsObject,
  POS_CHECK_ORDER_MANAGEMENT_MODE_CONFIG_KEY,
  POS_CHECK_ORDER_MANAGEMENT_MODE_EXISTING_ONLY,
  POS_CHECK_ORDER_MANAGEMENT_MODE_MANAGE,
  POS_CHECK_ORDER_TYPE_CONFIG_KEY,
  POS_CHECK_ORDER_TYPE_NONE,
  POS_CHECK_ORDER_TYPE_TAB,
  POS_CHECK_ORDER_TYPE_TABLE,
  resolveDefaultGateway,
  resolveDeviceOrderVisibility,
  resolvePosCheckOrderManagementMode,
  resolvePosCheckOrderType,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';

import {isWebRuntimeDevice as resolveIsWebRuntimeDevice} from '@controleonline/ui-common/src/react/utils/deviceRuntime';
import {DEFAULT_NOTIFICATION_SOUND_FILE} from '@controleonline/ui-common/src/react/utils/notificationSound';

import {
  inlineStyle_565_16,
  inlineStyle_639_14,
  inlineStyle_650_20,
  inlineStyle_659_16,
  inlineStyle_676_16,
  inlineStyle_690_16,
  inlineStyle_704_12,
  inlineStyle_720_12,
  inlineStyle_736_12,
  inlineStyle_743_14,
  inlineStyle_757_14,
  inlineStyle_783_14,
  inlineStyle_798_12,
  inlineStyle_805_14,
  inlineStyle_818_14,
  inlineStyle_830_16,
  inlineStyle_841_16,
  inlineStyle_852_16,
  inlineStyle_871_18,
  inlineStyle_899_18,
} from './index.styles';

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
  const [checkOrderType, setCheckOrderType] = useState(POS_CHECK_ORDER_TYPE_NONE);
  const [checkOrderManagementMode, setCheckOrderManagementMode] = useState(
    POS_CHECK_ORDER_MANAGEMENT_MODE_MANAGE,
  );
  const [productInputType, setProductInputType] = useState('manual');
  const [selectionType, setSelectionType] = useState('single');
  const [showSound, setShowSound] = useState(false);
  const [showVibration, setShowVibration] = useState(false);
  const [orderVisibility, setOrderVisibility] = useState(DEVICE_ORDER_VISIBILITY_DEVICE);
  const [alertSoundEnabled, setAlertSoundEnabled] = useState(false);
  const [alertSoundUrl, setAlertSoundUrl] = useState('');
  const [showRuntimeDebugInfo, setShowRuntimeDebugInfo] = useState(false);
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

      return deviceConfigsActions.addDeviceConfigs({
        configs: JSON.stringify(nextConfigs),
        people: '/people/' + currentCompany.id,
      });
    },
    [
      currentCompany?.id,
      deviceConfigsActions,
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
    if (!lc[POS_CHECK_ORDER_TYPE_CONFIG_KEY]) {
      lc[POS_CHECK_ORDER_TYPE_CONFIG_KEY] = POS_CHECK_ORDER_TYPE_NONE;
      needsUpdate = true;
    }
    if (!lc[POS_CHECK_ORDER_MANAGEMENT_MODE_CONFIG_KEY]) {
      lc[POS_CHECK_ORDER_MANAGEMENT_MODE_CONFIG_KEY] =
        POS_CHECK_ORDER_MANAGEMENT_MODE_MANAGE;
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
    if (!lc[DEVICE_ORDER_VISIBILITY_KEY]) {
      lc[DEVICE_ORDER_VISIBILITY_KEY] = DEVICE_ORDER_VISIBILITY_DEVICE;
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
    if (lc[DEVICE_RUNTIME_DEBUG_INFO_ENABLED_KEY] === undefined || lc[DEVICE_RUNTIME_DEBUG_INFO_ENABLED_KEY] === null) {
      lc[DEVICE_RUNTIME_DEBUG_INFO_ENABLED_KEY] = '0';
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
              } catch {
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
        setCheckOrderType(
          resolvePosCheckOrderType(device?.configs),
        );
        setCheckOrderManagementMode(
          resolvePosCheckOrderManagementMode(device?.configs),
        );
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
        setOrderVisibility(resolveDeviceOrderVisibility(device?.configs));
        setAlertSoundEnabled(isTruthyValue(device?.configs[DEVICE_ALERT_SOUND_ENABLED_KEY]));
        setAlertSoundUrl(String(device?.configs[DEVICE_ALERT_SOUND_URL_KEY] || ''));
        setShowRuntimeDebugInfo(
          isTruthyValue(device?.configs[DEVICE_RUNTIME_DEBUG_INFO_ENABLED_KEY]),
        );
        setSelectedMode(device?.configs['pos-type'] || 'full');
        setPrintingMode(device?.configs['print-mode'] || 'order');
        setSelectedGateway(device?.configs['pos-gateway'] || 'infinite-pay');
      } else {
        setCheckType('manual');
        setCheckOrderType(POS_CHECK_ORDER_TYPE_NONE);
        setCheckOrderManagementMode(POS_CHECK_ORDER_MANAGEMENT_MODE_MANAGE);
        setProductInputType('manual');
        setSelectionType('single');
        setShowSound(false);
        setShowVibration(false);
        setOrderVisibility(DEVICE_ORDER_VISIBILITY_DEVICE);
        setAlertSoundEnabled(false);
        setAlertSoundUrl('');
        setShowRuntimeDebugInfo(false);
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
    let lc = appendScreenMetrics({...(device?.configs || {})});
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
    let lc = appendScreenMetrics({...(device?.configs || {})});
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

  const handleCheckOrderTypeChange = value => {
    setCheckOrderType(value);
    let lc = appendScreenMetrics({...(device?.configs || {})});
    lc[POS_CHECK_ORDER_TYPE_CONFIG_KEY] = value;
    if (value === POS_CHECK_ORDER_TYPE_NONE) {
      lc[POS_CHECK_ORDER_MANAGEMENT_MODE_CONFIG_KEY] =
        POS_CHECK_ORDER_MANAGEMENT_MODE_MANAGE;
      setCheckOrderManagementMode(POS_CHECK_ORDER_MANAGEMENT_MODE_MANAGE);
    }
    lc['config-version'] = appVersion;
    persistDeviceConfigs(lc).catch(err => {
      console.error('addDeviceConfigs (check-order-type) failed:', err);
      Alert.alert('Erro ao gravar configurações', err.message || JSON.stringify(err));
    });
  };

  const handleCheckOrderManagementModeChange = value => {
    const nextValue =
      value === POS_CHECK_ORDER_MANAGEMENT_MODE_EXISTING_ONLY
        ? POS_CHECK_ORDER_MANAGEMENT_MODE_EXISTING_ONLY
        : POS_CHECK_ORDER_MANAGEMENT_MODE_MANAGE;

    setCheckOrderManagementMode(nextValue);
    let lc = appendScreenMetrics({...(device?.configs || {})});
    lc[POS_CHECK_ORDER_MANAGEMENT_MODE_CONFIG_KEY] = nextValue;
    lc['config-version'] = appVersion;
    persistDeviceConfigs(lc).catch(err => {
      console.error(
        'addDeviceConfigs (check-order-management-mode) failed:',
        err,
      );
      Alert.alert('Erro ao gravar configurações', err.message || JSON.stringify(err));
    });
  };

  const handleProductInputTypeChange = (value) => {
    setProductInputType(value);
    let lc = appendScreenMetrics({...(device?.configs || {})});
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
    let lc = appendScreenMetrics({...(device?.configs || {})});
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
    let lc = appendScreenMetrics({...(device?.configs || {})});
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

  const handleOrderVisibilityChange = value => {
    setOrderVisibility(value);
    let lc = appendScreenMetrics({...(device?.configs || {})});
    lc[DEVICE_ORDER_VISIBILITY_KEY] = value || DEVICE_ORDER_VISIBILITY_DEVICE;
    lc['config-version'] = appVersion;
    persistDeviceConfigs(lc)
      .catch(err => {
        console.error('addDeviceConfigs (order visibility) failed:', err);
        Alert.alert('Erro ao gravar configurações', err.message || JSON.stringify(err));
      });
  };

  const handleAlertSoundEnabledChange = value => {
    setAlertSoundEnabled(value);
    let lc = appendScreenMetrics({...(device?.configs || {})});
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
    let lc = appendScreenMetrics({...(device?.configs || {})});
    lc[DEVICE_ALERT_SOUND_ENABLED_KEY] = alertSoundEnabled ? '1' : '0';
    lc[DEVICE_ALERT_SOUND_URL_KEY] = alertSoundUrl.trim();
    lc['config-version'] = appVersion;
    persistDeviceConfigs(lc)
      .catch(err => {
        console.error('addDeviceConfigs (notification sound url) failed:', err);
        Alert.alert('Erro ao gravar configurações', err.message || JSON.stringify(err));
      });
  };

  const handleRuntimeDebugInfoChange = value => {
    setShowRuntimeDebugInfo(value);
    let lc = appendScreenMetrics({...(device?.configs || {})});
    lc[DEVICE_RUNTIME_DEBUG_INFO_ENABLED_KEY] = value ? '1' : '0';
    lc['config-version'] = appVersion;
    persistDeviceConfigs(lc)
      .catch(err => {
        console.error('addDeviceConfigs (runtime debug info) failed:', err);
        Alert.alert('Erro ao gravar configurações', err.message || JSON.stringify(err));
      });
  };

  const handlePosTypeChange = (value) => {
    setSelectedMode(value);
    let lc = appendScreenMetrics({...(device?.configs || {})});
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
    let lc = appendScreenMetrics({...(device?.configs || {})});
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
    let lc = appendScreenMetrics({...(device?.configs || {})});
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
          <View style={inlineStyle_565_16}>
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
              style={inlineStyle_639_14}>
              <Text style={[styles.Settings.label, {marginBottom: 4}]}>
                Configuração sincronizada
              </Text>
              <Text style={inlineStyle_650_20}>
                No navegador este runtime usa configurações sincronizadas do
                device web e da empresa. Ajustes compatíveis ficam refletidos no
                rodapé e nos recursos em tempo real.
              </Text>
            </View>
          )}

          {/* // // // // // LINKED ORDER INPUT */}
          <View style={inlineStyle_659_16}>
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

          <View style={inlineStyle_676_16}>
            <Text style={styles.Settings.label}>
              {global.t?.t('configs', 'label', 'linkedOrderType') ||
                'Service base order'}
            </Text>
            <Picker
              selectedValue={checkOrderType}
              onValueChange={handleCheckOrderTypeChange}
              enabled={!isWebRuntimeDevice}
              mode={pickerMode}
              style={styles.Settings.picker}>
              <Picker.Item
                label={global.t?.t('configs', 'option', 'none') || 'None'}
                value={POS_CHECK_ORDER_TYPE_NONE}
              />
              <Picker.Item
                label={global.t?.t('orders', 'title', 'tab') || 'Tab'}
                value={POS_CHECK_ORDER_TYPE_TAB}
              />
              <Picker.Item
                label={global.t?.t('orders', 'title', 'table') || 'Table'}
                value={POS_CHECK_ORDER_TYPE_TABLE}
              />
            </Picker>
          </View>

          {checkOrderType !== POS_CHECK_ORDER_TYPE_NONE && (
            <View style={inlineStyle_676_16}>
              <Text style={styles.Settings.label}>
                {global.t?.t('configs', 'label', 'linkedOrderManagementMode') ||
                  'Tab and table access'}
              </Text>
              <Picker
                selectedValue={checkOrderManagementMode}
                onValueChange={handleCheckOrderManagementModeChange}
                enabled={!isWebRuntimeDevice}
                mode={pickerMode}
                style={styles.Settings.picker}>
                <Picker.Item
                  label={
                    global.t?.t('configs', 'option', 'manageLinkedOrders') ||
                    'Open and close tabs/tables'
                  }
                  value={POS_CHECK_ORDER_MANAGEMENT_MODE_MANAGE}
                />
                <Picker.Item
                  label={
                    global.t?.t(
                      'configs',
                      'option',
                      'existingLinkedOrdersOnly',
                    ) || 'Use open tabs/tables only'
                  }
                  value={POS_CHECK_ORDER_MANAGEMENT_MODE_EXISTING_ONLY}
                />
              </Picker>
            </View>
          )}

          {/* // // // // // TIPO DE LEITURA DE PRODUTO */}
          <View style={inlineStyle_676_16}>
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

          <View style={inlineStyle_690_16}>
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
            style={inlineStyle_704_12}>
            <Text style={styles.Settings.label}>{global.t?.t("configs", "label", "sound")}</Text>

            <Switch
              value={showSound}
              disabled={isWebRuntimeDevice}
              onValueChange={handleSoundChange}
            />
          </View>

          <View
            style={inlineStyle_720_12}>
            <Text style={styles.Settings.label}>{global.t?.t("configs", "label", "vibration")}</Text>

            <Switch
              value={showVibration}
              disabled={isWebRuntimeDevice}
              onValueChange={handleVibrationChange}
            />
          </View>

          <View
            style={inlineStyle_736_12}>
            <View
              style={inlineStyle_743_14}>
              <Text style={styles.Settings.label}>Aviso sonoro via websocket</Text>
              <Switch
                value={alertSoundEnabled}
                disabled={isWebRuntimeDevice}
                onValueChange={handleAlertSoundEnabledChange}
              />
            </View>

            <Text
              style={inlineStyle_757_14}>
              Toca quando este device recebe o evento
              order.created de um novo pedido em preparo via
              websocket.
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
              style={inlineStyle_783_14}
            />
            <Text style={inlineStyle_818_14}>
              Se a URL ficar vazia, o runtime usa o som padrão do app
              ({DEFAULT_NOTIFICATION_SOUND_FILE}).
            </Text>
          </View>

          <View
            style={inlineStyle_798_12}>
            <View
              style={inlineStyle_805_14}>
              <Text style={styles.Settings.label}>Debug do socket no rodapé</Text>
              <Switch
                value={showRuntimeDebugInfo}
                onValueChange={handleRuntimeDebugInfoChange}
              />
            </View>

            <Text
              style={inlineStyle_818_14}>
              Quando desligado, o rodapé mostra só um indicador discreto do
              socket. Quando ligado, exibe os detalhes completos de realtime e
              refresh em qualquer tela do sistema.
            </Text>
          </View>

          <View style={inlineStyle_830_16}>
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
          <View style={inlineStyle_841_16}>
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
          <View style={inlineStyle_852_16}>
            <Text style={styles.Settings.label}>Pedidos visíveis no PDV</Text>
            <Picker
              selectedValue={orderVisibility}
              onValueChange={handleOrderVisibilityChange}
              enabled={!isWebRuntimeDevice}
              mode={pickerMode}
              style={styles.Settings.picker}>
              <Picker.Item
                label="Somente pedidos deste device"
                value={DEVICE_ORDER_VISIBILITY_DEVICE}
              />
              <Picker.Item
                label="Todos os pedidos da empresa"
                value={DEVICE_ORDER_VISIBILITY_COMPANY}
              />
            </Picker>
          </View>
          {showGatewayPicker && (
            <View style={inlineStyle_871_18}>
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
            <Text style={inlineStyle_899_18}>{global.t?.t("configs", "label", "resync translations")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Settings;
