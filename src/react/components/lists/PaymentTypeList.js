import React, { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { useStore } from '@store';

const PaymentTypeList = ({ context = null }) => {
  const peopleStore = useStore('people');
  const { getters: peopleGetters } = peopleStore;
  const { currentCompany } = peopleGetters;

  const { getters: paymentTypeGetters, actions: paymentTypeActions } = useStore('paymentType')

  useEffect(() => {
    paymentTypeActions.getItems({ context: context, people: currentCompany?.id })
  }, [context, currentCompany])

  const paymentMethods = paymentTypeGetters.items || [];

  const selectedValue = paymentTypeGetters.item ? paymentTypeGetters.item.id : null

  const handleChange = (value) => {
    const selected = paymentMethods.find(s => s.id == value)
    if (selected) {
      paymentTypeActions.setItem(selected)
    }
    else {
      paymentTypeActions.setItem({});
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{global.t?.t("invoice", "label", "payment method")}</Text>

      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={selectedValue}
          onValueChange={handleChange}
        >
          <Picker.Item label={global.t?.t("invoice", "label", "select")} value={null} />
          {paymentMethods.map(method => (
            <Picker.Item
              key={method.id}
              label={method.paymentType} // TO DO // traduzir
              value={method.id}
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

export default PaymentTypeList