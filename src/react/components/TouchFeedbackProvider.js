import React, { createContext, useContext, useEffect, useState } from 'react'
import { Vibration, Platform } from 'react-native'

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

    const handlePressIn = e => {
      if (vibrationEnabled && Platform.OS !== 'web') {
        Vibration.vibrate(10)
      }

      if (soundEnabled) {
        console.log('[SOUND] clique')
      }

      props.onPressIn?.(e)
    }

    return <Component {...props} onPressIn={handlePressIn} />
  }
}

const RN = require('react-native')

if (!RN.__touchFeedbackPatched) {
  RN.TouchableOpacity = withFeedback(RN.TouchableOpacity)
  RN.Pressable = withFeedback(RN.Pressable)
  RN.__touchFeedbackPatched = true
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
    <TouchFeedbackContext.Provider
      value={{ soundEnabled, vibrationEnabled }}
    >
      {children}
    </TouchFeedbackContext.Provider>
  )
}
