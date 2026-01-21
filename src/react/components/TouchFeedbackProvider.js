import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { Vibration, Platform } from 'react-native'
import Sound from 'react-native-sound'

const TouchFeedbackContext = createContext({
  soundEnabled: true,
  vibrationEnabled: true,
})

export function useTouchFeedback() {
  return useContext(TouchFeedbackContext)
}

/**
 * HOC que injeta feedback de toque
 */
function withFeedback(Component) {
  return function Wrapped(props) {
    const { soundEnabled, vibrationEnabled } = useTouchFeedback()
    const soundRef = useRef(null)

    useEffect(() => {
      if (soundEnabled) {
        Sound.setCategory('Ambient', true)

        soundRef.current = new Sound(
          require('../assets/tap.mp3'),
          error => {
            if (error) {
              console.warn('Erro ao carregar tap.mp3', error)
            }
          }
        )
      }

      return () => {
        if (soundRef.current) {
          soundRef.current.release()
          soundRef.current = null
        }
      }
    }, [soundEnabled])

    const handlePressIn = e => {
      if (vibrationEnabled && Platform.OS !== 'web') {
        Vibration.vibrate(10)
      }

      if (soundEnabled && soundRef.current) {
  console.log('Sound enabled:', soundEnabled)
  console.log('SoundRef current:', soundRef.current)
  soundRef.current.stop(() => {
    console.log('playing sound')
    soundRef.current.play()
  })
} else {
  console.log('Sound disabled or ref null:', { soundEnabled, soundRef: soundRef.current })
}

      props.onPressIn?.(e)
    }

    return <Component {...props} onPressIn={handlePressIn} />
  }
}

/**
 * Monkey patch global
 */
const RN = require('react-native')

if (!RN.__touchFeedbackPatched) {
  RN.TouchableOpacity = withFeedback(RN.TouchableOpacity)
  RN.Pressable = withFeedback(RN.Pressable)
  RN.__touchFeedbackPatched = true
}

/**
 * Provider
 */
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