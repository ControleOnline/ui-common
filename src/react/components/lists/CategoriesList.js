import React, { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { useStore } from '@store';

const CategorySelect = ({ context = null }) => {
  const peopleStore = useStore('people');
  const { getters: peopleGetters } = peopleStore;
  const { currentCompany } = peopleGetters;

  const { getters: categoryGetters, actions: categoryActions } = useStore('categories')

  useEffect(() => {
    categoryActions.getItems({ context:context, people:currentCompany?.id  })
  }, [context, currentCompany])

  const categories = categoryGetters.items || [];

  const selectedValue = categoryGetters.item ? categoryGetters.item.id : null

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
      <Text style={styles.label}>category</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={selectedValue}
          onValueChange={handleChange}
        >
          <Picker.Item label="Selecione..." value={null} />
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

export default CategorySelect