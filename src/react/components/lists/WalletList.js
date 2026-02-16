import React, { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { useStore } from '@store';

const WalletSelect = ({ people_id }) => {
    const peopleStore = useStore('people');
      const { getters: peopleGetters } = peopleStore;
      const { currentCompany } = peopleGetters;
      
  const { getters: walletGetters, actions: walletActions } = useStore('wallet')

  useEffect(() => {
    if (people_id)
      walletActions.getItems({ people: people_id })
  }, [people_id])

    const wallets = walletGetters.items || [];

  const selectedValue = walletGetters.item ? walletGetters.item.id : null

  const handleChange = (value) => {

    const selected = wallets.find(s => s.id == value)
    if (selected) {
      walletActions.setItem(selected)
    }
    else {
      walletActions.setItem({});
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>wallet</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={selectedValue}
          onValueChange={handleChange}
        >
          <Picker.Item label="Selecione..." value={null} />
          {wallets.map(wallet => (
            <Picker.Item
              key={wallet.id}
              label={wallet.wallet}
              value={wallet.id}
              color={wallet.color}
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

export default WalletSelect