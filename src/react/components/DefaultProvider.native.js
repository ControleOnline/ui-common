import React, { createContext, useContext, useEffect, useState } from 'react'
import { View, ActivityIndicator, Text, Pressable } from 'react-native'
import DeviceInfo from 'react-native-device-info'
import Translate from '@controleonline/ui-common/src/utils/translate'
import { WebsocketListener } from '@controleonline/ui-common/src/react/components/WebsocketListener'
import PrintService from '@controleonline/ui-common/src/react/components/PrintService'
import { useStore } from '@store'
import useGooglePaywall from './Paywall/Google'

const ThemeContext = createContext()

export const DefaultProvider = ({ children }) => {
  const themeStore = useStore('theme')
  const authStore = useStore('auth')
  const peopleStore = useStore('people')

  const { colors, menus } = themeStore.getters
  const { isLogged } = authStore.getters
  const { currentCompany, defaultCompany } = peopleStore.getters

  const [translateReady, setTranslateReady] = useState(false)
  const [device, setDevice] = useState(
    JSON.parse(localStorage.getItem('device') || '{}'),
  )

  const { loading: paywallLoading, blocked, subscribe } =
    useGooglePaywall(isLogged)

  const fetchDeviceId = async () => {
    const uniqueId = await DeviceInfo.getUniqueId()
    if (!uniqueId) return

    const ld = {
      id: uniqueId,
      appVersion: await DeviceInfo.getVersion(),
    }

    setDevice(ld)
    localStorage.setItem('device', JSON.stringify(ld))
  }

  useEffect(() => {
    if (!device?.id) fetchDeviceId()
  }, [device])

  useEffect(() => {
    if (isLogged && currentCompany) {
      global.t = new Translate(
        defaultCompany,
        currentCompany,
        ['invoice', 'orders'],
        useStore('translate').actions,
      )
      t.discoveryAll().then(() => setTranslateReady(true))
    }
  }, [currentCompany, isLogged])

  if (isLogged && (!translateReady || paywallLoading)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text>Carregando...</Text>
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
            <Text>Assine para continuar</Text>
            <Pressable onPress={subscribe}>
              <Text>Assinar agora</Text>
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