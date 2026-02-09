import React, { createContext, useContext, useEffect, useState } from 'react'
import { View, ActivityIndicator, Text } from 'react-native'
import DeviceInfo from 'react-native-device-info'
import Translate from '@controleonline/ui-common/src/utils/translate'
import { WebsocketListener } from '@controleonline/ui-common/src/react/components/WebsocketListener'
import PrintService from '@controleonline/ui-common/src/react/components/PrintService'

import { useStore } from '@store'
import useGooglePaywall from './Paywall/Google'

const ThemeContext = createContext()

export const DefaultProvider = ({ children }) => {
  const themeStore = useStore('theme')
  const getters = themeStore.getters
  const actions = themeStore.actions

  const authStore = useStore('auth')
  const authGetters = authStore.getters

  const peopleStore = useStore('people')
  const peopleGetters = peopleStore.getters
  const peopleActions = peopleStore.actions

  const deviceStore = useStore('device')
  const deviceActions = deviceStore.actions

  const device_configStore = useStore('device_config')
  const deviceConfigsGetters = device_configStore.getters
  const deviceConfigsActions = device_configStore.actions

  const configsStore = useStore('configs')
  const configActions = configsStore.actions
  const configsGetters = configsStore.getters

  const printerStore = useStore('printer')
  const printerActions = printerStore.actions

  const walletPaymentTypeStore = useStore('walletPaymentType')
  const paymentTypeActions = walletPaymentTypeStore.actions

  const translateStore = useStore('translate')
  const translateActions = translateStore.actions

  const { items: companyConfigs } = configsGetters
  const { colors, menus } = getters
  const { currentCompany, defaultCompany } = peopleGetters
  const { item: device_config } = deviceConfigsGetters
  const { isLogged } = authGetters

  const [translateReady, setTranslateReady] = useState(false)
  const [device, setDevice] = useState(
    JSON.parse(localStorage.getItem('device') || '{}'),
  )

  const { loading: paywallLoading, blocked, subscribe } = useGooglePaywall(isLogged)

  const fetchDeviceId = async () => {
    const uniqueId = await DeviceInfo.getUniqueId()
    const deviceId = await DeviceInfo.getDeviceId()
    const systemName = await DeviceInfo.getSystemName()
    const systemVersion = await DeviceInfo.getSystemVersion()
    const manufacturer = await DeviceInfo.getManufacturer()
    const model = await DeviceInfo.getModel()
    const batteryLevel = await DeviceInfo.getBatteryLevel()
    const isEmulator = await DeviceInfo.isEmulator()
    const appVersion = await DeviceInfo.getVersion()
    const buildNumber = await DeviceInfo.getBuildNumber()

    if (uniqueId) {
      const ld = {
        id: uniqueId,
        deviceType: deviceId,
        systemName,
        systemVersion,
        manufacturer,
        model,
        batteryLevel,
        isEmulator,
        appVersion,
        buildNumber,
      }
      setDevice(ld)
      localStorage.setItem('device', JSON.stringify(ld))
    } else {
      setTimeout(fetchDeviceId, 300)
    }
  }

  useEffect(() => {
    const checkVersion = async () => {
      const appVersion = await DeviceInfo.getVersion()
      if (device?.appVersion && device.appVersion !== appVersion) {
        fetchDeviceId()
      }
    }
    checkVersion()
  }, [device])

  useEffect(() => {
    if (!device?.id) {
      fetchDeviceId()
    } else {
      deviceActions.setItem(device)
    }
  }, [device])

  useEffect(() => {
    if (device?.id) {
      peopleActions.defaultCompany()
    }
  }, [device])

  useEffect(() => {
    if (currentCompany?.id) {
      printerActions.getPrinters({ people: currentCompany.id })
    }
  }, [currentCompany])

  useEffect(() => {
    if (
      companyConfigs &&
      device_config?.configs &&
      Object.entries(device_config.configs).length > 0 &&
      device_config.configs['pos-gateway']
    ) {
      let wallets = []

      if (
        companyConfigs[
        'pos-' + device_config.configs['pos-gateway'] + '-wallet'
        ]
      ) {
        wallets.push(
          companyConfigs[
          'pos-' + device_config.configs['pos-gateway'] + '-wallet'
          ],
        )
      }

      if (companyConfigs && companyConfigs['pos-cash-wallet']) {
        wallets.push(companyConfigs['pos-cash-wallet'])
      }

      paymentTypeActions.getItems({
        people: '/people/' + currentCompany.id,
        wallet: wallets,
      })
    }
  }, [currentCompany, companyConfigs, device_config])

  useEffect(() => {
    if (device?.id && isLogged && currentCompany) {
      deviceConfigsActions
        .getItems({
          'device.device': device.id,
          people: '/people/' + currentCompany.id,
        })
        .then(data => {
          if (data?.length > 0) {
            const d = { ...data[0], configs: JSON.parse(data[0].configs) }
            deviceConfigsActions.setItem(d)
          }
        })
    }
  }, [currentCompany, isLogged, device])

  useEffect(() => {
    if (isLogged && currentCompany) {
      configActions.setItems(currentCompany.configs)
    }
  }, [currentCompany, isLogged])

  useEffect(() => {
    if (isLogged && currentCompany) {
      global.t = new Translate(
        defaultCompany,
        currentCompany,
        ['invoice', 'orders'],
        translateActions,
      )
      t.discoveryAll().then(() => setTranslateReady(true))
    }
  }, [currentCompany, isLogged])

  useEffect(() => {
    if (device?.id && isLogged) {
      peopleActions.myCompanies()
    }
  }, [isLogged, device])

  useEffect(() => {
    const fetchColors = async () => {
      const cssText = await api.fetch('themes-colors.css', {
        responseType: 'text',
      })

      const parsedColors = {}
      const matches = cssText.match(/--[\w-]+:\s*#[0-9a-fA-F]+/g)

      if (matches) {
        matches.forEach(match => {
          const [key, value] = match.split(':')
          parsedColors[key.replace('--', '').trim()] = value.trim()
        })
      }

      actions.setColors(parsedColors)
    }

    if (device?.id) {
      fetchColors()
    }
  }, [device])

  if ((isLogged && (!translateReady || paywallLoading))) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1B5587" />
        <Text style={{ marginTop: 10 }}>Carregando...</Text>
      </View>
    )
  }

  return (
    device?.id && (
      <ThemeContext.Provider value={{ colors, menus }}>
        {!blocked ? (
          children
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ marginBottom: 16, fontSize: 16 }}>
              Assine para continuar
            </Text>
            <Pressable
              onPress={subscribe}
              style={{
                backgroundColor: '#1B5587',
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 6,
              }}>
              <Text style={{ color: '#fff', fontSize: 16 }}>
                Assinar agora
              </Text>
            </Pressable>
          </View>
        )}
        <WebsocketListener />
        <PrintService />
      </ThemeContext.Provider>
    )
  )

}

export const useTheme = () => useContext(ThemeContext)