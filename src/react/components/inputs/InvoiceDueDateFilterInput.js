import React, { useState } from 'react'
import { View, Text, TextInput } from 'react-native'
import { useStore } from '@store'
import { normalizeDateInputToYmd } from '@controleonline/ui-common/src/react/utils/dateRangeFilter'
import styles from './InvoiceDueDateFilterInput.styles'

const InvoiceDueDateFilterInput = () => {
  const invoiceStore = useStore('invoice')
  const { actions: invoiceActions } = invoiceStore
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState('')

  const validateDate = (value) => {
    if (value.trim() === '') {
      setError('')
      return true
    }

    const normalizedDate = normalizeDateInputToYmd(value)

    if (normalizedDate) {
      setError('')
    } else {
      setError('Use o formato DD/MM/YYYY ou YYYY-MM-DD')
    }

    return Boolean(normalizedDate)
  }

  const handleTextChange = (value) => {
    setInputValue(value)

    if (value.trim() === '') {
      invoiceActions.setFilterDueDate(null)
      setError('')
    } else if (validateDate(value)) {
      invoiceActions.setFilterDueDate(normalizeDateInputToYmd(value))
    }
  }

  const handleBlur = () => {
    if (inputValue.trim() !== '' && !error) {
      invoiceActions.fetchInvoices()
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

export default InvoiceDueDateFilterInput
