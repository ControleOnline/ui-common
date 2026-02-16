import React, { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { useStore } from '@store';

const StatusSelect = ({ context = null }) => {
  const { getters: statusGetters, actions: statusActions } = useStore('status')

  useEffect(() => {
    statusActions.getItems({ context })
  }, [context])

  const statuses = (statusGetters.items || []).filter(
    item => item.context === context
  )

  const selectedValue = statusGetters.item ? statusGetters.item.id : null

  const handleChange = (value) => {

    const selected = statuses.find(s => s.id == value)
    if (selected) {
      statusActions.setItem(selected)
    }
    else {
      statusActions.setItem({});
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Status</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={selectedValue}
          onValueChange={handleChange}
        >
          <Picker.Item label="Selecione..." value={null} />
          {statuses.map(status => (
            <Picker.Item
              key={status.id}
              label={status.status}
              value={status.id}
              color={status.color}
            />
          ))}
        </Picker>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10
  },
  label: {
    fontSize: 16,
    marginBottom: 5
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6
  }
})

export default StatusSelect
