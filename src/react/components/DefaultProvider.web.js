import React, { createContext, useContext } from 'react'
import { WebsocketListener } from '@controleonline/ui-common/src/react/components/WebsocketListener'
import PrintService from '@controleonline/ui-common/src/react/components/PrintService'
import { useStore } from '@store'

const ThemeContext = createContext()

export const DefaultProvider = ({ children }) => {
  const themeStore = useStore('theme')
  const { colors, menus } = themeStore.getters

  return (
    <ThemeContext.Provider value={{ colors, menus }}>
      {children}
      <WebsocketListener />
      <PrintService />
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
