import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Vibration, Platform, TouchableOpacity, Pressable } from 'react-native'
import { Audio } from 'expo-av'

const TouchFeedbackContext = createContext({
  soundEnabled: true,
  vibrationEnabled: true,
})

export function useTouchFeedback() {
  return useContext(TouchFeedbackContext)
}

function withFeedback(Component) {
  return function Wrapped(props) {
    const { soundEnabled, vibrationEnabled } = useTouchFeedback()
    const soundRef = useRef(null)

    useEffect(() => {
      let isMounted = true

      async function loadSound() {
        if (soundEnabled) {
          try {
            const { sound } = await Audio.Sound.createAsync(
              require('../assets/tap.mp3')
            )
            if (isMounted) soundRef.current = sound
          } catch (error) {
            console.warn('Erro ao carregar tap.mp3', error)
          }
        }
      }

      loadSound()

      return () => {
        isMounted = false
        if (soundRef.current) {
          soundRef.current.unloadAsync()
          soundRef.current = null
        }
      }
    }, [soundEnabled])

    const handlePressIn = async e => {
      if (vibrationEnabled && Platform.OS !== 'web') {
        Vibration.vibrate(10)
      }

      if (soundEnabled && soundRef.current) {
        try {
          await soundRef.current.stopAsync()
          await soundRef.current.playAsync()
        } catch (err) {
          console.warn('Erro ao tocar som', err)
        }
      }

      props.onPressIn?.(e)
    }

    return <Component {...props} onPressIn={handlePressIn} />
  }
}

if (!global.__touchFeedbackPatched) {
  global.TouchableOpacity = withFeedback(TouchableOpacity)
  global.Pressable = withFeedback(Pressable)
  global.__touchFeedbackPatched = true
}

export default function TouchFeedbackProvider({ children }) {
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [vibrationEnabled, setVibrationEnabled] = useState(true)

  useEffect(() => {
    try {
      const sound = localStorage.getItem('sound')
      if (sound !== null) setSoundEnabled(sound === 'true')

      const vibration = localStorage.getItem('vibration')
      if (vibration !== null) setVibrationEnabled(vibration === 'true')
    } catch {}
  }, [])

  return (
    <TouchFeedbackContext.Provider value={{ soundEnabled, vibrationEnabled }}>
      {children}
    </TouchFeedbackContext.Provider>
  )
}
