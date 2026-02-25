import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
} from 'react-native';
import { useStore } from '@store';

const CategoryForm = ({ category, onClose }) => {
    const categoriesStore = useStore('categories');
    const categoryActions = categoriesStore.actions;
    const categories = categoriesStore.getters.items;
    const peopleStore = useStore('people')
    const { currentCompany, isLoading } = peopleStore.getters

    const [name, setName] = useState('');
    const [color, setColor] = useState('#000000');
    const [icon, setIcon] = useState('');
    const [parent, setParent] = useState(null);

    useEffect(() => {
        if (category) {
            setName(category.name || '');
            setColor(category.color || '#000000');
            setIcon(category.icon || '');
            setParent(category.parent?.id || null);
        }
    }, [category]);

    const handleSubmit = async () => {
        const payload = {
            name,
            color,
            icon,
            context: 'products',
            company: currentCompany.id,
            parent: parent ? `/categories/${parent}` : null,
        };

        await categoryActions.save(payload);

        await categoryActions.getItems({
            context: 'products',
            'order[name]': 'ASC',
            company: currentCompany.id,
        });

        onClose();
    };

    return (
        <View>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>
                {category ? 'Editar Categoria' : 'Nova Categoria'}
            </Text>

            <Text>Nome</Text>
            <TextInput
                value={name}
                onChangeText={setName}
                style={{
                    borderWidth: 1,
                    borderColor: '#ccc',
                    padding: 10,
                    marginBottom: 15,
                    borderRadius: 6,
                }}
            />

            <Text>Cor (hex)</Text>
            <TextInput
                value={color}
                onChangeText={setColor}
                style={{
                    borderWidth: 1,
                    borderColor: '#ccc',
                    padding: 10,
                    marginBottom: 15,
                    borderRadius: 6,
                }}
            />

            <Text>Ícone</Text>
            <TextInput
                value={icon}
                onChangeText={setIcon}
                style={{
                    borderWidth: 1,
                    borderColor: '#ccc',
                    padding: 10,
                    marginBottom: 15,
                    borderRadius: 6,
                }}
            />

            <Text>Categoria Pai (ID)</Text>
            <TextInput
                value={parent ? String(parent) : ''}
                onChangeText={(value) => setParent(value)}
                keyboardType="numeric"
                style={{
                    borderWidth: 1,
                    borderColor: '#ccc',
                    padding: 10,
                    marginBottom: 20,
                    borderRadius: 6,
                }}
            />

            <TouchableOpacity
                onPress={handleSubmit}
                style={{
                    backgroundColor: '#000',
                    padding: 15,
                    borderRadius: 8,
                    alignItems: 'center',
                    marginBottom: 10,
                }}
            >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                    {category ? 'Salvar Alterações' : 'Criar'}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose}>
                <Text style={{ textAlign: 'center', color: 'red' }}>
                    Cancelar
                </Text>
            </TouchableOpacity>
        </View>
    );
};

export default CategoryForm;