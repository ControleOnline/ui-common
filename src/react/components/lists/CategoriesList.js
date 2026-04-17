import React, { useEffect } from 'react'
import { View, Text } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { useStore } from '@store';
import styles from './SelectList.styles';

const CategorySelect = ({ context = null }) => {
  const peopleStore = useStore('people');
  const { getters: peopleGetters } = peopleStore;
  const { currentCompany } = peopleGetters;

  const { getters: categoryGetters, actions: categoryActions } = useStore('categories')

  useEffect(() => {
    categoryActions.getItems({ context:context, people:currentCompany?.id  })
  }, [context, currentCompany])

  const categories = categoryGetters.items || [];

  const selectedValue = categoryGetters.item ? categoryGetters.item.id : ''

  const handleChange = (value) => {

    const selected = categories.find(s => s.id == value)
    if (selected) {
      categoryActions.setItem(selected)
    }
    else {
      categoryActions.setItem({});
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{global.t?.t("invoice", "label", "category")}</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={selectedValue}
          onValueChange={handleChange}
        >
          <Picker.Item label={global.t?.t("invoice", "label", "select")} value={''} />
          {categories.map(category => (
            <Picker.Item
              key={category.id}
              label={category.name}
              value={category.id}
              color={category.color}
            />
          ))}
        </Picker>
      </View>
    </View>
  )
}

export default CategorySelect
