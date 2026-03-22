import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
    View,
    Text,
    TextInput,
    Switch,
    StyleSheet,
} from 'react-native';
import { useStore } from '@store';

const CategoryForm = forwardRef(({ category, onClose, onSaved }, ref) => {
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

    const companyIri = currentCompany?.['@id']
        ? String(currentCompany['@id'])
        : currentCompany?.id
            ? `/people/${String(currentCompany.id).replace(/\D/g, '')}`
            : null;

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
            company: companyIri,
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

    useImperativeHandle(ref, () => ({ submit: handleSubmit }));

    return (
        <View>
            <Text style={styles.label}>{global.t?.t('categories', 'label', 'name') || 'Nome'}</Text>
            <TextInput
                value={name}
                onChangeText={setName}
                style={styles.input}
            />

            <Text style={styles.label}>{global.t?.t('categories', 'label', 'colorHex') || 'Cor (hex)'}</Text>
            <TextInput
                value={color}
                onChangeText={setColor}
                style={styles.input}
            />

            <Text style={styles.label}>{global.t?.t('categories', 'label', 'icon') || 'Ícone'}</Text>
            <TextInput
                value={icon}
                onChangeText={setIcon}
                style={styles.input}
            />

            <Text style={styles.label}>{global.t?.t('categories', 'label', 'parentCategoryId') || 'Categoria Pai (ID)'}</Text>
            <TextInput
                value={parent ? String(parent) : ''}
                onChangeText={(value) => setParent(value)}
                keyboardType="numeric"
                style={styles.input}
            />

            <Text style={styles.label}>{global.t?.t('categories', 'label', 'sortOrder') || 'Ordem'}</Text>
            <TextInput
                value={sortOrder}
                onChangeText={setSortOrder}
                keyboardType="numeric"
                style={styles.input}
            />

            <Text style={styles.label}>{global.t?.t('categories', 'label', 'channel') || 'Canal'}</Text>
            <TextInput
                value={channel}
                onChangeText={setChannel}
                style={styles.input}
                placeholder="default, iFood, delivery..."
            />

            <View style={styles.switchRow}>
                <Text style={styles.label}>{global.t?.t('categories', 'label', 'active') || 'Ativo'}</Text>
                <Switch value={active} onValueChange={setActive} />
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
        padding: 12,
        marginBottom: 16,
        borderRadius: 10,
        fontSize: 15,
        color: '#0F172A',
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
});

export default CategoryForm;
