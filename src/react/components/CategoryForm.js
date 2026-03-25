import React, { useState, useEffect, useImperativeHandle, forwardRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useStore } from '@store';

/* ─── Paleta de cores predefinidas ─── */
const PRESET_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#22C55E',
  '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6',
  '#EC4899', '#F43F5E', '#64748B', '#0F172A', '#FFFFFF',
  '#FCA5A5', '#FED7AA', '#FEF08A', '#BBF7D0', '#A7F3D0',
  '#99F6E4', '#BAE6FD', '#BFDBFE', '#C7D2FE', '#DDD6FE',
  '#FBCFE8', '#FDA4AF', '#CBD5E1', '#475569', '#1E293B',
];

/* ─── Ícones curados para categorias ─── */
const CATEGORY_ICONS = [
  { name: 'food', label: 'Comida' },
  { name: 'food-variant', label: 'Prato' },
  { name: 'silverware-fork-knife', label: 'Talheres' },
  { name: 'pizza', label: 'Pizza' },
  { name: 'hamburger', label: 'Hambúrguer' },
  { name: 'noodles', label: 'Massa' },
  { name: 'rice', label: 'Arroz' },
  { name: 'bread-slice', label: 'Pão' },
  { name: 'fish', label: 'Peixe' },
  { name: 'egg-fried', label: 'Ovo' },
  { name: 'cheese', label: 'Queijo' },
  { name: 'sausage', label: 'Linguiça' },
  { name: 'corn', label: 'Milho' },
  { name: 'carrot', label: 'Cenoura' },
  { name: 'chili-mild', label: 'Tempero' },
  { name: 'shaker', label: 'Molho' },
  { name: 'leaf', label: 'Vegetal' },
  { name: 'sprout', label: 'Salada' },
  { name: 'mushroom', label: 'Cogumelo' },
  { name: 'fruit-watermelon', label: 'Fruta' },
  { name: 'fruit-cherries', label: 'Frutas' },
  { name: 'pot-steam', label: 'Panela' },
  { name: 'fire', label: 'Churrasco' },
  { name: 'grill', label: 'Grill' },
  { name: 'coffee', label: 'Café' },
  { name: 'tea', label: 'Chá' },
  { name: 'cup', label: 'Xícara' },
  { name: 'bottle-soda', label: 'Refrigerante' },
  { name: 'beer', label: 'Cerveja' },
  { name: 'glass-wine', label: 'Vinho' },
  { name: 'glass-cocktail', label: 'Drinque' },
  { name: 'water', label: 'Água' },
  { name: 'blender', label: 'Vitamina' },
  { name: 'ice-cream', label: 'Sorvete' },
  { name: 'candy', label: 'Doce' },
  { name: 'cake-variant', label: 'Bolo' },
  { name: 'cookie', label: 'Biscoito' },
  { name: 'cupcake', label: 'Cupcake' },
  { name: 'silverware-spoon', label: 'Sobremesa' },
  { name: 'nutrition', label: 'Nutrição' },
  { name: 'bottle-tonic', label: 'Suplemento' },
  { name: 'weight', label: 'Fitness' },
  { name: 'dumbbell', label: 'Academia' },
  { name: 'storefront-outline', label: 'Loja' },
  { name: 'shopping-outline', label: 'Compras' },
  { name: 'tag-outline', label: 'Promoção' },
  { name: 'star-outline', label: 'Destaque' },
  { name: 'heart-outline', label: 'Favorito' },
  { name: 'package-variant-closed', label: 'Pacote' },
  { name: 'bicycle', label: 'Delivery' },
  { name: 'motorbike', label: 'Moto' },
  { name: 'percent', label: 'Desconto' },
  { name: 'new-box', label: 'Novidade' },
  { name: 'flask-outline', label: 'Especial' },
  { name: 'spa-outline', label: 'Bem-estar' },
  { name: 'baby-bottle-outline', label: 'Bebê' },
  { name: 'bowl-mix', label: 'Tigela' },
  { name: 'french-fries', label: 'Batata' },
  { name: 'taco', label: 'Taco' },
  { name: 'food-apple', label: 'Maçã' },
  { name: 'weather-sunny', label: 'Dia' },
  { name: 'moon-waning-crescent', label: 'Noite' },
];

/* ─── Canais disponíveis ─── */
const CHANNELS = [
  { key: 'default', label: 'Balcão', icon: 'storefront-outline' },
  { key: 'totem', label: 'Totem', icon: 'monitor' },
  { key: 'delivery', label: 'Delivery', icon: 'bicycle' },
  { key: 'ifood', label: 'iFood', icon: 'food-fork-drink' },
  { key: '99food', label: '99Food', icon: 'food-variant' },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp' },
  { key: 'instagram', label: 'Instagram', icon: 'instagram' },
  { key: 'keeta', label: 'Keeta', icon: 'motorbike' },
  { key: 'messenger', label: 'Messenger', icon: 'facebook-messenger' },
];

/* ─── Modal genérico bottom-sheet ─── */
const BottomModal = ({ visible, onClose, title, children }) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <TouchableOpacity
      style={styles.modalOverlay}
      activeOpacity={1}
      onPress={onClose}
    />
    <View style={styles.modalSheet}>
      <View style={styles.modalHandle} />
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>{title}</Text>
        <TouchableOpacity onPress={onClose} style={styles.modalClose}>
          <MaterialCommunityIcons name="close" size={20} color="#64748B" />
        </TouchableOpacity>
      </View>
      {children}
    </View>
  </Modal>
);

/* ─── Seletor de cor ─── */
const ColorPicker = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [hexInput, setHexInput] = useState(value || '#000000');

  useEffect(() => { setHexInput(value || '#000000'); }, [value]);

  const applyHex = () => {
    const v = hexInput.startsWith('#') ? hexInput : `#${hexInput}`;
    if (/^#[0-9A-Fa-f]{6}$/.test(v)) {
      onChange(v);
      setOpen(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.colorButton}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <View style={[styles.colorSwatch, { backgroundColor: value || '#000000' }]} />
        <Text style={styles.colorButtonText}>{value || '#000000'}</Text>
        <MaterialCommunityIcons name="palette-outline" size={18} color="#94A3B8" />
      </TouchableOpacity>

      <BottomModal visible={open} onClose={() => setOpen(false)} title="Escolher cor">
        <ScrollView contentContainerStyle={styles.colorGrid} showsVerticalScrollIndicator={false}>
          {PRESET_COLORS.map(c => {
            const selected = (value || '').toLowerCase() === c.toLowerCase();
            return (
              <TouchableOpacity
                key={c}
                onPress={() => { onChange(c); setOpen(false); }}
                activeOpacity={0.75}
                style={styles.colorCell}
              >
                <View style={[
                  styles.colorCircle,
                  { backgroundColor: c },
                  c === '#FFFFFF' && styles.colorCircleWhite,
                  selected && styles.colorCircleSelected,
                ]}>
                  {selected && (
                    <MaterialCommunityIcons
                      name="check"
                      size={16}
                      color={c === '#FFFFFF' || c === '#FEF08A' || c === '#BBF7D0' || c === '#FED7AA' ? '#0F172A' : '#fff'}
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.hexInputRow}>
          <View style={[styles.colorSwatch, { backgroundColor: hexInput.startsWith('#') && hexInput.length >= 7 ? hexInput : '#ccc' }]} />
          <TextInput
            value={hexInput}
            onChangeText={setHexInput}
            style={styles.hexInput}
            placeholder="#000000"
            placeholderTextColor="#CBD5E1"
            maxLength={7}
            autoCapitalize="characters"
          />
          <TouchableOpacity style={styles.hexApplyBtn} onPress={applyHex} activeOpacity={0.8}>
            <Text style={styles.hexApplyText}>OK</Text>
          </TouchableOpacity>
        </View>
      </BottomModal>
    </>
  );
};

/* ─── Seletor de ícone ─── */
const IconPicker = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return CATEGORY_ICONS;
    return CATEGORY_ICONS.filter(
      ic => ic.name.includes(q) || ic.label.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        {value ? (
          <MaterialCommunityIcons name={value} size={22} color="#0F172A" />
        ) : (
          <MaterialCommunityIcons name="image-outline" size={22} color="#CBD5E1" />
        )}
        <Text style={[styles.iconButtonText, !value && { color: '#CBD5E1' }]}>
          {value || 'Selecionar ícone'}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={18} color="#94A3B8" />
      </TouchableOpacity>

      <BottomModal visible={open} onClose={() => { setOpen(false); setSearch(''); }} title="Selecionar ícone">
        <View style={styles.iconSearchWrap}>
          <MaterialCommunityIcons name="magnify" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Pesquisar..."
            placeholderTextColor="#CBD5E1"
            style={styles.iconSearchInput}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialCommunityIcons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Opção "Nenhum" */}
        <TouchableOpacity
          style={styles.iconNoneRow}
          onPress={() => { onChange(''); setOpen(false); setSearch(''); }}
          activeOpacity={0.7}
        >
          <View style={styles.iconNoneCircle}>
            <MaterialCommunityIcons name="close" size={16} color="#94A3B8" />
          </View>
          <Text style={styles.iconNoneText}>Nenhum ícone</Text>
          {!value && <MaterialCommunityIcons name="check-circle" size={18} color="#22C55E" />}
        </TouchableOpacity>

        <FlatList
          data={filtered}
          keyExtractor={item => item.name}
          numColumns={5}
          style={{ maxHeight: 340 }}
          contentContainerStyle={styles.iconGrid}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const selected = value === item.name;
            return (
              <TouchableOpacity
                style={[styles.iconCell, selected && styles.iconCellSelected]}
                onPress={() => { onChange(item.name); setOpen(false); setSearch(''); }}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={item.name}
                  size={24}
                  color={selected ? '#3B82F6' : '#334155'}
                />
                <Text style={[styles.iconCellLabel, selected && { color: '#3B82F6' }]} numberOfLines={1}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </BottomModal>
    </>
  );
};

/* ─── Seletor de categoria pai ─── */
const ParentCategoryPicker = ({ value, onChange, categories, currentId }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const available = useMemo(() => {
    const q = search.toLowerCase().trim();
    return (categories || []).filter(c => {
      if (String(c.id) === String(currentId)) return false;
      if (!q) return true;
      return String(c.name || '').toLowerCase().includes(q);
    });
  }, [categories, currentId, search]);

  const selected = (categories || []).find(c => String(c.id) === String(value));

  return (
    <>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        {selected?.color && (
          <View style={[styles.parentColorDot, { backgroundColor: selected.color }]} />
        )}
        <Text style={[styles.iconButtonText, !selected && { color: '#CBD5E1' }]}>
          {selected ? selected.name : 'Nenhuma'}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={18} color="#94A3B8" />
      </TouchableOpacity>

      <BottomModal visible={open} onClose={() => { setOpen(false); setSearch(''); }} title="Categoria pai">
        <View style={styles.iconSearchWrap}>
          <MaterialCommunityIcons name="magnify" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Pesquisar categoria..."
            placeholderTextColor="#CBD5E1"
            style={styles.iconSearchInput}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialCommunityIcons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Opção nenhuma */}
          <TouchableOpacity
            style={styles.parentRow}
            onPress={() => { onChange(null); setOpen(false); setSearch(''); }}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="close-circle-outline" size={18} color="#94A3B8" style={{ marginRight: 10 }} />
            <Text style={[styles.parentRowText, { color: '#94A3B8' }]}>Nenhuma</Text>
            {!value && <MaterialCommunityIcons name="check-circle" size={18} color="#22C55E" />}
          </TouchableOpacity>

          {available.map(cat => {
            const isSelected = String(cat.id) === String(value);
            return (
              <TouchableOpacity
                key={cat.id}
                style={styles.parentRow}
                onPress={() => { onChange(cat.id); setOpen(false); setSearch(''); }}
                activeOpacity={0.7}
              >
                <View style={[styles.parentColorDot, { backgroundColor: cat.color || '#CBD5E1', marginRight: 10 }]} />
                {!!cat.icon && (
                  <MaterialCommunityIcons name={cat.icon} size={16} color="#475569" style={{ marginRight: 6 }} />
                )}
                <Text style={[styles.parentRowText, isSelected && { color: '#3B82F6', fontWeight: '700' }]} numberOfLines={1}>
                  {cat.name}
                </Text>
                {isSelected && <MaterialCommunityIcons name="check-circle" size={18} color="#3B82F6" style={{ marginLeft: 'auto' }} />}
              </TouchableOpacity>
            );
          })}

          {available.length === 0 && (
            <View style={styles.parentEmpty}>
              <Text style={styles.parentEmptyText}>Nenhuma categoria encontrada</Text>
            </View>
          )}
        </ScrollView>
      </BottomModal>
    </>
  );
};

/* ─── Seletor de canais (multi-toggle) ─── */
const ChannelPicker = ({ value, onChange }) => {
  const selected = useMemo(() => {
    if (!value) return ['default'];
    return String(value).split(',').map(s => s.trim()).filter(Boolean);
  }, [value]);

  const toggle = key => {
    let next = selected.includes(key)
      ? selected.filter(k => k !== key)
      : [...selected, key];
    if (next.length === 0) next = ['default'];
    onChange(next.join(','));
  };

  return (
    <View style={styles.channelWrap}>
      {CHANNELS.map(ch => {
        const active = selected.includes(ch.key);
        return (
          <TouchableOpacity
            key={ch.key}
            style={[styles.channelChip, active && styles.channelChipActive]}
            onPress={() => toggle(ch.key)}
            activeOpacity={0.75}
          >
            <MaterialCommunityIcons
              name={ch.icon}
              size={14}
              color={active ? '#fff' : '#64748B'}
              style={{ marginRight: 5 }}
            />
            <Text style={[styles.channelChipText, active && styles.channelChipTextActive]}>
              {ch.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

/* ─── Formulário principal ─── */
const CategoryForm = forwardRef(({ category, onClose, onSaved }, ref) => {
  const categoriesStore = useStore('categories');
  const categoryActions = categoriesStore.actions;
  const categories = categoriesStore.getters.items;
  const peopleStore = useStore('people');
  const { currentCompany } = peopleStore.getters;

  const [name, setName] = useState('');
  const [color, setColor] = useState('#CBD5E1');
  const [icon, setIcon] = useState('');
  const [parent, setParent] = useState(null);
  const [sortOrder, setSortOrder] = useState('');
  const [channel, setChannel] = useState('default');

  const companyIri = currentCompany?.['@id']
    ? String(currentCompany['@id'])
    : currentCompany?.id
      ? `/people/${String(currentCompany.id).replace(/\D/g, '')}`
      : null;

  useEffect(() => {
    if (category) {
      setName(category.name || '');
      setColor(category.color || '#CBD5E1');
      setIcon(category.icon || '');
      setParent(category.parent?.id || null);
      setSortOrder(String(category?.extraData?.sortOrder || ''));
      setChannel(String(category?.extraData?.channel || 'default'));
    } else {
      setName('');
      setColor('#CBD5E1');
      setIcon('');
      setParent(null);
      setSortOrder('');
      setChannel('default');
    }
  }, [category]);

  const handleSubmit = async () => {
    const payload = {
      ...(category?.id ? { id: category.id } : {}),
      name,
      color,
      icon: icon || '',
      context: 'products',
      company: companyIri,
      parent: parent ? `/categories/${parent}` : null,
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
    <View style={styles.form}>

      {/* Nome */}
      <View style={styles.field}>
        <Text style={styles.label}>Nome</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholder="Ex: Entradas, Bebidas, Sobremesas..."
          placeholderTextColor="#CBD5E1"
        />
      </View>

      {/* Cor */}
      <View style={styles.field}>
        <Text style={styles.label}>Cor</Text>
        <ColorPicker value={color} onChange={setColor} />
      </View>

      {/* Ícone */}
      <View style={styles.field}>
        <Text style={styles.label}>Ícone</Text>
        <IconPicker value={icon} onChange={setIcon} />
      </View>

      {/* Categoria pai */}
      <View style={styles.field}>
        <Text style={styles.label}>Categoria pai</Text>
        <ParentCategoryPicker
          value={parent}
          onChange={setParent}
          categories={categories}
          currentId={category?.id}
        />
      </View>

      {/* Ordem */}
      <View style={styles.field}>
        <Text style={styles.label}>Ordem no cardápio</Text>
        <TextInput
          value={sortOrder}
          onChangeText={setSortOrder}
          keyboardType="numeric"
          style={styles.input}
          placeholder="0"
          placeholderTextColor="#CBD5E1"
        />
      </View>

      {/* Canais */}
      <View style={styles.field}>
        <Text style={styles.label}>Canais de venda</Text>
        <ChannelPicker value={channel} onChange={setChannel} />
      </View>

    </View>
  );
});

const styles = StyleSheet.create({
  form: {
    paddingBottom: 8,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 10,
    fontSize: 15,
    color: '#0F172A',
  },

  /* ── Color picker ── */
  colorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  colorButtonText: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    fontFamily: 'monospace',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 10,
    justifyContent: 'center',
  },
  colorCell: {
    padding: 2,
  },
  colorCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  colorCircleWhite: {
    borderColor: '#E2E8F0',
    borderWidth: 2,
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: '#3B82F6',
  },
  hexInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  hexInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
    fontFamily: 'monospace',
  },
  hexApplyBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  hexApplyText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  /* ── Icon picker ── */
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  iconButtonText: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
  },
  iconSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconSearchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    padding: 0,
  },
  iconNoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 4,
  },
  iconNoneCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconNoneText: {
    flex: 1,
    fontSize: 14,
    color: '#64748B',
  },
  iconGrid: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  iconCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 2,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    marginBottom: 6,
  },
  iconCellSelected: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  iconCellLabel: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },

  /* ── Parent category picker ── */
  parentColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  parentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  parentRowText: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
  },
  parentEmpty: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  parentEmptyText: {
    fontSize: 14,
    color: '#94A3B8',
  },

  /* ── Channel chips ── */
  channelWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  channelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  channelChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  channelChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  channelChipTextActive: {
    color: '#fff',
  },

  /* ── Modal ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 0,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CategoryForm;
