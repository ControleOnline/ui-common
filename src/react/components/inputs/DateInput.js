import React, { useState } from 'react'
import { View, Text, StyleSheet, TextInput } from 'react-native'
import { useStore } from '@store'

const DateInput = () => {
  const invoiceStore = useStore('invoice')
  const { actions: invoiceActions } = invoiceStore
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState('')

  const validateDate = (value) => {
    if (value.trim() === '') {
      setError('')
      return true
    }

    const ddmmyyyyRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/
    const yyyymmddRegex = /^(\d{4})-(\d{2})-(\d{2})$/

    let isValid = false
    let formattedDate = value

    if (ddmmyyyyRegex.test(value)) {
      const [, day, month, year] = value.match(ddmmyyyyRegex)
      if (day <= 31 && month <= 12) {
        formattedDate = `${year}-${month}-${day}`
        isValid = true
      }
    } else if (yyyymmddRegex.test(value)) {
      const [, year, month, day] = value.match(yyyymmddRegex)
      if (day <= 31 && month <= 12) {
        isValid = true
      }
    }

    if (isValid) {
      setError('')
    } else {
      setError('Use o formato DD/MM/YYYY ou YYYY-MM-DD')
    }

    return isValid
  }

  const handleTextChange = (value) => {
    setInputValue(value)

    if (value.trim() === '') {
      invoiceActions.setFilterDueDate(null)
      setError('')
    } else if (validateDate(value)) {
      invoiceActions.setFilterDueDate(value)
    }
  }

  const handleBlur = () => {
    // Executa a pesquisa ao sair do campo
    if (inputValue.trim() !== '' && !error) {
      invoiceActions.fetchInvoices() // ou o nome correto da action
    } else if (inputValue.trim() === '') {
      invoiceActions.fetchInvoices()
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {global.t?.t("invoice", "label", "dueDate")}
      </Text>

      <TextInput
        style={[styles.input, error && styles.inputError]}
        placeholder="DD/MM/YYYY"
        value={inputValue}
        onChangeText={handleTextChange}
        onBlur={handleBlur}
        placeholderTextColor="#999"
        keyboardType="number-pad"
      />

      {error && <Text style={styles.errorText}>{error}</Text>}
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
  inputError: {
    borderColor: '#ff4444',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 5,
  },
})

export default DateInput