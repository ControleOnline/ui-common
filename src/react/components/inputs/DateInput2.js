import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TextInput } from 'react-native'
import { useStore } from '@store'

const DateInput = () => {
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
  }, [])

  const normalizeDate = (value) => {
    if (!value || value.trim() === '') return null

    const ddmmyyyyRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/
    const yyyymmddRegex = /^(\d{4})-(\d{2})-(\d{2})$/

    if (ddmmyyyyRegex.test(value)) {
      const [, day, month, year] = value.match(ddmmyyyyRegex)
      if (Number(day) <= 31 && Number(month) <= 12) {
        return `${year}-${month}-${day}`
      }
      return null
    }

    if (yyyymmddRegex.test(value)) {
      const [, year, month, day] = value.match(yyyymmddRegex)
      if (Number(day) <= 31 && Number(month) <= 12) {
        return `${year}-${month}-${day}`
      }
    }

    return null
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
      setError('Use o formato DD/MM/YYYY ou YYYY-MM-DD')
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
      invoiceActions.fetchInvoices()
    }
  }

  const handleEndChange = (value) => {
    setEndValue(value)
    validateDate(value, setEndError)
    syncRangeToStore(startValue, value)
    if (value.trim() === '' || normalizeDate(value)) {
      invoiceActions.fetchInvoices()
    }
  }

  const handleBlur = () => {
    if (!startError && !endError) {
      invoiceActions.fetchInvoices()
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {global.t?.t("invoice", "label", "dueDate")} (início/fim)
      </Text>

      <View style={styles.row}>
        <TextInput
          style={[styles.input, startError && styles.inputError]}
          placeholder="Início: DD/MM/YYYY"
          value={startValue}
          onChangeText={handleStartChange}
          onBlur={handleBlur}
          onSubmitEditing={handleBlur}
          placeholderTextColor="#999"
        />
        <TextInput
          style={[styles.input, endError && styles.inputError]}
          placeholder="Fim: DD/MM/YYYY"
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
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
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