import React, { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { useStore } from '@store';

const ReceiverList = ({ context = null }) => {
  const peopleStore = useStore('people');
  const { getters: peopleGetters } = peopleStore;
  const { currentCompany } = peopleGetters;

  const { getters: receiverGetters, actions: receiverActions } = useStore('people')

  useEffect(() => {
    receiverActions.getItems({ context:context, people:currentCompany?.id  })
  }, [context, currentCompany])

  const receivers = receiverGetters.items || [];

  const selectedValue = receiverGetters.item ? receiverGetters.item.id : null

  const handleChange = (value) => {

    const selected = receivers.find(s => s.id == value)
    if (selected) {
      receiverActions.setItem(selected)
    }
    else {
      receiverActions.setItem({});
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{global.t?.t("invoice", "label", "receiver")}</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={selectedValue}
          onValueChange={handleChange}
        >
          <Picker.Item label={global.t?.t("invoice", "label", "select")} value={null} />
          {receivers.map(receiver => (
            <Picker.Item
              key={receiver.id}
              label={receiver.name}
              value={receiver.id}
              color={receiver.color}
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

export default ReceiverList