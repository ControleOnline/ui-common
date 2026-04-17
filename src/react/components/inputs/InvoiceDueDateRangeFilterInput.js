import React, { useEffect, useState } from 'react'
import { View, Text, TextInput } from 'react-native'
import { useStore } from '@store'
import { normalizeDateInputToYmd } from '@controleonline/ui-common/src/react/utils/dateRangeFilter'
import {
  resolveInvoiceInvalidDateFormatMessage,
  resolveInvoiceRangeEndPlaceholder,
  resolveInvoiceRangeLabel,
  resolveInvoiceRangeStartPlaceholder,
} from '@controleonline/ui-common/src/react/utils/invoiceDueDateMessages'
import styles from './InvoiceDueDateRangeFilterInput.styles'

const InvoiceDueDateRangeFilterInput = ({ onSearch }) => {
  const invoiceStore = useStore('invoice')
  const { actions: invoiceActions, getters: invoiceGetters } = invoiceStore
  const [startValue, setStartValue] = useState('')
  const [endValue, setEndValue] = useState('')
  const [startError, setStartError] = useState('')
  const [endError, setEndError] = useState('')

  useEffect(() => {
    const savedRange = invoiceGetters?.filters?.dueDate || {}
    setStartValue(savedRange?.start || '')
    setEndValue(savedRange?.end || '')
  }, [invoiceGetters?.filters?.dueDate?.start, invoiceGetters?.filters?.dueDate?.end])

  const normalizeDate = (value) => {
    if (!value || value.trim() === '') return null
    return normalizeDateInputToYmd(value)
  }

  const validateDate = (value, setError) => {
    if (value.trim() === '') {
      setError('')
      return true
    }
    if (normalizeDate(value)) {
      setError('')
      return true
    } else {
      setError(resolveInvoiceInvalidDateFormatMessage())
      return false
    }
  }

  const syncRangeToStore = (startRaw, endRaw) => {
    const start = normalizeDate(startRaw)
    const end = normalizeDate(endRaw)

    if (!start && !end) {
      invoiceActions.setFilterDueDate(null)
      return
    }

    invoiceActions.setFilterDueDate({ start, end })
  }

  const handleStartChange = (value) => {
    setStartValue(value)
    validateDate(value, setStartError)
    syncRangeToStore(value, endValue)
    if (value.trim() === '' || normalizeDate(value)) {
      if (typeof onSearch === 'function') onSearch()
    }
  }

  const handleEndChange = (value) => {
    setEndValue(value)
    validateDate(value, setEndError)
    syncRangeToStore(startValue, value)
    if (value.trim() === '' || normalizeDate(value)) {
      if (typeof onSearch === 'function') onSearch()
    }
  }

  const handleBlur = () => {
    if (!startError && !endError) {
      if (typeof onSearch === 'function') onSearch()
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {resolveInvoiceRangeLabel()}
      </Text>

      <View style={styles.row}>
        <TextInput
          style={[styles.input, startError && styles.inputError]}
          placeholder={resolveInvoiceRangeStartPlaceholder()}
          value={startValue}
          onChangeText={handleStartChange}
          onBlur={handleBlur}
          onSubmitEditing={handleBlur}
          placeholderTextColor="#999"
        />
        <TextInput
          style={[styles.input, endError && styles.inputError]}
          placeholder={resolveInvoiceRangeEndPlaceholder()}
          value={endValue}
          onChangeText={handleEndChange}
          onBlur={handleBlur}
          onSubmitEditing={handleBlur}
          placeholderTextColor="#999"
        />
      </View>

      {startError && <Text style={styles.errorText}>{startError}</Text>}
      {endError && <Text style={styles.errorText}>{endError}</Text>}
    </View>
  )
}

export default InvoiceDueDateRangeFilterInput
