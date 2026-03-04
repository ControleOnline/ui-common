import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Switch,
} from 'react-native';
import { useStore } from '@store';

const CategoryForm = ({ category, onClose, onSaved }) => {
    const categoriesStore = useStore('categories');
    const categoryActions = categoriesStore.actions;
    const categories = categoriesStore.getters.items;
    const peopleStore = useStore('people')
    const { currentCompany, isLoading } = peopleStore.getters

    const [name, setName] = useState('');
    const [color, setColor] = useState('#000000');
    const [icon, setIcon] = useState('');
    const [parent, setParent] = useState(null);
    const [active, setActive] = useState(true);
    const [sortOrder, setSortOrder] = useState('');
    const [channel, setChannel] = useState('');

    useEffect(() => {
        if (category) {
            setName(category.name || '');
            setColor(category.color || '#000000');
            setIcon(category.icon || '');
            setParent(category.parent?.id || null);
            setActive(category.active !== false);
            setSortOrder(String(category?.extraData?.sortOrder || ''));
            setChannel(String(category?.extraData?.channel || ''));
        }
    }, [category]);

    const handleSubmit = async () => {
        const payload = {
            ...(category?.id ? { id: category.id } : {}),
            name,
            color,
            icon,
            context: 'products',
            company: currentCompany.id,
            parent: parent ? `/categories/${parent}` : null,
            active,
            extraData: {
                ...(category?.extraData || {}),
                sortOrder: sortOrder ? parseInt(String(sortOrder).replace(/\D/g, ''), 10) || 0 : 0,
                channel: channel || 'default',
            },
        };

        const saved = await categoryActions.save(payload);

        await categoryActions.getItems({
            context: 'products',
            'order[name]': 'ASC',
            company: currentCompany.id,
        });

        if (onSaved) onSaved(saved);

        onClose();
    };

    return (
        <View>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>
                {category
                    ? global.t?.t('categoryForm', 'title', 'editCategory')
                    : global.t?.t('categoryForm', 'title', 'newCategory')}
            </Text>

            <Text>{global.t?.t('categoryForm', 'label', 'name')}</Text>
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

            <Text>{global.t?.t('categoryForm', 'label', 'colorHex') || 'Cor (hex)'}</Text>
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

            <Text>{global.t?.t('categoryForm', 'label', 'icon')}</Text>
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

            <Text>{global.t?.t('categoryForm', 'label', 'parentCategoryId') || 'Categoria Pai (ID)'}</Text>
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

            <Text>{global.t?.t('categoryForm', 'label', 'sortOrder') || 'Ordem'}</Text>
            <TextInput
                value={sortOrder}
                onChangeText={setSortOrder}
                keyboardType="numeric"
                style={{
                    borderWidth: 1,
                    borderColor: '#ccc',
                    padding: 10,
                    marginBottom: 15,
                    borderRadius: 6,
                }}
            />

            <Text>{global.t?.t('categoryForm', 'label', 'channel') || 'Canal'}</Text>
            <TextInput
                value={channel}
                onChangeText={setChannel}
                style={{
                    borderWidth: 1,
                    borderColor: '#ccc',
                    padding: 10,
                    marginBottom: 15,
                    borderRadius: 6,
                }}
                placeholder="default, iFood, delivery..."
            />

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ marginRight: 10 }}>{global.t?.t('categoryForm', 'label', 'active') || 'Ativo'}</Text>
                <Switch value={active} onValueChange={setActive} />
            </View>

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
                    {category
                        ? global.t?.t('categoryForm', 'button', 'saveChanges')
                        : global.t?.t('categoryForm', 'button', 'create')}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose}>
                <Text style={{ textAlign: 'center', color: 'red' }}>
                    {global.t?.t('categoryForm', 'button', 'cancel')}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

export default CategoryForm;
