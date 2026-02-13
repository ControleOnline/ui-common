import {useEffect, useRef, useState} from 'react'
import {Platform} from 'react-native'
import * as RNIap from 'react-native-iap'
import DeviceInfo from 'react-native-device-info'

const SKU = 'PREMIUM'

export default function useGooglePaywall(isLogged) {
  const [loading, setLoading] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const started = useRef(false)
  const timeoutRef = useRef(null)

  const subscribe = async () => {
    try {
      await RNIap.requestSubscription({sku: SKU})
    } catch {}
  }

  useEffect(() => {
    const init = async () => {
      if (started.current) return
      started.current = true

      setBlocked(false)

      if (!isLogged || Platform.OS !== 'android') return

      const isEmulator = await DeviceInfo.isEmulator()
      if (isEmulator) return

      let hasGms = false
      try {
        hasGms = await DeviceInfo.hasGms()
      } catch {
        hasGms = false
      }

      if (!hasGms) return

      let installer = null
      try {
        installer = await DeviceInfo.getInstallerPackageName()
      } catch {}

      if (installer !== 'com.android.vending') return

      setLoading(true)

      const timeout = new Promise((_, reject) => {
        timeoutRef.current = setTimeout(
          () => reject(new Error('IAP_TIMEOUT')),
          8000,
        )
      })

      try {
        await Promise.race([
          (async () => {
            await RNIap.initConnection()
            await RNIap.flushFailedPurchasesCachedAsPendingAndroid()
          })(),
          timeout,
        ])

        setBlocked(false)
      } catch {
        setBlocked(false)
      } finally {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        setLoading(false)
      }
    }

    init()

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      RNIap.endConnection()
      started.current = false
    }
  }, [isLogged])

  return {
    loading,
    blocked,
    subscribe,
  }
}
