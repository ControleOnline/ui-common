import React, { useEffect } from 'react'
import { View, Text } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { useStore } from '@store';
import styles from './SelectList.styles';

const ReceiverList = ({ context = null }) => {
  const peopleStore = useStore('people');
  const { getters: peopleGetters } = peopleStore;
  const { currentCompany } = peopleGetters;

  const { getters: receiverGetters, actions: receiverActions } = useStore('people')

  useEffect(() => {
    receiverActions.getItems({ context:context, people:currentCompany?.id  })
  }, [context, currentCompany])

  const receivers = receiverGetters.items || [];

  const selectedValue = receiverGetters.item ? receiverGetters.item.id : ''

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
          <Picker.Item label={global.t?.t("invoice", "label", "select")} value={''} />
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

export default ReceiverList
