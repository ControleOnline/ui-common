import React, { useEffect } from 'react'
import { View, Text } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { useStore } from '@store';
import styles from './SelectList.styles';

const WalletSelect = ({ people_id }) => {
  const { getters: walletGetters, actions: walletActions } = useStore('wallet')

  useEffect(() => {
    if (people_id)
      walletActions.getItems({ people: people_id })
  }, [people_id])

    const wallets = walletGetters.items || [];

  const selectedValue = walletGetters.item ? walletGetters.item.id : ''

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
      <Text style={styles.label}>{global.t?.t("invoice", "label", "wallet")}</Text>
      
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={selectedValue}
          onValueChange={handleChange}
        >
          <Picker.Item label={global.t?.t("invoice", "label", "select")} value={''} />
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

export default WalletSelect
