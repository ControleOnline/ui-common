import React, { createContext, useContext, useEffect, useState } from 'react'
import { View, ActivityIndicator, Text } from 'react-native'
import Translate from '@controleonline/ui-common/src/utils/translate'
import { WebsocketListener } from '@controleonline/ui-common/src/react/components/WebsocketListener'
import PrintService from '@controleonline/ui-common/src/react/components/PrintService'
import { useStore } from '@store'

const ThemeContext = createContext()

const fetchIp = async () => {
  try {
    const res = await fetch('https://api.ipify.org?format=json')
    const json = await res.json()
    return json.ip
  } catch {
    return null
  }
}

export const DefaultProvider = ({ children }) => {
  const themeStore = useStore('theme')
  const authStore = useStore('auth')
  const peopleStore = useStore('people')
  const translateStore = useStore('translate')

  const { colors, menus } = themeStore.getters
  const { isLogged } = authStore.getters
  const { currentCompany, defaultCompany } = peopleStore.getters

  const [translateReady, setTranslateReady] = useState(false)
  const [device, setDevice] = useState(
    JSON.parse(localStorage.getItem('device') || '{}'),
  )

  useEffect(() => {
    if (!device?.id) {
      fetchIp().then(ip => {
        const fallback =   ip || `web-${Date.now()}`, appVersion: 'web' 
        setDevice(fallback)
        localStorage.setItem('device', JSON.stringify(fallback))
      })
    }
  }, [device])

  useEffect(() => {
    peopleStore.actions.myCompanies()
  }, [])

  useEffect(() => {
    if (isLogged && currentCompany) {
      global.t = new Translate(
        defaultCompany,
        currentCompany,
        ['invoice', 'orders'],
        translateStore.actions,
      )

      t.discoveryAll()
        .then(() => setTranslateReady(true))
        .catch(() => setTranslateReady(true))
    }
  }, [currentCompany, isLogged])

  if (isLogged && !translateReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text>Carregando...</Text>
      </View>
    )
  }

  if (!device?.id) return null

  return (
    <ThemeContext.Provider value={{ colors, menus }}>
      {children}
      <WebsocketListener />
      <PrintService />
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
