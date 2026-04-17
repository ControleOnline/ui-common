import React, { useEffect } from 'react'
import { View, Text } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { useStore } from '@store';
import styles from './SelectList.styles';

const StatusSelect = ({ context = 'null' }) => {
  const { getters: statusGetters, actions: statusActions } = useStore('status')

  useEffect(() => {
    statusActions.getItems({ context })
  }, [context])

  const statuses = (statusGetters.items || []).filter(
    item => item.context === context
  )

  const selectedValue = statusGetters.item ? statusGetters.item.id : ''

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
      <Text style={styles.label}>{global.t?.t("invoice", "label", "status")}</Text>
      
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={selectedValue}
          onValueChange={handleChange}
        >
          <Picker.Item label={global.t?.t("invoice", "label", "select")} value={''} />
          {statuses.map(status => (
            <Picker.Item
              key={status.id}
              label={global.t?.t("invoice", "label", status.status)}
              value={status.id}
              color={status.color}
            />
          ))}
        </Picker>
      </View>
    </View>
  )
}

export default StatusSelect
