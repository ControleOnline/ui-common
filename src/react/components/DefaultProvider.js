import React, {createContext, useContext, useEffect, useState} from 'react'
import {View, ActivityIndicator, Text, Button, Platform} from 'react-native'
import DeviceInfo from 'react-native-device-info'
import * as RNIap from 'react-native-iap'
import Translate from '@controleonline/ui-common/src/utils/translate'
import {WebsocketListener} from '@controleonline/ui-common/src/react/components/WebsocketListener'
import PrintService from '@controleonline/ui-common/src/react/components/PrintService'
import {useStore} from '@store'

const ThemeContext = createContext()

const SUBSCRIPTIONS = Platform.select({
  android: ['premium_monthly'],
  ios: [],
})

export const DefaultProvider = ({children}) => {
  const themeStore = useStore('theme')
  const getters = themeStore.getters
  const actions = themeStore.actions

  const authStore = useStore('auth')
  const {isLogged} = authStore.getters

  const peopleStore = useStore('people')
  const {currentCompany, defaultCompany} = peopleStore.getters
  const peopleActions = peopleStore.actions

  const deviceStore = useStore('device')
  const deviceActions = deviceStore.actions

  const translateStore = useStore('translate')
  const translateActions = translateStore.actions

  const {colors, menus} = getters

  const [translateReady, setTranslateReady] = useState(false)
  const [device, setDevice] = useState(JSON.parse(localStorage.getItem('device') || '{}'))

  const [hasGms, setHasGms] = useState(true)
  const [iapReady, setIapReady] = useState(false)
  const [products, setProducts] = useState([])
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loadingSub, setLoadingSub] = useState(true)

  const fetchDeviceId = async () => {
    const id = await DeviceInfo.getUniqueId()
    if (!id) return

    const d = {
      id,
      deviceType: await DeviceInfo.getDeviceId(),
      systemName: await DeviceInfo.getSystemName(),
      systemVersion: await DeviceInfo.getSystemVersion(),
      manufacturer: await DeviceInfo.getManufacturer(),
      model: await DeviceInfo.getModel(),
      batteryLevel: await DeviceInfo.getBatteryLevel(),
      isEmulator: await DeviceInfo.isEmulator(),
      appVersion: await DeviceInfo.getVersion(),
      buildNumber: await DeviceInfo.getBuildNumber(),
    }

    setDevice(d)
    localStorage.setItem('device', JSON.stringify(d))
  }

  useEffect(() => {
    const checkGms = async () => {
      if (Platform.OS === 'android') {
        const gms = await DeviceInfo.hasGms()
        setHasGms(gms)
      }
    }
    checkGms()
  }, [])

  useEffect(() => {
    if (!device?.id) fetchDeviceId()
    else deviceActions.setItem(device)
  }, [device])

  useEffect(() => {
    if (device?.id) peopleActions.defaultCompany()
  }, [device])

  useEffect(() => {
    if (isLogged && currentCompany) {
      global.t = new Translate(defaultCompany, currentCompany, ['invoice', 'orders'], translateActions)
      t.discoveryAll().then(() => setTranslateReady(true))
    }
  }, [currentCompany, isLogged])

  useEffect(() => {
    const initIap = async () => {
      if (!hasGms || Platform.OS !== 'android') {
        setLoadingSub(false)
        return
      }

      try {
        await RNIap.initConnection()
        const subs = await RNIap.getSubscriptions({skus: SUBSCRIPTIONS})
        setProducts(subs)

        const purchases = await RNIap.getAvailablePurchases()
        const active = purchases.some(p => SUBSCRIPTIONS.includes(p.productId))

        setIsSubscribed(active)
        setIapReady(true)
      } catch (e) {
        setIapReady(false)
      } finally {
        setLoadingSub(false)
      }
    }

    if (isLogged) initIap()

    return () => {
      if (hasGms) RNIap.endConnection()
    }
  }, [isLogged, hasGms])

  if (!translateReady && isLogged) {
    return (
      <View style={{flex:1,justifyContent:'center',alignItems:'center'}}>
        <ActivityIndicator size="large" color="#1B5587" />
        <Text style={{marginTop:10}}>Carregando...</Text>
      </View>
    )
  }

  if (isLogged && hasGms && (loadingSub || !iapReady)) {
    return (
      <View style={{flex:1,justifyContent:'center',alignItems:'center'}}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (isLogged && hasGms && !isSubscribed) {
    return (
      <View style={{flex:1,justifyContent:'center',alignItems:'center',padding:24}}>
        <Text style={{fontSize:18,fontWeight:'600',marginBottom:12}}>
          Assinatura necessária
        </Text>
        <Text style={{textAlign:'center',marginBottom:20}}>
          Para continuar usando o aplicativo é necessário assinar o plano mensal.
        </Text>
        <Button title="Assinar agora" onPress={subscribe} />
      </View>
    )
  }

  return (
    device?.id && (
      <ThemeContext.Provider value={{colors, menus}}>
        {children}
        <WebsocketListener />
        <PrintService />
      </ThemeContext.Provider>
    )
  )
}

export const useTheme = () => useContext(ThemeContext)