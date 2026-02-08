import {useEffect, useRef, useState} from 'react'
import {Platform} from 'react-native'
import * as RNIap from 'react-native-iap'
import DeviceInfo from 'react-native-device-info'

export default function useGooglePaywall(isLogged) {
  const [loading, setLoading] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const started = useRef(false)

  const subscribe = async () => {}

  useEffect(() => {
    const init = async () => {
      if (started.current) return
      started.current = true

      console.log('[PAYWALL] start', {
        isLogged,
        platform: Platform.OS,
      })

      if (!isLogged || Platform.OS !== 'android') {
        console.log('[PAYWALL] bypass (not logged / not android)')
        setBlocked(false)
        return
      }

      const isEmulator = await DeviceInfo.isEmulator()

      console.log('[PAYWALL] emulator', isEmulator)

      if (isEmulator) {
        console.log('[PAYWALL] bypass (emulator)')
        setBlocked(false)
        return
      }

      let hasGms = false

      try {
        hasGms = await DeviceInfo.hasGms()
      } catch {
        hasGms = false
      }

      console.log('[PAYWALL] hasGms', hasGms)

      if (!hasGms) {
        console.log('[PAYWALL] bypass (no GMS)')
        setBlocked(false)
        return
      }

      try {
        setLoading(true)
        console.log('[PAYWALL] init billing')

        await RNIap.initConnection()
        await RNIap.flushFailedPurchasesCachedAsPendingAndroid()

        console.log('[PAYWALL] billing ok')
        setBlocked(false)
      } catch (e) {
        console.log(
          '[PAYWALL] billing failed → bypass',
          e?.message || e,
        )
        setBlocked(false)
      } finally {
        setLoading(false)
        console.log('[PAYWALL] finish')
      }
    }

    init()
  }, [isLogged])

  return {
    loading,
    blocked,
    subscribe,
  }
}
