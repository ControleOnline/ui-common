import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TextInput } from 'react-native'
import { useStore } from '@store'

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

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    marginHorizontal: 8,
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#fff',
  },
})

export default IdInput
