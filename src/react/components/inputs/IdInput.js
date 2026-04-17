import React, { useEffect, useState } from 'react'
import { View, Text, TextInput } from 'react-native'
import { useStore } from '@store'
import styles from './IdInput.styles'

const IdInput = ({ onSearch }) => {
  const invoiceStore = useStore('invoice')
  const { actions: invoiceActions, getters: invoiceGetters } = invoiceStore
  const [inputValue, setInputValue] = useState('')

  useEffect(() => {
    setInputValue(invoiceGetters?.filters?.id ? String(invoiceGetters.filters.id) : '')
  }, [invoiceGetters?.filters?.id])

  const handleTextChange = (value) => {
    setInputValue(value)
    invoiceActions.setFilterId(value)
  }

  const handleBlur = () => {
    if (typeof onSearch === 'function') onSearch()
  }

  const handleSubmit = () => {
    if (typeof onSearch === 'function') onSearch()
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {global.t?.t("invoice", "label", "id")}
      </Text>

      <TextInput
        style={styles.input}
        placeholder={global.t?.t("idInput", "label", "Insert id")}
        value={inputValue}
        onChangeText={handleTextChange}
        onBlur={handleBlur}
        onSubmitEditing={handleSubmit}
        placeholderTextColor="#999"
        keyboardType="number-pad"
        returnKeyType="search"
      />
    </View>
  )
}

export default IdInput
